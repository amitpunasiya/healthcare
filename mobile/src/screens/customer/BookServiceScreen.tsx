import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import api from '../../api/client';
import { Service, ServiceCategory } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../utils/formatters';

interface TimeSlotOption {
  id: string;
  label: string;
  startTime: string; // HH:MM 24h format for backend validation
  endTime: string;   // HH:MM 24h format
  period: 'morning' | 'afternoon' | 'evening';
  badge?: string;
}

// Standard 1-hour slots spanning 06:00 AM to 11:00 PM (17 one-hour slots)
const STANDARD_TIME_SLOTS: TimeSlotOption[] = [
  // Morning: 06:00 AM - 12:00 PM
  { id: '1', label: '06:00 AM - 07:00 AM', startTime: '06:00', endTime: '07:00', period: 'morning' },
  { id: '2', label: '07:00 AM - 08:00 AM', startTime: '07:00', endTime: '08:00', period: 'morning' },
  { id: '3', label: '08:00 AM - 09:00 AM', startTime: '08:00', endTime: '09:00', period: 'morning' },
  { id: '4', label: '09:00 AM - 10:00 AM', startTime: '09:00', endTime: '10:00', period: 'morning' },
  { id: '5', label: '10:00 AM - 11:00 AM', startTime: '10:00', endTime: '11:00', period: 'morning' },
  { id: '6', label: '11:00 AM - 12:00 PM', startTime: '11:00', endTime: '12:00', period: 'morning' },

  // Afternoon: 12:00 PM - 05:00 PM
  { id: '7', label: '12:00 PM - 01:00 PM', startTime: '12:00', endTime: '13:00', period: 'afternoon' },
  { id: '8', label: '01:00 PM - 02:00 PM', startTime: '13:00', endTime: '14:00', period: 'afternoon' },
  { id: '9', label: '02:00 PM - 03:00 PM', startTime: '14:00', endTime: '15:00', period: 'afternoon' },
  { id: '10', label: '03:00 PM - 04:00 PM', startTime: '15:00', endTime: '16:00', period: 'afternoon' },
  { id: '11', label: '04:00 PM - 05:00 PM', startTime: '16:00', endTime: '17:00', period: 'afternoon' },

  // Evening & Night: 05:00 PM - 11:00 PM
  { id: '12', label: '05:00 PM - 06:00 PM', startTime: '17:00', endTime: '18:00', period: 'evening' },
  { id: '13', label: '06:00 PM - 07:00 PM', startTime: '18:00', endTime: '19:00', period: 'evening' },
  { id: '14', label: '07:00 PM - 08:00 PM', startTime: '19:00', endTime: '20:00', period: 'evening' },
  { id: '15', label: '08:00 PM - 09:00 PM', startTime: '20:00', endTime: '21:00', period: 'evening' },
  { id: '16', label: '09:00 PM - 10:00 PM', startTime: '21:00', endTime: '22:00', period: 'evening' },
  { id: '17', label: '10:00 PM - 11:00 PM', startTime: '22:00', endTime: '23:00', period: 'evening' },
];

