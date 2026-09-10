import { BookingStatus, VerificationStatus, BookingSource, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: BookingStatus | VerificationStatus | BookingSource | PaymentStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = (s: string) => {
    switch (s) {
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'PROCESSING':
        return 'badge-pending';
      case 'ACCEPTED':
      case 'VERIFIED':
      case 'PAID':
        return 'badge-accepted';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
      case 'REFUNDED':
        return 'badge-rejected';
      case 'IN_PROGRESS':
      case 'PARTIALLY_REFUNDED':
        return 'badge-in_progress';
      case 'COMPLETED':
        return 'badge-completed';
      case 'MANUAL':
        return 'badge-manual';
      case 'ONLINE':
        return 'badge-online';
      default:
        return 'badge-pending';
    }
  };

  return <span className={`badge ${getBadgeClass(status)}`}>{status.replace('_', ' ')}</span>;
};
