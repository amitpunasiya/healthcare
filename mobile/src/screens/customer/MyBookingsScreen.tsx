import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import api from '../../api/client';
import { Booking, BookingStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export const MyBookingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBookings = async () => {
    setErrorMsg(null);
    try {
      const res = await api.get('/bookings');
      if (res.data.success && Array.isArray(res.data.bookings)) {
        setBookings(res.data.bookings);
      }
    } catch (err: any) {
      console.warn('Failed to load bookings:', err);
      const msg =
        err.response?.data?.message ||
        (err.message?.includes('Network Error')
          ? 'Cannot connect to server. Check Wi-Fi or update IP in Profile.'
          : 'Could not load bookings.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch automatically whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
        return { bg: Colors.successLight, text: Colors.success, label: 'COMPLETED' };
      case 'PAYMENT_PENDING':
        return { bg: '#fff7ed', text: '#ea580c', label: 'PAYMENT DUE' };
      case 'IN_PROGRESS':
        return { bg: '#e0f2fe', text: '#0284c7', label: 'IN PROGRESS' };
      case 'ACCEPTED':
        return { bg: '#fef3c7', text: '#d97706', label: 'STAFF ASSIGNED' };
      case 'REQUESTED':
      case 'SEARCHING':
      case 'PENDING':
        return { bg: '#f1f5f9', text: '#0284c7', label: 'REQUESTED' };
      case 'CANCELLED':
      case 'REJECTED':
        return { bg: Colors.dangerLight, text: Colors.danger, label: 'CANCELLED' };
      default:
        return { bg: '#f1f5f9', text: '#64748b', label: status };
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const statusCfg = getStatusColor(item.status);
    const serviceTitle =
      typeof item.serviceId === 'object' && item.serviceId?.name
        ? item.serviceId.name
        : typeof item.serviceCategoryId === 'object' && item.serviceCategoryId?.name
        ? item.serviceCategoryId.name
        : item.serviceCategory || 'Home Healthcare Service';

    const addressText =
      item.serviceAddress?.addressLine1 ||
      item.address?.addressLine1 ||
      (item.serviceAddress?.city ? `${item.serviceAddress.city}, ${item.serviceAddress.pincode || ''}` : 'Home Visit');

    const displayPrice =
      item.pricing?.totalAmount ||
      item.finalPayableAmount ||
      item.totalAmount ||
      0;

    const otpCode = item.serviceOtp || item.startOtp;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id })}
        activeOpacity={0.8}
      >
        {/* Header with status badge */}
        <View style={styles.cardHeader}>
          <Text style={styles.bookingNumber}>
            #{item.bookingNumber || item._id.slice(-6).toUpperCase()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Service Title */}
        <Text style={styles.cardTitle}>{serviceTitle}</Text>

        {/* Address and Date */}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.metaText}>
            {new Date(item.bookingDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          {item.timeSlot?.startTime ? (
            <>
              <Text style={{ color: Colors.textLight }}>•</Text>
              <Text style={styles.metaText}>{item.timeSlot.startTime} - {item.timeSlot.endTime || ''}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {addressText}
          </Text>
        </View>

        {/* Start OTP Banner - only for upcoming/in-progress visits */}
        {otpCode &&
          ['REQUESTED', 'SEARCHING', 'PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(
            item.status
          ) && (
            <View style={styles.otpBanner}>
              <Ionicons name="key" size={14} color={Colors.warning} />
              <Text style={styles.otpLabel}>Service Start OTP:</Text>
              <Text style={styles.otpCode}>{otpCode}</Text>
              <Text style={styles.otpHint}>(Share with staff upon arrival)</Text>
            </View>
          )}

        {/* Payment Due Banner */}
        {item.status === 'PAYMENT_PENDING' && (
          <View style={styles.payPendingBanner}>
            <Ionicons name="alert-circle" size={16} color="#ea580c" />
            <Text style={styles.payPendingText}>Service Completed • Tap to Pay ₹{displayPrice}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.priceLabel}>
            Amount: <Text style={styles.priceValue}>₹{displayPrice}</Text>
          </Text>
          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Healthcare Bookings</Text>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={() => {
            setRefreshing(true);
            fetchBookings();
          }}
        >
          <Ionicons name="refresh" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.danger} />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={fetchBookings}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBookings();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={54} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No Bookings Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't scheduled any home healthcare visits yet.
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={fetchBookings}
                >
                  <Ionicons name="refresh" size={16} color={Colors.primary} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookNowBtn}
                  onPress={() => navigation.navigate('HomeTab')}
                >
                  <Text style={styles.bookNowBtnText}>Explore Services</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  retryText: {
    color: Colors.danger,
    fontWeight: '800',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  otpBanner: {
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.warning,
  },
  otpCode: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textMain,
    letterSpacing: 3,
  },
  otpHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  payPendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  payPendingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c2410c',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 12,
    paddingTop: 12,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  bookNowBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookNowBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