// 10-Hour Slots for Elder Care & Long-Duration Services
const TEN_HOUR_SLOTS: TimeSlotOption[] = [
  // Day / Morning Shifts (starts 6 AM - 11 AM)
  { id: '10h-1', label: '06:00 AM - 04:00 PM (10 Hours)', startTime: '06:00', endTime: '16:00', period: 'morning', badge: 'Early Morning Shift' },
  { id: '10h-2', label: '07:00 AM - 05:00 PM (10 Hours)', startTime: '07:00', endTime: '17:00', period: 'morning', badge: 'Morning Shift' },
  { id: '10h-3', label: '08:00 AM - 06:00 PM (10 Hours)', startTime: '08:00', endTime: '18:00', period: 'morning', badge: 'Day Shift (Recommended)' },
  { id: '10h-4', label: '09:00 AM - 07:00 PM (10 Hours)', startTime: '09:00', endTime: '19:00', period: 'morning', badge: 'General Day Shift' },
  { id: '10h-5', label: '10:00 AM - 08:00 PM (10 Hours)', startTime: '10:00', endTime: '20:00', period: 'morning', badge: 'Mid-Day Shift' },
  { id: '10h-6', label: '11:00 AM - 09:00 PM (10 Hours)', startTime: '11:00', endTime: '21:00', period: 'morning', badge: 'Late Morning Shift' },

  // Afternoon Shifts (starts 12 PM - 1 PM)
  { id: '10h-7', label: '12:00 PM - 10:00 PM (10 Hours)', startTime: '12:00', endTime: '22:00', period: 'afternoon', badge: 'Afternoon Shift' },
  { id: '10h-8', label: '01:00 PM - 11:00 PM (10 Hours)', startTime: '13:00', endTime: '23:00', period: 'afternoon', badge: 'Evening Shift' },

  // Night Shifts
  { id: '10h-9', label: '08:00 PM - 06:00 AM (10 Hours)', startTime: '20:00', endTime: '06:00', period: 'evening', badge: 'Night Care Shift' },
  { id: '10h-10', label: '09:00 PM - 07:00 AM (10 Hours)', startTime: '21:00', endTime: '07:00', period: 'evening', badge: 'Night Care Shift' },
  { id: '10h-11', label: '10:00 PM - 08:00 AM (10 Hours)', startTime: '22:00', endTime: '08:00', period: 'evening', badge: 'Overnight Shift' },
];

