import { Request, Response, NextFunction } from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
import ProviderProfile from '../models/ProviderProfile';
import ClinicProfile from '../models/ClinicProfile';
import LabProfile from '../models/LabProfile';
import { BookingStatus } from '../constants/enums';

// Helper to generate 30-min or 60-min time slots between startTime and endTime
const generateTimeSlots = (startTimeStr: string, endTimeStr: string, intervalMinutes: number = 60) => {
  const slots: { startTime: string; endTime: string }[] = [];
  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);

  let currentMin = startH * 60 + startM;
  const endMinTotal = endH * 60 + endM;

  while (currentMin + intervalMinutes <= endMinTotal) {
    const sH = Math.floor(currentMin / 60).toString().padStart(2, '0');
    const sM = (currentMin % 60).toString().padStart(2, '0');
    const nextMin = currentMin + intervalMinutes;
    const eH = Math.floor(nextMin / 60).toString().padStart(2, '0');
    const eM = (nextMin % 60).toString().padStart(2, '0');

    slots.push({
      startTime: `${sH}:${sM}`,
      endTime: `${eH}:${eM}`,
    });

    currentMin = nextMin;
  }

  return slots;
};

export const getAvailableTimeSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providerId, clinicId, labId, date } = req.query; // date in YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required' });
    }

    const bookingDateStr = date as string;
    const [y, m, d] = bookingDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    let workingHoursObj = { available: true, startTime: '09:00', endTime: '18:00' };

    // Fetch entity schedule
    if (providerId) {
      const provider = await ProviderProfile.findOne({
        $or: [{ userId: providerId }, { _id: providerId }],
      }).populate('userId', 'isBlocked isActive');

      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider not found', availableSlots: [] });
      }

      const provUser = provider.userId as any;
      if (provUser && (provUser.isBlocked || !provUser.isActive)) {
        return res.status(404).json({ success: false, message: 'Provider is currently unavailable', availableSlots: [] });
      }

      if (provider.workingHours && provider.workingHours.length > 0) {
        const daySchedule = provider.workingHours.find((w) => w.day.toLowerCase() === dayName.toLowerCase());
        if (daySchedule) workingHoursObj = daySchedule;
      }
    } else if (clinicId) {
      const clinic = await ClinicProfile.findOne({
        $or: [{ userId: clinicId }, { _id: clinicId }],
      }).populate('userId', 'isBlocked isActive');

      if (!clinic) {
        return res.status(404).json({ success: false, message: 'Clinic not found', availableSlots: [] });
      }

      const clinicUser = clinic.userId as any;
      if (clinicUser && (clinicUser.isBlocked || !clinicUser.isActive)) {
        return res.status(404).json({ success: false, message: 'Clinic is currently unavailable', availableSlots: [] });
      }

      if (clinic.openingHours && clinic.openingHours.length > 0) {
        const daySchedule = clinic.openingHours.find((w) => w.day.toLowerCase() === dayName.toLowerCase());
        if (daySchedule) workingHoursObj = daySchedule;
      }
    } else if (labId) {
      const lab = await LabProfile.findOne({
        $or: [{ userId: labId }, { _id: labId }],
      }).populate('userId', 'isBlocked isActive');

      if (!lab) {
        return res.status(404).json({ success: false, message: 'Lab not found', availableSlots: [] });
      }

      const labUser = lab.userId as any;
      if (labUser && (labUser.isBlocked || !labUser.isActive)) {
        return res.status(404).json({ success: false, message: 'Lab is currently unavailable', availableSlots: [] });
      }

      if (lab.openingHours && lab.openingHours.length > 0) {
        const daySchedule = lab.openingHours.find((w) => w.day.toLowerCase() === dayName.toLowerCase());
        if (daySchedule) workingHoursObj = daySchedule;
      }
    }

    if (!workingHoursObj.available) {
      return res.json({
        success: true,
        date: bookingDateStr,
        dayName,
        availableSlots: [],
        message: 'Entity is closed on this day',
      });
    }

    const allSlots = generateTimeSlots(workingHoursObj.startTime, workingHoursObj.endTime, 60);

    // Find existing bookings on that date for that provider/clinic/lab
    const bookingFilter: any = {
      bookingDate: bookingDateStr,
      status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] },
    };

    if (providerId) bookingFilter.providerId = providerId;
    if (clinicId) bookingFilter.clinicId = clinicId;
    if (labId) bookingFilter.labId = labId;

    const existingBookings = await Booking.find(bookingFilter);
    const bookedTimeStrings = existingBookings.map((b) => b.timeSlot.startTime);

    const availableSlots = allSlots.filter((slot) => !bookedTimeStrings.includes(slot.startTime));

    return res.json({
      success: true,
      date: bookingDateStr,
      dayName,
      totalGeneratedSlots: allSlots.length,
      availableSlots,
    });
  } catch (error) {
    next(error);
  }
};
