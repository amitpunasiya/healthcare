import CancellationPolicy from '../models/CancellationPolicy';
import { UserRole } from '../constants/enums';

export interface ICancellationCalculation {
  eligibleForRefund: boolean;
  refundPercentage: number;
  refundAmount: number;
  cancellationFee: number;
  policyNotes: string;
}

export const calculateCancellationRefund = async (
  bookingDateStr: string,
  startTimeStr: string,
  totalPaidAmount: number,
  cancellingUserRole: UserRole
): Promise<ICancellationCalculation> => {
  // If cancelled by Provider, Clinic, Lab, or Admin -> 100% refund to customer
  if (
    cancellingUserRole === UserRole.PROVIDER ||
    cancellingUserRole === UserRole.CLINIC ||
    cancellingUserRole === UserRole.LAB ||
    cancellingUserRole === UserRole.ADMIN
  ) {
    return {
      eligibleForRefund: true,
      refundPercentage: 100,
      refundAmount: totalPaidAmount,
      cancellationFee: 0,
      policyNotes: '100% refund granted as booking was cancelled by healthcare provider/center/admin.',
    };
  }

  // Get active policy or fallback default
  const dbPolicy = await CancellationPolicy.findOne({ isDefault: true });
  const fullRefundHours = dbPolicy ? dbPolicy.fullRefundHoursBefore : 24;
  const partialRefundHours = dbPolicy ? dbPolicy.partialRefundHoursBefore : 12;
  const partialRefundPct = dbPolicy ? dbPolicy.partialRefundPercentage : 80;
  const lateCancellationPct = dbPolicy ? dbPolicy.lateCancellationPercentage : 50;

  const [hours, minutes] = (startTimeStr || '09:00').split(':').map(Number);
  const appointmentDate = new Date(`${bookingDateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);
  const now = new Date();

  const diffMs = appointmentDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let refundPct = 0;
  let policyNotes = '';

  if (diffHours >= fullRefundHours) {
    refundPct = 100;
    policyNotes = `Full 100% refund. Cancelled more than ${fullRefundHours} hours before appointment.`;
  } else if (diffHours >= partialRefundHours) {
    refundPct = partialRefundPct;
    policyNotes = `${partialRefundPct}% refund. Cancelled between ${partialRefundHours}h and ${fullRefundHours}h before appointment.`;
  } else if (diffHours > 0) {
    refundPct = lateCancellationPct;
    policyNotes = `Late cancellation: ${lateCancellationPct}% refund. Cancelled less than ${partialRefundHours} hours before appointment.`;
  } else {
    refundPct = 0;
    policyNotes = 'No refund. Cancellation requested after scheduled appointment time.';
  }

  const refundAmount = Math.round((totalPaidAmount * refundPct) / 100);
  const cancellationFee = totalPaidAmount - refundAmount;

  return {
    eligibleForRefund: refundAmount > 0,
    refundPercentage: refundPct,
    refundAmount,
    cancellationFee,
    policyNotes,
  };
};