export const BookServiceScreen: React.FC<{ route?: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { user } = useAuth();
  const initialService: Service | undefined = route?.params?.service;

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(initialService || null);
  const [servicePickerVisible, setServicePickerVisible] = useState(route?.params?.openPicker || false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  const [patientName, setPatientName] = useState(user?.fullName || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Indore');
  const [state, setState] = useState('Madhya Pradesh');
  const [pincode, setPincode] = useState('452001');
  const [notes, setNotes] = useState('');

  // GPS Coordinates state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Date selection
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // Helper for next 4 days
  const dateOptions = [0, 1, 2, 3].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    let title = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    let subtitle = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { dateStr, title, subtitle };
  });

  // Time slot selection
  const [periodFilter, setPeriodFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption>(() => {
    if (
      initialService &&
      !initialService.name?.toLowerCase().includes('physio') &&
      initialService.durationMinutes &&
      initialService.durationMinutes >= 600
    ) {
      return TEN_HOUR_SLOTS[2]; // 08:00 AM - 06:00 PM (10 Hours)
    }
    return STANDARD_TIME_SLOTS[4]; // default 10:00 - 11:00
  });

  const [loading, setLoading] = useState(false);
  const [fetchingServices, setFetchingServices] = useState(!initialService);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [srvRes, catRes] = await Promise.all([
          api.get('/services'),
          api.get('/services/categories'),
        ]);
        if (srvRes.data.success && srvRes.data.services) {
          setServices(srvRes.data.services);
          if (!selectedService && !route?.params?.service && srvRes.data.services.length > 0) {
            // Default to Physiotherapy if available or first service
            const physio = srvRes.data.services.find((s: Service) =>
              s.name.toLowerCase().includes('physio')
            );
            setSelectedService(physio || srvRes.data.services[0]);
          }
        }
        if (catRes.data.success && catRes.data.categories) {
          setCategories(catRes.data.categories);
        }
      } catch (err) {
        console.warn('Failed to fetch services/categories:', err);
      } finally {
        setFetchingServices(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (route?.params?.service) {
      setSelectedService(route.params.service);
    }
    if (route?.params?.openPicker) {
      setServicePickerVisible(true);
    }
  }, [route?.params]);

  // Determine whether current service is 10 hours (strictly durationMinutes >= 600 and not physiotherapy)
  const isTenHourService = Boolean(
    !selectedService?.name?.toLowerCase().includes('physio') &&
      selectedService?.durationMinutes &&
      selectedService.durationMinutes >= 600
  );

  // Switch selected slot whenever service changes
  useEffect(() => {
    if (isTenHourService) {
      if (!TEN_HOUR_SLOTS.some((s) => s.id === selectedSlot?.id)) {
        setSelectedSlot(TEN_HOUR_SLOTS[2]); // 08:00 AM - 06:00 PM
      }
    } else {
      if (!STANDARD_TIME_SLOTS.some((s) => s.id === selectedSlot?.id)) {
        setSelectedSlot(STANDARD_TIME_SLOTS[4]); // 10:00 AM - 11:00 AM
      }
    }
  }, [selectedService, isTenHourService]);

  // Use My Current Location Handler
  const handleUseCurrentLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access in your device settings to auto-detect your home address.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });

      // Reverse geocoding to address text
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const info = geocoded[0];
        const addressPieces = [
          info.name,
          info.street,
          info.district,
          info.subregion,
        ].filter(Boolean);

        const resolvedAddress = addressPieces.join(', ') || `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        setAddressLine1(resolvedAddress);
        if (info.city) setCity(info.city);
        if (info.region) setState(info.region);
        if (info.postalCode && /^[1-9][0-9]{5}$/.test(info.postalCode)) {
          setPincode(info.postalCode);
        }
        Alert.alert('GPS Location Set 📍', `${resolvedAddress}\n${info.city || 'Indore'} - ${info.postalCode || pincode}`);
      } else {
        setAddressLine1(`Near Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      }
    } catch (err: any) {
      console.warn('GPS location error:', err);
      Alert.alert('GPS Notice', 'Could not detect current location. Please type your address manually.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedService) {
      Alert.alert('Error', 'Please select a healthcare service');
      return;
    }
    if (!addressLine1.trim() || addressLine1.trim().length < 3) {
      Alert.alert('Missing Address', 'Please provide a valid home address (at least 3 characters).');
      return;
    }
    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code (e.g. 452001).');
      return;
    }

    setLoading(true);
    try {
      const catId =
        typeof selectedService.categoryId === 'object'
          ? (selectedService.categoryId as ServiceCategory)._id
          : selectedService.categoryId;

      const chosenDate = dateOptions[selectedDateIndex].dateStr;

      // Backend Schema Compatible Payload
      const payload: any = {
        serviceId: selectedService._id,
        serviceCategoryId: catId,
        serviceMode: 'HOME_VISIT',
        engagementType: 'ONE_TIME',
        bookingDate: chosenDate,
        timeSlot: {
          startTime: selectedSlot.startTime, // 24-hour format "HH:MM" e.g. "09:00"
          endTime: selectedSlot.endTime,     // 24-hour format "HH:MM" e.g. "10:00"
        },
        serviceAddress: {
          addressLine1: addressLine1.trim(),
          city: city.trim() || 'Indore',
          state: state.trim() || 'Madhya Pradesh',
          pincode: cleanPin,
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        },
      };

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        Alert.alert(
          'Booking Confirmed! 🎉',
          `Your appointment has been scheduled for ${chosenDate} (${selectedSlot.label}). A verified healthcare professional will be assigned.`,
          [
            {
              text: 'View My Bookings',
              onPress: () => navigation.navigate('MyBookingsTab'),
            },
          ]
        );
      } else {
        Alert.alert('Booking Notice', res.data.message || 'Could not complete booking.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Failed to create appointment. Please verify details.';
      Alert.alert('Booking Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = isTenHourService ? TEN_HOUR_SLOTS : STANDARD_TIME_SLOTS;

  const filteredSlots = availableSlots.filter(
    (slot) => periodFilter === 'all' || slot.period === periodFilter
  );

  const periodTabs = isTenHourService
    ? [
        { key: 'all', label: 'All Shifts' },
        { key: 'morning', label: 'Day (6 AM-6 PM)' },
        { key: 'afternoon', label: 'Afternoon (12-11 PM)' },
        { key: 'evening', label: 'Night Shift' },
      ]
    : [
        { key: 'all', label: 'All Slots' },
        { key: 'morning', label: 'Morning (6-12)' },
        { key: 'afternoon', label: 'Afternoon (12-5)' },
        { key: 'evening', label: 'Night (5-11)' },
      ];

  const filteredServices = services.filter((srv) => {
    if (selectedCatFilter !== 'all') {
      const catId = typeof srv.categoryId === 'object' ? srv.categoryId?._id : srv.categoryId;
      if (catId !== selectedCatFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        srv.name?.toLowerCase().includes(q) ||
        (srv.description && srv.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* Selected Service Card Header with Change Button */}
        <View style={styles.headerWithBtn}>
          <Text style={styles.sectionTitleNoMargin}>Selected Healthcare Service</Text>
          <TouchableOpacity
            style={styles.changeSrvBtn}
            onPress={() => setServicePickerVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={13} color={Colors.primary} />
            <Text style={styles.changeSrvBtnText}>Search / Change</Text>
          </TouchableOpacity>
        </View>

        {fetchingServices ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 14 }} />
        ) : (
          <TouchableOpacity
            style={styles.servicePickerCard}
            onPress={() => setServicePickerVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.srvIconCircle}>
              <Ionicons name="medkit" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.srvName}>{selectedService?.name || 'Tap to Select Service'}</Text>
              <Text style={styles.srvPrice}>
                ₹{selectedService?.basePrice || 450}
                {selectedService?.durationMinutes ? ` • ${formatDuration(selectedService.durationMinutes)}` : ''}
              </Text>
            </View>
            <View style={styles.changeActionBadge}>
              <Text style={styles.changeActionText}>Change</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Visit Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dateOptions.map((opt, idx) => (
            <TouchableOpacity
              key={opt.dateStr}
              style={[styles.dateCard, selectedDateIndex === idx && styles.dateCardActive]}
              onPress={() => setSelectedDateIndex(idx)}
            >
              <Text style={[styles.dateTitle, selectedDateIndex === idx && styles.dateTitleActive]}>
                {opt.title}
              </Text>
              <Text style={[styles.dateSubtitle, selectedDateIndex === idx && styles.dateSubtitleActive]}>
                {opt.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Home Visit Address with Location Button */}
        <View style={styles.headerWithBtn}>
          <Text style={styles.sectionTitleNoMargin}>Home Visit Address</Text>
          <TouchableOpacity
            style={styles.locBtn}
            onPress={handleUseCurrentLocation}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="locate-sharp" size={15} color={Colors.primary} />
                <Text style={styles.locBtnText}>Use My Current Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>House / Flat / Street Address *</Text>
          <TextInput
            style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
            placeholder="e.g. 132 ext., Near Haripublic School, Sukhliya"
            placeholderTextColor={Colors.textLight}
            value={addressLine1}
            onChangeText={setAddressLine1}
            multiline
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Indore"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>6-Digit PIN Code *</Text>
              <TextInput
                style={styles.input}
                value={pincode}
                onChangeText={setPincode}
                placeholder="452001"
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>

          {coords ? (
            <View style={styles.gpsVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.gpsVerifiedText}>
                GPS Coordinates Attached ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
              </Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Patient Notes / Symptoms (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Post surgery dressing, elderly patient"
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Time Slot Selection */}
        <View style={styles.slotHeaderRow}>
          <Text style={styles.sectionTitleNoMargin}>
            {isTenHourService ? 'Available Time Slots (10 Hours Shift)' : 'Available Time Slot (6 AM - 11 PM)'}
          </Text>
        </View>

        {/* Period Filter Tabs */}
        <View style={styles.periodFilterRow}>
          {periodTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, periodFilter === tab.key && styles.periodTabActive]}
              onPress={() => setPeriodFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  periodFilter === tab.key && styles.periodTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Slot List */}
        <View style={styles.slotGrid}>
          {filteredSlots.map((slot) => {
            const isSelected = selectedSlot.id === slot.id;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotCard, isSelected && styles.slotCardActive]}
                onPress={() => setSelectedSlot(slot)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={slot.period === 'morning' ? 'sunny-outline' : slot.period === 'afternoon' ? 'partly-sunny-outline' : 'moon-outline'}
                  size={18}
                  color={isSelected ? Colors.primary : Colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.slotCardText, isSelected && styles.slotCardTextActive]}>
                    {slot.label}
                  </Text>
                  {slot.badge ? (
                    <Text style={[styles.slotCardBadge, isSelected && styles.slotCardBadgeActive]}>
                      {slot.badge}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Booking Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.btnDisabled]}
          onPress={handleCreateBooking}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.confirmBtnText}>Confirm Home Visit Appointment</Text>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Service Search & Selection Modal */}
      <Modal
        visible={servicePickerVisible}
        animationType="slide"
        onRequestClose={() => setServicePickerVisible(false)}
      >
        <View style={styles.serviceModalContainer}>
          {/* Header */}
          <View style={styles.serviceModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceModalTitle}>Select Healthcare Service</Text>
              <Text style={styles.serviceModalSub}>
                Browse or search from {services.length} available services
              </Text>
            </View>
            <TouchableOpacity
              style={styles.serviceModalClose}
              onPress={() => setServicePickerVisible(false)}
            >
              <Ionicons name="close" size={24} color={Colors.textMain} />
            </TouchableOpacity>
          </View>

          {/* Search Input Bar */}
          <View style={styles.modalSearchBar}>
            <Ionicons name="search" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search services (e.g. Physio, Blood, Nurse...)"
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <View style={{ maxHeight: 44, marginBottom: 8 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catPillRow}
              >
                <TouchableOpacity
                  style={[
                    styles.catFilterPill,
                    selectedCatFilter === 'all' && styles.catFilterPillActive,
                  ]}
                  onPress={() => setSelectedCatFilter('all')}
                >
                  <Text
                    style={[
                      styles.catFilterPillText,
                      selectedCatFilter === 'all' && styles.catFilterPillTextActive,
                    ]}
                  >
                    All ({services.length})
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.catFilterPill,
                      selectedCatFilter === cat._id && styles.catFilterPillActive,
                    ]}
                    onPress={() => setSelectedCatFilter(cat._id)}
                  >
                    <Text
                      style={[
                        styles.catFilterPillText,
                        selectedCatFilter === cat._id && styles.catFilterPillTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Service Results List */}
          <FlatList
            data={filteredServices}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.serviceListContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptySearchBox}>
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptySearchTitle}>No Services Found</Text>
                <Text style={styles.emptySearchSub}>
                  No medical services match "{searchQuery}". Try another keyword.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedService?._id === item._id;
              return (
                <TouchableOpacity
                  style={[styles.serviceOptionCard, isSelected && styles.serviceOptionCardActive]}
                  onPress={() => {
                    setSelectedService(item);
                    setServicePickerVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.srvIconCircle,
                      isSelected && { backgroundColor: Colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="medkit"
                      size={22}
                      color={isSelected ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.optionSrvName, isSelected && { color: Colors.primary }]}
                    >
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.optionSrvDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <View style={styles.optionMetaRow}>
                      <Text style={styles.optionSrvPrice}>₹{item.basePrice}</Text>
                      {item.durationMinutes ? (
                        <Text style={styles.optionSrvDuration}>
                          • {formatDuration(item.durationMinutes)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollBody: {
    padding: 18,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitleNoMargin: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
  },
  headerWithBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  locBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  servicePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  srvIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textMain,
  },
  srvPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.secondary,
    marginTop: 2,
  },
  dateRow: {
    gap: 10,
    paddingBottom: 4,
  },
  dateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 84,
  },
  dateCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMain,
  },
  dateTitleActive: {
    color: '#ffffff',
  },
  dateSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dateSubtitleActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
    marginBottom: 8,
  },
  gpsVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  gpsVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  slotHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
  },
  periodFilterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  slotGrid: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  slotCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  slotCardText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMain,
  },
  slotCardTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  slotCardBadge: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  slotCardBadgeActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  // Service Change Button & Badges
  changeSrvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  changeSrvBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  changeActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 2,
  },
  changeActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  // Service Search Modal Styles
  serviceModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  serviceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  serviceModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textMain,
  },
  serviceModalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  serviceModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMain,
    height: '100%',
  },
  catPillRow: {
    paddingHorizontal: 18,
    gap: 8,
  },
  catFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catFilterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  catFilterPillTextActive: {
    color: '#ffffff',
  },
  serviceListContent: {
    padding: 18,
    paddingTop: 8,
    gap: 10,
    paddingBottom: 40,
  },
  serviceOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
  },
  serviceOptionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f9ff',
  },
  optionSrvName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 2,
  },
  optionSrvDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 6,
  },
  optionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionSrvPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.secondary,
  },
  optionSrvDuration: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptySearchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 30,
  },
  emptySearchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textMain,
    marginTop: 12,
  },
  emptySearchSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
