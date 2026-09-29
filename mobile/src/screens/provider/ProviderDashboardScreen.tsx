import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Linking,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import api from '../../api/client';
import { Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const ProviderDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>(
    user?.verificationStatus || 'PENDING_VERIFICATION'
  );
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Modals state
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Interactive Click Modals
  const [payDueModalVisible, setPayDueModalVisible] = useState(false);
  const [earningsModalVisible, setEarningsModalVisible] = useState(false);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<any | null>(null);
  const [customTxnRef, setCustomTxnRef] = useState('');

  const loadProviderData = async () => {
    try {
      const [bRes, aRes] = await Promise.all([
        api.get('/bookings/provider'),
        api.get('/bookings/provider/analytics?range=today'),
      ]);
      if (bRes.data.success) {
        setBookings(bRes.data.bookings || []);
        if (bRes.data.verificationStatus) {
          setVerificationStatus(bRes.data.verificationStatus);
        }
        if (bRes.data.rejectionReason) {
          setRejectionReason(bRes.data.rejectionReason);
        }
      }
      if (aRes.data.success) {
        setAnalytics(aRes.data);
      }
    } catch (err) {
      console.log('Failed to load provider data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.verificationStatus) {
      setVerificationStatus(user.verificationStatus);
    }
  }, [user?.verificationStatus]);

  useFocusEffect(
    useCallback(() => {
      loadProviderData();
    }, [])
  );

  useEffect(() => {
    loadProviderData();
    const interval = setInterval(loadProviderData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/bookings/${id}/accept`);
      if (res.data.success) {
        Alert.alert('Visit Accepted', 'You have accepted this home visit assignment.');
        loadProviderData();
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err.response?.data?.message || 'Could not accept booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this home visit request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await api.patch(`/bookings/${id}/reject`, {
              rejectionReason: 'Provider unavailable at requested time',
            });
            if (res.data.success) {
              // Immediately remove from list so it disappears instantly
              setBookings((prev) => prev.filter((b) => b._id !== id));
              loadProviderData();
            }
          } catch (err: any) {
            Alert.alert('Failed', err.response?.data?.message || 'Could not decline booking');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const openOtpModal = (id: string) => {
    setSelectedBookingId(id);
    setOtpCode('');
    setOtpModalVisible(true);
  };

  const handleVerifyOtpAndStart = async () => {
    if (!otpCode.trim() || otpCode.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit start OTP provided by patient.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.patch(`/bookings/${selectedBookingId}/start`, {
        otp: otpCode.trim(),
      });
      if (res.data.success) {
        Alert.alert('Visit Started! ⏱️', 'The session is now IN PROGRESS.');
        setOtpModalVisible(false);
        loadProviderData();
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.response?.data?.message || 'Invalid start OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    Alert.alert('Complete Visit', 'Confirm that the healthcare service was completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Complete',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await api.patch(`/bookings/${id}/complete`);
            if (res.data.success) {
              Alert.alert('Visit Completed! ✅', 'Earnings have been credited to your summary.');
              loadProviderData();
            }
          } catch (err: any) {
            Alert.alert('Failed', err.response?.data?.message || 'Could not complete visit');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const summary = analytics?.summary || analytics || {};
  const filtered = analytics?.filteredAnalytics || {};

  const todayNet =
    summary.todayEarnings ??
    filtered.totalEarnings ??
    analytics?.todayEarnings ??
    0;

  const completedCount =
    filtered.completedBookings ??
    summary.completedBookingsCount ??
    summary.completedCount ??
    analytics?.completedCount ??
    0;

  const platformDue =
    summary.totalPlatformAmountDue ??
    summary.platformAmountDue ??
    filtered.platformFeeDue ??
    analytics?.platformAmountDue ??
    0;

  const handlePayPlatformFee = () => {
    setPayDueModalVisible(true);
  };

  const handleConfirmPayDue = async () => {
    setActionLoading(true);
    try {
      const ref = customTxnRef.trim() || `UPI-CASH-${Date.now()}`;
      const res = await api.post('/settlements/pay-platform-fee', {
        txnReference: ref,
      });
      if (res.data.success) {
        Alert.alert('Payment Successful! 🎉', res.data.message || `₹${platformDue} platform due cleared.`);
        setPayDueModalVisible(false);
        setCustomTxnRef('');
        loadProviderData();
      } else {
        Alert.alert('Payment Error', res.data.message || 'Could not process platform fee payment.');
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err.response?.data?.message || 'Failed to pay platform fee.');
    } finally {
      setActionLoading(false);
    }
  };

  const isPending =
    verificationStatus === 'PENDING_VERIFICATION' ||
    user?.verificationStatus === 'PENDING_VERIFICATION';
  const isRejected =
    verificationStatus === 'REJECTED' || user?.verificationStatus === 'REJECTED';

  if (isPending) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Staff Duty Portal</Text>
            <Text style={styles.staffName}>{user?.fullName || 'Healthcare Staff'} 🇮🇳</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={async () => {
              setRefreshing(true);
              await refreshUser?.();
              await loadProviderData();
              setRefreshing(false);
            }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.pendingContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.pendingCard}>
            <View style={styles.pendingIconCircle}>
              <Ionicons name="hourglass-outline" size={44} color="#d97706" />
            </View>

            <View style={styles.pendingStatusPill}>
              <Ionicons name="time" size={13} color="#b45309" />
              <Text style={styles.pendingStatusPillText}>PENDING ADMIN APPROVAL</Text>
            </View>

            <Text style={styles.pendingTitle}>Account Under Verification</Text>
            <Text style={styles.pendingSubtitleHindi}>सत्यापन प्रक्रियाधीन है (प्रतीक्षा करें)</Text>

            <Text style={styles.pendingDesc}>
              नमस्ते <Text style={{ fontWeight: '800', color: Colors.textMain }}>{user?.fullName || 'Staff'}</Text>, आपके प्रोफ़ाइल और दस्तावेज़ (Aadhaar, PAN, Degree) CarePulse Admin टीम को समीक्षा के लिए प्राप्त हो गए हैं।
            </Text>

            <View style={styles.pendingTimelineBox}>
              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineItemTitle}>Profile & Credentials Submitted</Text>
                  <Text style={styles.timelineItemDesc}>Contact details, category & qualifications</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineItemTitle}>Documents Uploaded</Text>
                  <Text style={styles.timelineItemDesc}>Verification files received by Admin</Text>
                </View>
              </View>

              <View style={styles.timelineLine} />

              <View style={styles.timelineItem}>
                <Ionicons name="time" size={20} color="#d97706" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timelineItemTitle, { color: '#b45309' }]}>Admin Review (In Progress)</Text>
                  <Text style={styles.timelineItemDesc}>Approval usually completed within 24 hours</Text>
                </View>
              </View>
            </View>

            <View style={styles.pendingNoticeCard}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
              <Text style={styles.pendingNoticeText}>
                एडमिन द्वारा प्रोफ़ाइल सत्यापन (VERIFIED) होने के बाद यह ड्यूटी पोर्टल सक्रिय हो जाएगा और आप विज़िट स्वीकार कर सकेंगे।
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkStatusBtn}
              onPress={async () => {
                setActionLoading(true);
                await refreshUser?.();
                await loadProviderData();
                setActionLoading(false);
                if (user?.verificationStatus === 'VERIFIED') {
                  Alert.alert('Congratulations! 🎉', 'Your account has been VERIFIED by Admin! Duty portal is now active.');
                } else {
                  Alert.alert('Verification in Progress ⏳', 'Your profile is currently under review by our Admin team.');
                }
              }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="sync" size={18} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>Check Approval Status</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactSupportBtn}
              onPress={() => Linking.openURL('tel:8120966578')}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={16} color={Colors.primary} />
              <Text style={styles.contactSupportText}>Contact Admin Support (8120966578)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (isRejected) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Staff Duty Portal</Text>
            <Text style={styles.staffName}>{user?.fullName || 'Healthcare Staff'} 🇮🇳</Text>
          </View>
        </View>

        <View style={[styles.pendingContainer, { justifyContent: 'center' }]}>
          <View style={[styles.pendingCard, { borderColor: '#fca5a5' }]}>
            <View style={[styles.pendingIconCircle, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="close-circle" size={48} color={Colors.danger} />
            </View>

            <Text style={[styles.pendingTitle, { color: Colors.danger }]}>Application Rejected</Text>
            <Text style={styles.pendingSubtitleHindi}>सत्यापन अस्वीकृत किया गया</Text>

            <Text style={styles.pendingDesc}>
              {rejectionReason || user?.rejectionReason || 'Your uploaded documents or credentials did not meet verification criteria.'}
            </Text>

            <TouchableOpacity
              style={[styles.checkStatusBtn, { backgroundColor: Colors.danger }]}
              onPress={() => Linking.openURL('tel:8120966578')}
            >
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.btnTextWhite}>Contact Admin Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Staff Duty Portal</Text>
          <Text style={styles.staffName}>{user?.fullName || 'Healthcare Staff'} 🇮🇳</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => {
            setRefreshing(true);
            loadProviderData();
          }}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Analytics Summary - Clickable Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() => setEarningsModalVisible(true)}
        >
          <Text style={styles.statLabel}>Today's Net</Text>
          <Text style={styles.statValue}>₹{todayNet}</Text>
          <Text style={styles.statCardHint}>Tap details ›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              'Completed Visits',
              `You have successfully completed ${completedCount} visit(s) today.`
            )
          }
        >
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statCardHint}>Total today ›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, platformDue > 0 && styles.statCardDue]}
          activeOpacity={0.7}
          onPress={() => setPayDueModalVisible(true)}
        >
          <Text style={styles.statLabel}>Platform Due</Text>
          <Text
            style={[
              styles.statValue,
              { color: platformDue > 0 ? Colors.danger : Colors.success },
            ]}
          >
            ₹{platformDue}
          </Text>
          <Text style={[styles.statCardHint, platformDue > 0 && styles.statCardHintDue]}>
            {platformDue > 0 ? 'Pay now ›' : 'All clear ✓'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Platform Due Action Banner */}
      {platformDue > 0 && (
        <TouchableOpacity
          style={styles.dueAlertCard}
          activeOpacity={0.8}
          onPress={() => setPayDueModalVisible(true)}
        >
          <View style={styles.dueAlertIconBox}>
            <Ionicons name="cash-outline" size={22} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dueAlertTitle}>Platform Due: ₹{platformDue}</Text>
            <Text style={styles.dueAlertSubtitle}>
              Cash collected from patient. Tap to pay 20% platform commission.
            </Text>
          </View>
          <View style={styles.payPlatformBtn}>
            <Text style={styles.payPlatformBtnText}>Pay Due</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionHeader}>Assigned Patient Requests</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadProviderData();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                No pending home visit requests assigned to you right now.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAssigned = item.status === 'SEARCHING' || item.status === 'REQUESTED';
            const isAccepted = item.status === 'ACCEPTED';
            const isInProgress = item.status === 'IN_PROGRESS';

            const patientName =
              (typeof item.customerId === 'object' && item.customerId?.fullName) ||
              item.customerDetails?.name ||
              item.customerName ||
              'Patient Visit';
            const patientPhone =
              (typeof item.customerId === 'object' && item.customerId?.phone) ||
              item.customerDetails?.phone ||
              item.customerPhone ||
              'N/A';
            const serviceTitle =
              (typeof item.serviceId === 'object' && item.serviceId?.name) ||
              (typeof item.serviceCategoryId === 'object' && item.serviceCategoryId?.name) ||
              item.serviceCategory ||
              'Home Healthcare Visit';
            const addressLine =
              item.serviceAddress?.addressLine1 ||
              item.address?.addressLine1 ||
              'Home Visit Location';
            const city = item.serviceAddress?.city || item.address?.city || 'Indore';
            const pincode = item.serviceAddress?.pincode || item.address?.pincode || '';
            const fullAddress = pincode ? `${addressLine}, ${city} (${pincode})` : `${addressLine}, ${city}`;
            const isCash = item.paymentMethod === 'CASH' || item.paymentMethod === 'CASH_OFFLINE';
            const grossAmount = item.pricing?.totalAmount ?? item.totalAmount ?? 450;
            const netEarning = item.netEarning ?? (isCash ? Math.round(grossAmount * 0.8) : grossAmount);
            const platformFee = item.platformPayableAmount ?? item.platformFee ?? Math.round(grossAmount * 0.2);
            const platformStatus = item.platformSettlementStatus;

            return (
              <TouchableOpacity
                style={styles.bookingCard}
                activeOpacity={0.9}
                onPress={() => setSelectedDetailBooking(item)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.bookingNo}>
                    #{item.bookingNumber || item._id.slice(-6).toUpperCase()}
                  </Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{item.status}</Text>
                  </View>
                </View>

                {/* Service Title */}
                <Text style={styles.serviceTitle}>{serviceTitle}</Text>

                {/* Patient Information */}
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={14} color={Colors.primary} />
                  <Text style={styles.patientNameText}>
                    {patientName} {patientPhone !== 'N/A' ? `• ${patientPhone}` : ''}
                  </Text>
                </View>

                {/* Address & Location */}
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={14} color={Colors.primary} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {fullAddress}
                  </Text>
                </View>

                {/* Booking Date and Slot */}
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.infoText}>
                    {new Date(item.bookingDate).toDateString()} • {item.timeSlot?.startTime || 'Day'} {item.timeSlot?.endTime ? `- ${item.timeSlot.endTime}` : ''}
                  </Text>
                </View>

                {/* Notes if any */}
                {item.notes ? (
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.infoText}>Notes: {item.notes}</Text>
                  </View>
                ) : null}

                {/* Order Amount & Payment Status */}
                <View style={styles.earningRow}>
                  <Text style={styles.cardPayable}>
                    Order Amount: <Text style={{ color: Colors.primary, fontWeight: '800' }}>₹{grossAmount}</Text>
                  </Text>
                  {isCash && (
                    <View
                      style={[
                        styles.cashBadge,
                        { backgroundColor: platformStatus === 'PAID' ? Colors.successLight : '#fee2e2' },
                      ]}
                    >
                      <Ionicons
                        name={platformStatus === 'PAID' ? 'checkmark-circle' : 'cash-outline'}
                        size={12}
                        color={platformStatus === 'PAID' ? Colors.success : Colors.danger}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: platformStatus === 'PAID' ? Colors.success : Colors.danger,
                        }}
                      >
                        {platformStatus === 'PAID' ? 'Cash Paid (Fee Cleared)' : `Cash Paid (Due: ₹${platformFee})`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tap to view details hint */}
                <Text style={styles.tapCardHint}>Tap for visit details & map ›</Text>

                {/* Actions */}
                <View style={styles.actionRow}>
                  {isAssigned && (
                    <>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(item._id)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.btnTextWhite}>Accept Visit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleReject(item._id)}
                        disabled={actionLoading}
                      >
                        <Text style={styles.rejectBtnText}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {isAccepted && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => openOtpModal(item._id)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="key-outline" size={16} color="#ffffff" />
                      <Text style={styles.btnTextWhite}>Verify OTP & Start Visit</Text>
                    </TouchableOpacity>
                  )}

                  {isInProgress && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleComplete(item._id)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.btnTextWhite}>Complete Service</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Start OTP</Text>
            <Text style={styles.modalDesc}>
              Ask the patient for the 6-digit OTP displayed on their screen to start the service.
            </Text>

            <TextInput
              style={styles.otpInput}
              placeholder="123456"
              placeholderTextColor={Colors.textLight}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleVerifyOtpAndStart}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.btnTextWhite}>Verify & Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Platform Due Modal */}
      <Modal visible={payDueModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.dueBadgeIcon}>
                <Ionicons name="wallet-outline" size={24} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Clear Platform Due</Text>
                <Text style={styles.modalSubtitle}>Pay 20% platform share for cash collected</Text>
              </View>
              <TouchableOpacity onPress={() => setPayDueModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.dueAmountBox}>
              <Text style={styles.dueAmountLabel}>Total Platform Fee Due</Text>
              <Text style={styles.dueAmountValue}>₹{platformDue}</Text>
            </View>

            <View style={styles.upiInfoCard}>
              <Text style={styles.upiInfoTitle}>Payment Instructions:</Text>
              <Text style={styles.upiInfoDesc}>
                1. Transfer ₹{platformDue} via UPI to <Text style={{ fontWeight: '800', color: Colors.primary }}>healthcare.pay@upi</Text>
              </Text>
              <Text style={styles.upiInfoDesc}>
                2. Enter your UPI transaction reference below and confirm.
              </Text>
            </View>

            <Text style={styles.inputLabel}>UPI / Bank Ref No. (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`UPI-CASH-${Date.now().toString().slice(-6)}`}
              placeholderTextColor={Colors.textLight}
              value={customTxnRef}
              onChangeText={setCustomTxnRef}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPayDueModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: Colors.danger }]}
                onPress={handleConfirmPayDue}
                disabled={actionLoading || platformDue <= 0}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.btnTextWhite}>Confirm & Pay ₹{platformDue}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Today's Net Earnings Modal */}
      <Modal visible={earningsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.dueBadgeIcon, { backgroundColor: Colors.secondaryLight }]}>
                <Ionicons name="trending-up-outline" size={24} color={Colors.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Today's Net Summary</Text>
                <Text style={styles.modalSubtitle}>Breakdown of completed visits</Text>
              </View>
              <TouchableOpacity onPress={() => setEarningsModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.breakdownTable}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Completed Visits</Text>
                <Text style={styles.breakdownValBold}>{completedCount}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Gross Bookings Value</Text>
                <Text style={styles.breakdownVal}>₹{todayNet + platformDue}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: Colors.danger }]}>Platform Commission (20%)</Text>
                <Text style={[styles.breakdownVal, { color: Colors.danger }]}>- ₹{platformDue}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                <Text style={styles.breakdownTotalLabel}>Your Net Earning</Text>
                <Text style={styles.breakdownTotalVal}>₹{todayNet}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { width: '100%', marginTop: 16 }]}
              onPress={() => setEarningsModalVisible(false)}
            >
              <Text style={styles.btnTextWhite}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Booking Details Modal */}
      <Modal visible={!!selectedDetailBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '88%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDetailBooking && (
                <>
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.bookingNo}>
                        #{selectedDetailBooking.bookingNumber || selectedDetailBooking._id?.slice(-6)?.toUpperCase()}
                      </Text>
                      <Text style={styles.modalTitle}>
                        {(typeof selectedDetailBooking.serviceId === 'object' && selectedDetailBooking.serviceId?.name) ||
                          (typeof selectedDetailBooking.serviceCategoryId === 'object' && selectedDetailBooking.serviceCategoryId?.name) ||
                          selectedDetailBooking.serviceCategory ||
                          'Home Healthcare Visit'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedDetailBooking(null)}>
                      <Ionicons name="close-circle" size={26} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Patient Info with Call button */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Patient Information</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="person-outline" size={16} color={Colors.primary} />
                      <Text style={styles.detailTextBold}>
                        {(typeof selectedDetailBooking.customerId === 'object' && selectedDetailBooking.customerId?.fullName) ||
                          selectedDetailBooking.customerDetails?.name ||
                          selectedDetailBooking.customerName ||
                          'Patient'}
                      </Text>
                    </View>
                    {((typeof selectedDetailBooking.customerId === 'object' && selectedDetailBooking.customerId?.phone) ||
                      selectedDetailBooking.customerDetails?.phone ||
                      selectedDetailBooking.customerPhone) && (
                      <TouchableOpacity
                        style={styles.callPatientBtn}
                        onPress={() => {
                          const ph =
                            (typeof selectedDetailBooking.customerId === 'object' && selectedDetailBooking.customerId?.phone) ||
                            selectedDetailBooking.customerDetails?.phone ||
                            selectedDetailBooking.customerPhone;
                          if (ph) Linking.openURL(`tel:${ph}`);
                        }}
                      >
                        <Ionicons name="call" size={15} color="#ffffff" />
                        <Text style={styles.btnTextWhite}>
                          Call {(typeof selectedDetailBooking.customerId === 'object' && selectedDetailBooking.customerId?.phone) ||
                            selectedDetailBooking.customerDetails?.phone ||
                            selectedDetailBooking.customerPhone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Address with Map button */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Visit Address</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color={Colors.primary} />
                      <Text style={styles.detailText}>
                        {selectedDetailBooking.serviceAddress?.addressLine1 || selectedDetailBooking.address?.addressLine1 || 'Indore'},{' '}
                        {selectedDetailBooking.serviceAddress?.city || selectedDetailBooking.address?.city || 'Indore'}
                        {selectedDetailBooking.serviceAddress?.pincode || selectedDetailBooking.address?.pincode ? ` (${selectedDetailBooking.serviceAddress?.pincode || selectedDetailBooking.address?.pincode})` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.mapBtn}
                      onPress={() => {
                        const addr = `${selectedDetailBooking.serviceAddress?.addressLine1 || selectedDetailBooking.address?.addressLine1 || ''} ${selectedDetailBooking.serviceAddress?.city || selectedDetailBooking.address?.city || ''}`;
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
                      }}
                    >
                      <Ionicons name="navigate-outline" size={15} color={Colors.primary} />
                      <Text style={styles.mapBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Schedule */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Schedule Time</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                      <Text style={styles.detailText}>
                        {new Date(selectedDetailBooking.bookingDate).toDateString()} • {selectedDetailBooking.timeSlot?.startTime || 'Day'} {selectedDetailBooking.timeSlot?.endTime ? `- ${selectedDetailBooking.timeSlot.endTime}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Notes if any */}
                  {selectedDetailBooking.notes ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Patient Notes</Text>
                      <Text style={styles.detailNotesText}>{selectedDetailBooking.notes}</Text>
                    </View>
                  ) : null}

                  {/* Payment Breakdown */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Payment & Commission</Text>
                    <View style={styles.breakdownTable}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Total Fee</Text>
                        <Text style={styles.breakdownValBold}>
                          ₹{selectedDetailBooking.pricing?.totalAmount ?? selectedDetailBooking.totalAmount ?? 450}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Payment Method</Text>
                        <Text style={styles.breakdownValBold}>
                          {selectedDetailBooking.paymentMethod === 'CASH' || selectedDetailBooking.paymentMethod === 'CASH_OFFLINE'
                            ? '💵 Cash on Visit'
                            : '💳 Online Prepaid'}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { color: Colors.danger }]}>Platform Fee (20%)</Text>
                        <Text style={[styles.breakdownVal, { color: Colors.danger }]}>
                          ₹{selectedDetailBooking.platformPayableAmount ?? selectedDetailBooking.platformFee ?? 90}
                          {selectedDetailBooking.platformSettlementStatus === 'PAID' ? ' (Cleared)' : ' (Due)'}
                        </Text>
                      </View>
                      <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                        <Text style={styles.breakdownTotalLabel}>Your Net Earning</Text>
                        <Text style={styles.breakdownTotalVal}>
                          ₹{selectedDetailBooking.netEarning ?? 360}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* If Due, Quick Button to Pay */}
                  {(selectedDetailBooking.paymentMethod === 'CASH' || selectedDetailBooking.paymentMethod === 'CASH_OFFLINE') &&
                    selectedDetailBooking.platformSettlementStatus !== 'PAID' && (
                      <TouchableOpacity
                        style={styles.payDueDirectBtn}
                        onPress={() => {
                          setSelectedDetailBooking(null);
                          setPayDueModalVisible(true);
                        }}
                      >
                        <Ionicons name="wallet-outline" size={16} color="#ffffff" />
                        <Text style={styles.btnTextWhite}>Pay Platform Due Now (₹{selectedDetailBooking.platformPayableAmount ?? selectedDetailBooking.platformFee ?? 90})</Text>
                      </TouchableOpacity>
                    )}

                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { marginTop: 14 }]}
                    onPress={() => setSelectedDetailBooking(null)}
                  >
                    <Text style={styles.modalCancelText}>Close Details</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
  },
  staffName: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textMain,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bookingNo: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  patientNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  cardPayable: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  startBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  otpInput: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 52,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 6,
    color: Colors.textMain,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dueAlertCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dueAlertIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9f1239',
  },
  dueAlertSubtitle: {
    fontSize: 11,
    color: '#881337',
    marginTop: 2,
    lineHeight: 15,
  },
  payPlatformBtn: {
    backgroundColor: Colors.danger,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payPlatformBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  cashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statCardDue: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  statCardHint: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  statCardHintDue: {
    color: Colors.danger,
  },
  tapCardHint: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 2,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dueBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dueAmountBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  dueAmountLabel: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '700',
  },
  dueAmountValue: {
    fontSize: 28,
    color: '#b91c1c',
    fontWeight: '900',
    marginTop: 4,
  },
  upiInfoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  upiInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  upiInfoDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
    marginBottom: 16,
  },
  breakdownTable: {
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  breakdownVal: {
    fontSize: 13,
    color: Colors.textMain,
    fontWeight: '600',
  },
  breakdownValBold: {
    fontSize: 14,
    color: Colors.textMain,
    fontWeight: '800',
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
  },
  breakdownTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.secondary,
  },
  detailSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textMain,
    flex: 1,
    lineHeight: 18,
  },
  detailTextBold: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMain,
    flex: 1,
  },
  detailNotesText: {
    fontSize: 13,
    color: Colors.textMain,
    backgroundColor: Colors.borderLight,
    padding: 8,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  callPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  mapBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  payDueDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.danger,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  pendingContainer: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  pendingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  pendingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pendingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  pendingStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  pendingTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.textMain,
    textAlign: 'center',
  },
  pendingSubtitleHindi: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  pendingDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  pendingTimelineBox: {
    width: '100%',
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMain,
  },
  timelineItemDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  timelineLine: {
    width: 2,
    height: 14,
    backgroundColor: Colors.border,
    marginLeft: 9,
    marginVertical: 3,
  },
  pendingNoticeCard: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  pendingNoticeText: {
    fontSize: 11,
    color: Colors.primary,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  checkStatusBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactSupportBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  contactSupportText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
});
