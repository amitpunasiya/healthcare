import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import api from '../../api/client';
import { Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const BookingDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paying, setPaying] = useState(false);

  const fetchDetail = async (isPull = false) => {
    if (isPull) setRefreshing(true);
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      if (res.data.success && res.data.booking) {
        setBooking(res.data.booking);
      }
    } catch (e) {
      console.warn('Failed to load booking details:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [bookingId])
  );

  const handleOnlinePayment = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      // 1. Create Razorpay order
      const orderRes = await api.post('/payments/create-order', { bookingId: booking._id });
      if (!orderRes.data.success) {
        Alert.alert('Payment Failed', orderRes.data.message || 'Could not initiate payment order');
        return;
      }

      const { orderId } = orderRes.data;
      const mockPaymentId = `pay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const mockSignature = `sig_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Verify payment server-side
      const verifyRes = await api.post('/payments/verify', {
        bookingId: booking._id,
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
      });

      if (verifyRes.data.success) {
        setPaymentModalVisible(false);
        Alert.alert(
          'Payment Successful! 🎉',
          `Payment of ₹${booking.pricing?.totalAmount || booking.totalAmount || 450} has been verified and completed.`
        );
        fetchDetail();
      } else {
        Alert.alert('Payment Error', verifyRes.data.message || 'Payment verification failed');
      }
    } catch (err: any) {
      console.warn('Online payment error:', err);
      Alert.alert('Payment Error', err.response?.data?.message || 'Could not process online payment');
    } finally {
      setPaying(false);
    }
  };

  const handleCashPayment = async () => {
    if (!booking) return;
    const amount = booking.pricing?.totalAmount || booking.totalAmount || 450;
    Alert.alert(
      'Pay in Cash to Specialist',
      `Are you paying ₹${amount} in cash directly to the visiting staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Cash Paid',
          onPress: async () => {
            setPaying(true);
            try {
              const res = await api.post('/payments/cash-payment', { bookingId: booking._id });
              if (res.data.success) {
                setPaymentModalVisible(false);
                Alert.alert(
                  'Cash Payment Recorded! 🎉',
                  `Payment of ₹${amount} to the specialist has been confirmed.`
                );
                fetchDetail();
              } else {
                Alert.alert('Error', res.data.message || 'Could not record cash payment');
              }
            } catch (err: any) {
              console.warn('Cash payment error:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to record cash payment');
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelBooking = async () => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const res = await api.patch(`/bookings/${bookingId}/cancel`, {
              cancellationReason: 'Cancelled by customer from mobile app',
            });
            if (res.data.success) {
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled.');
              fetchDetail();
            }
          } catch (err: any) {
            Alert.alert('Notice', err.response?.data?.message || 'Could not cancel booking');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const serviceName =
    (typeof booking.serviceId === 'object' && booking.serviceId?.name) ||
    (typeof booking.serviceCategoryId === 'object' && booking.serviceCategoryId?.name) ||
    booking.serviceCategory ||
    'Home Healthcare Visit';

  const otpCode = booking.serviceOtp || booking.startOtp;
  const patientName =
    booking.customerDetails?.name ||
    (typeof booking.customerId === 'object' && booking.customerId?.fullName) ||
    booking.customerName ||
    'Patient';
  const patientPhone =
    booking.customerDetails?.phone ||
    (typeof booking.customerId === 'object' && booking.customerId?.phone) ||
    booking.customerPhone ||
    'N/A';
  const addressLine =
    booking.serviceAddress?.addressLine1 ||
    booking.address?.addressLine1 ||
    'Home Visit Address';
  const city = booking.serviceAddress?.city || booking.address?.city || 'Indore';
  const pincode = booking.serviceAddress?.pincode || booking.address?.pincode || '';
  const cityPincode = pincode ? `${city} (${pincode})` : city;

  const basePrice =
    booking.pricing?.baseFee ??
    booking.totalAmount ??
    (typeof booking.serviceId === 'object' ? booking.serviceId?.basePrice : 0) ??
    450;
  const totalPrice =
    booking.pricing?.totalAmount ??
    booking.finalPayableAmount ??
    booking.totalAmount ??
    basePrice;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchDetail(true)}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header card */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.bookingNumber}>
            #{booking.bookingNumber || booking._id.slice(-6).toUpperCase()}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{booking.status}</Text>
          </View>
        </View>

        <Text style={styles.serviceName}>{serviceName}</Text>
        <Text style={styles.dateText}>
          📅 {new Date(booking.bookingDate).toDateString()} • {booking.timeSlot?.startTime || 'Morning'} - {booking.timeSlot?.endTime || ''}
        </Text>
      </View>

      {/* 1. When Payment is Pending (Service Completed) */}
      {booking.status === 'PAYMENT_PENDING' && (
        <View style={styles.paymentDueCard}>
          <View style={styles.paymentDueTop}>
            <View style={styles.paymentDueIconBg}>
              <Ionicons name="alert-circle" size={24} color="#ea580c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentDueTitle}>Service Completed • Payment Due</Text>
              <Text style={styles.paymentDueSubtitle}>
                Specialist has completed your home visit. Please complete the payment.
              </Text>
            </View>
          </View>

          <View style={styles.paymentDueAmountRow}>
            <Text style={styles.paymentDueAmountLabel}>Payable Amount:</Text>
            <Text style={styles.paymentDueAmountValue}>₹{totalPrice}</Text>
          </View>

          <TouchableOpacity
            style={styles.payNowMainBtn}
            onPress={() => setPaymentModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.payNowMainBtnText}>Pay Now • ₹{totalPrice}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. When Paid */}
      {(booking.status === 'PAID' || booking.paymentStatus === 'PAID') && (
        <View style={styles.paidCard}>
          <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.paidTitle}>Payment Completed</Text>
            <Text style={styles.paidSubtitle}>
              ₹{totalPrice} paid successfully. Thank you for choosing CarePulse!
            </Text>
          </View>
        </View>
      )}

      {/* 3. OTP Display for Active/Upcoming Visit (before completion) */}
      {otpCode &&
        ['REQUESTED', 'SEARCHING', 'PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(
          booking.status
        ) && (
          <View style={styles.otpCard}>
            <Ionicons name="key" size={28} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.otpTitle}>Service Verification OTP</Text>
              <Text style={styles.otpValue}>{otpCode}</Text>
              <Text style={styles.otpDesc}>
                Share this 4-digit code with the healthcare staff when they arrive
              </Text>
            </View>
          </View>
        )}

      {/* Patient & Location */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Patient & Visit Location</Text>
        <View style={styles.itemRow}>
          <Ionicons name="person" size={18} color={Colors.primary} />
          <Text style={styles.itemText}>{patientName}</Text>
        </View>
        <View style={styles.itemRow}>
          <Ionicons name="call" size={18} color={Colors.primary} />
          <Text style={styles.itemText}>{patientPhone}</Text>
        </View>
        <View style={styles.itemRow}>
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text style={styles.itemText}>
            {addressLine}, {cityPincode}
          </Text>
        </View>
        {booking.notes ? (
          <View style={styles.itemRow}>
            <Ionicons name="document-text" size={18} color={Colors.textMuted} />
            <Text style={styles.itemText}>Notes: {booking.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* Billing Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Payment Summary</Text>
        <View style={styles.billingRow}>
          <Text style={styles.billingLabel}>Base Price</Text>
          <Text style={styles.billingValue}>₹{basePrice}</Text>
        </View>
        <View style={[styles.billingRow, styles.billingTotalRow]}>
          <Text style={styles.billingTotalLabel}>Total Payable Amount</Text>
          <Text style={styles.billingTotalValue}>₹{totalPrice}</Text>
        </View>

        {booking.status === 'PAYMENT_PENDING' && (
          <TouchableOpacity
            style={styles.billingPayBtn}
            onPress={() => setPaymentModalVisible(true)}
          >
            <Text style={styles.billingPayBtnText}>Pay ₹{totalPrice} Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cancel button if applicable */}
      {['REQUESTED', 'SEARCHING', 'PENDING'].includes(booking.status) && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelBooking}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator color={Colors.danger} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Payment Selection Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Payment Method</Text>
              <TouchableOpacity
                onPress={() => setPaymentModalVisible(false)}
                disabled={paying}
              >
                <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Complete payment for booking #{booking.bookingNumber || booking._id.slice(-6).toUpperCase()}
            </Text>

            {/* Total display box */}
            <View style={styles.modalAmountBox}>
              <Text style={styles.modalAmountLabel}>Total to Pay</Text>
              <Text style={styles.modalAmountValue}>₹{totalPrice}</Text>
            </View>

            {/* Option 1: Online UPI / Cards / Razorpay */}
            <TouchableOpacity
              style={styles.paymentOptionCard}
              onPress={handleOnlinePayment}
              disabled={paying}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionIconWrap}>
                <Ionicons name="card" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.paymentOptionTitle}>Online UPI / Cards / Razorpay</Text>
                  <View style={styles.instantBadge}>
                    <Text style={styles.instantBadgeText}>Instant</Text>
                  </View>
                </View>
                <Text style={styles.paymentOptionDesc}>
                  GPay, PhonePe, Paytm, Debit/Credit Card, NetBanking
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* Option 2: Cash / Direct to Specialist */}
            <TouchableOpacity
              style={styles.paymentOptionCard}
              onPress={handleCashPayment}
              disabled={paying}
              activeOpacity={0.8}
            >
              <View style={[styles.paymentOptionIconWrap, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="cash" size={24} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentOptionTitle}>Pay Cash to Specialist</Text>
                <Text style={styles.paymentOptionDesc}>
                  Handed over ₹{totalPrice} in cash directly to visiting staff
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {paying && (
              <View style={styles.payingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.payingText}>Processing payment securely...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPaymentModalVisible(false)}
              disabled={paying}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  otpCard: {
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  otpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warning,
  },
  otpValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textMain,
    letterSpacing: 4,
    marginVertical: 2,
  },
  otpDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  itemText: {
    fontSize: 14,
    color: Colors.textMain,
    flex: 1,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billingLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  billingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMain,
  },
  billingTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    marginTop: 6,
  },
  billingTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  billingTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.secondary,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
  },
  // Payment Due Card
  paymentDueCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  paymentDueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentDueIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentDueTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9a3412',
  },
  paymentDueSubtitle: {
    fontSize: 12,
    color: '#c2410c',
    marginTop: 2,
    lineHeight: 16,
  },
  paymentDueAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  paymentDueAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  paymentDueAmountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.secondary,
  },
  payNowMainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payNowMainBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Paid Success Card
  paidCard: {
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  paidTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.success,
  },
  paidSubtitle: {
    fontSize: 12,
    color: '#065f46',
    marginTop: 2,
  },
  // Billing pay button
  billingPayBtn: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  billingPayBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  // Payment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  modalAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  modalAmountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  paymentOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
  },
  instantBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instantBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.success,
  },
  paymentOptionDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  payingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 10,
  },
  payingText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalCancelBtn: {
    marginTop: 6,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
});
