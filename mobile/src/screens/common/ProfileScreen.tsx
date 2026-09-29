import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import {
  getApiBaseUrl,
  getSavedServerTarget,
  saveServerTarget,
  resetServerTargetToDefault,
  testServerConnection,
  getAutoDetectedHost,
} from '../../api/client';
import { Ionicons } from '@expo/vector-icons';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [serverTarget, setServerTarget] = useState(getAutoDetectedHost());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadTarget = async () => {
      const target = await getSavedServerTarget();
      setServerTarget(target);
    };
    loadTarget();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const result = await testServerConnection(serverTarget);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveTarget = async () => {
    if (!serverTarget.trim()) return;
    try {
      const updatedUrl = await saveServerTarget(serverTarget);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Server Target Updated', `API requests will now connect to:\n${updatedUrl}`);
    } catch (e) {
      Alert.alert('Error', 'Could not save server target');
    }
  };

  const handleResetDefault = async () => {
    try {
      const updatedUrl = await resetServerTargetToDefault();
      setServerTarget(getAutoDetectedHost());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      Alert.alert('Reset Successful', `Reset to auto-detected server:\n${updatedUrl}`);
    } catch (e) {
      Alert.alert('Error', 'Could not reset server settings');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from CarePulse?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {(user?.fullName || 'U').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.fullName || 'CarePulse User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>ROLE: {user?.role || 'CUSTOMER'}</Text>
          </View>
          {user?.verificationStatus ? (
            <View style={styles.verBadge}>
              <Text style={styles.verBadgeText}>{user.verificationStatus}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.infoLabel}>Account Status</Text>
          <Text style={[styles.infoValue, { color: Colors.success }]}>Active</Text>
        </View>
      </View>

      {/* LAN Server IP Configuration */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Backend Connection Settings</Text>
        <Text style={styles.sectionSubtitle}>
          Current Active URL: {getApiBaseUrl()}
        </Text>

        <View style={styles.ipInputRow}>
          <TextInput
            style={styles.ipInput}
            value={serverTarget}
            onChangeText={setServerTarget}
            placeholder="e.g. 192.168.29.14 or tunnel URL"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.saveIpBtn} onPress={handleSaveTarget}>
            <Text style={styles.saveIpBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}
            onPress={handleTestConnection}
            disabled={testingConnection}
          >
            {testingConnection ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                Test Connection
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1 }]}
            onPress={handleResetDefault}
          >
            <Text style={{ color: Colors.textMuted, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
              Reset to Detected
            </Text>
          </TouchableOpacity>
        </View>

        {testResult ? (
          <View style={{ marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: testResult.ok ? Colors.successLight : Colors.dangerLight }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: testResult.ok ? Colors.success : Colors.danger }}>
              {testResult.ok ? '✓ ' : '✕ '}{testResult.message}
            </Text>
          </View>
        ) : null}

        {savedSuccess ? (
          <Text style={styles.savedNotice}>✓ Connected to new backend target</Text>
        ) : null}
      </View>

      {/* Sign out button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>
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
    paddingTop: 50,
    gap: 14,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textMain,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  verBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.success,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textMain,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMain,
  },
  ipInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ipInput: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.textMain,
  },
  saveIpBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveIpBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  savedNotice: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  actionBtn: {
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    height: 48,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
});
