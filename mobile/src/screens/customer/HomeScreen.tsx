import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import api from '../../api/client';
import { ServiceCategory, Service } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../utils/formatters';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [catRes, srvRes] = await Promise.all([
        api.get('/services/categories'),
        api.get('/services'),
      ]);
      if (catRes.data.success) {
        setCategories(catRes.data.categories || []);
      }
      if (srvRes.data.success) {
        setServices(srvRes.data.services || []);
      }
    } catch (e) {
      console.warn('Failed to load services on mobile:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getCategoryIcon = (slug?: string): any => {
    switch (slug) {
      case 'nursing-care':
        return 'medkit';
      case 'elderly-care':
        return 'heart';
      case 'physiotherapy':
        return 'fitness';
      case 'lab-tests':
        return 'flask';
      case 'doctor-visit':
        return 'person';
      default:
        return 'pulse';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.fullName || 'Patient'} 👋</Text>
          <Text style={styles.headerLocation}>
            <Ionicons name="location-sharp" size={14} color={Colors.primary} /> Home Healthcare Services
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Search Bar */}
        <TouchableOpacity
          style={styles.homeSearchBar}
          onPress={() => navigation.navigate('BookService', { openPicker: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={18} color={Colors.primary} />
          <Text style={styles.homeSearchPlaceholder}>
            Search all medical services, tests, therapies...
          </Text>
          <View style={styles.searchBadge}>
            <Text style={styles.searchBadgeText}>Search</Text>
          </View>
        </TouchableOpacity>

        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>⚡ 30-MIN RESPONSE TIME</Text>
          </View>
          <Text style={styles.heroTitle}>Verified Healthcare{'\n'}At Your Doorstep</Text>
          <Text style={styles.heroSubtitle}>
            Certified nurses, physiotherapists, & lab technicians visiting your home.
          </Text>

          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => {
              navigation.navigate('BookService', { openPicker: true });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.heroBtnText}>Book Home Visit</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Healthcare Categories</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                style={styles.categoryPill}
                onPress={() => {
                  const match = services.find((s) => {
                    const catId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
                    return catId === cat._id;
                  });
                  navigation.navigate('BookService', { service: match, category: cat });
                }}
              >
                <View style={styles.catIconCircle}>
                  <Ionicons name={getCategoryIcon(cat.slug)} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.catName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Popular Services Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Medical Services</Text>
        </View>

        <View style={styles.servicesGrid}>
          {services.map((srv) => (
            <TouchableOpacity
              key={srv._id}
              style={styles.serviceCard}
              onPress={() => navigation.navigate('BookService', { service: srv })}
              activeOpacity={0.8}
            >
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIconBadge}>
                  <Ionicons name="medkit-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.priceTag}>₹{srv.basePrice}</Text>
              </View>

              <Text style={styles.serviceName}>{srv.name}</Text>
              <Text style={styles.serviceDesc} numberOfLines={2}>
                {srv.description}
              </Text>

              <View style={styles.serviceFooter}>
                <Text style={styles.durationText}>
                  <Ionicons name="time-outline" size={12} color={Colors.textMuted} /> {formatDuration(srv.durationMinutes || 60)}
                </Text>
                <Text style={styles.bookNowText}>Book Visit →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
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
  welcomeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMain,
  },
  headerLocation: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 18,
    paddingBottom: 40,
  },
  homeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  homeSearchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  searchBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 24,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
  },
  heroBtnText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textMain,
  },
  categoryScroll: {
    paddingBottom: 16,
    gap: 12,
  },
  categoryPill: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  catIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMain,
    textAlign: 'center',
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.secondary,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  durationText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bookNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
});
