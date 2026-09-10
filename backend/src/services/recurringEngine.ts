import Booking, { IBooking, PlanStatus } from '../models/Booking';
import { BookingStatus, BookingSource } from '../constants/enums';
import mongoose from 'mongoose';

export interface GenerateSessionsInput {
  parentBooking: IBooking;
  durationWeeks?: number;
  maxSessionsToGenerate?: number;
}

export const generateRecurringSessions = async ({
  parentBooking,
  durationWeeks = 2,
  maxSessionsToGenerate = 14,
}: GenerateSessionsInput) => {
  if (!parentBooking.recurringConfig) {
    throw new Error('Parent booking missing recurring configuration');
  }

  const { frequency, startDate, preferredTimeSlot, daysOfWeek } = parentBooking.recurringConfig;
  const generatedSessions: IBooking[] = [];
  const skippedDates: string[] = [];

  const start = new Date(startDate);
  const totalDaysToScan = durationWeeks * 7;

  let current = new Date(start);
  let sessionIndex = 1;

  for (let d = 0; d < totalDaysToScan && generatedSessions.length < maxSessionsToGenerate; d++) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    let isTargetDay = false;
    if (frequency === 'DAILY') {
      isTargetDay = true;
    } else if (frequency === 'WEEKLY') {
      if (daysOfWeek && daysOfWeek.length > 0) {
        isTargetDay = daysOfWeek.includes(dayOfWeek);
      } else {
        // Default to same day of week as start date
        isTargetDay = dayOfWeek === start.getDay();
      }
    }

    if (isTargetDay) {
      // 1. Conflict Check: Search for existing bookings on this date & timeSlot for this entity
      const conflictFilter: any = {
        bookingDate: dateStr,
        'timeSlot.startTime': preferredTimeSlot.startTime,
        status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] },
      };

      if (parentBooking.providerId) conflictFilter.providerId = parentBooking.providerId;
      if (parentBooking.clinicId) conflictFilter.clinicId = parentBooking.clinicId;
      if (parentBooking.labId) conflictFilter.labId = parentBooking.labId;

      const existingConflict = await Booking.findOne(conflictFilter);

      if (existingConflict) {
        // Skip conflicting slot date
        skippedDates.push(dateStr);
      } else {
        // 2. Create Child Session Booking
        const sessionBooking = await Booking.create({
          bookingNumber: `${parentBooking.bookingNumber}-S${sessionIndex}`,
          bookingSource: parentBooking.bookingSource,
          createdById: parentBooking.createdById,
          customerId: parentBooking.customerId,
          customerDetails: parentBooking.customerDetails,
          providerId: parentBooking.providerId,
          clinicId: parentBooking.clinicId,
          labId: parentBooking.labId,
          serviceCategoryId: parentBooking.serviceCategoryId,
          serviceId: parentBooking.serviceId,
          serviceMode: parentBooking.serviceMode,
          engagementType: parentBooking.engagementType,
          isRecurringParent: false,
          parentBookingId: parentBooking._id,
          serviceAddress: parentBooking.serviceAddress,
          bookingDate: dateStr,
          timeSlot: preferredTimeSlot,
          pricing: parentBooking.pricing,
          // Manual session defaults to ACCEPTED; Online session defaults to PENDING
          status: parentBooking.bookingSource === BookingSource.MANUAL ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
          statusHistory: [
            {
              status: parentBooking.bookingSource === BookingSource.MANUAL ? BookingStatus.ACCEPTED : BookingStatus.PENDING,
              changedBy: parentBooking.createdById,
              timestamp: new Date(),
              notes: `Auto-generated recurring session #${sessionIndex} from plan #${parentBooking.bookingNumber}`,
            },
          ],
          notes: parentBooking.notes,
        });

        generatedSessions.push(sessionBooking);
        sessionIndex++;
      }
    }

    // Increment 1 day
    current.setDate(current.getDate() + 1);
  }

  return {
    parentBookingId: parentBooking._id,
    totalGenerated: generatedSessions.length,
    skippedConflictsCount: skippedDates.length,
    skippedDates,
    generatedSessions,
  };
};
