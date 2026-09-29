import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import {
  getApiBaseUrl,
  getSavedServerTarget,
  saveServerTarget,
  resetServerTargetToDefault,
  testServerConnection,
  getAutoDetectedHost,
} from '../../api/client';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Server IP / Connectivity Configuration
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverTarget, setServerTarget] = useState(getAutoDetectedHost());
  const [activeUrl, setActiveUrl] = useState(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveNotice, setSaveNotice] = useState('');

  const { login } = useAuth();

  useEffect(() => {
    const loadTarget = async () => {
      const saved = await getSavedServerTarget();
      setServerTarget(saved);
      setActiveUrl(getApiBaseUrl());
    };
    loadTarget();
  }, []);

  const handleTestConnection = async (targetToTest?: string) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testServerConnection(targetToTest || serverTarget);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServerTarget = async () => {
    if (!serverTarget.trim()) return;
    try {
      const newUrl = await saveServerTarget(serverTarget);
      setActiveUrl(newUrl);
      setSaveNotice('✓ Server updated!');
      setTimeout(() => setSaveNotice(''), 3000);
      handleTestConnection(newUrl);
    } catch (e) {
      setTestResult({ ok: false, message: 'Failed to save server target' });
    }
  };

  const handleResetToAutoDetect = async () => {
    try {
      const newUrl = await resetServerTargetToDefault();
      const detected = getAutoDetectedHost();
      setServerTarget(detected);
      setActiveUrl(newUrl);
      setSaveNotice('✓ Reset to auto-detected IP!');
      setTimeout(() => setSaveNotice(''), 3000);
      handleTestConnection(newUrl);
    } catch (e) {
      setTestResult({ ok: false, message: 'Failed to reset settings' });
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message || 'Invalid credentials');
        if (res.message?.includes('backend server') || res.message?.includes('Network Error')) {
          setShowServerConfig(true);
        }
      }
    } catch (err: any) {
      setError('Something went wrong during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="pulse" size={32} color="#ffffff" />
          </View>
          <Text style={styles.title}>CarePulse</Text>
          <Text style={styles.subtitle}>Home Visit Healthcare Mobile Portal</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in with your registered account</Text>

          {error ? (
            <View style={styles.errorBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
              {error.includes('backend server') || error.includes('Wi-Fi') ? (
                <TouchableOpacity
                  style={styles.fixConnectionBtn}
                  onPress={() => setShowServerConfig(true)}
                >
                  <Ionicons name="build-outline" size={14} color="#ffffff" />
                  <Text style={styles.fixConnectionBtnText}>Fix Server IP Settings</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Email input */}
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="example@mail.com"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password input */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Server Connection Settings Card */}
        <View style={styles.serverBox}>
          <TouchableOpacity
            style={styles.serverHeaderRow}
            onPress={() => setShowServerConfig(!showServerConfig)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons
                name={testResult?.ok ? 'wifi' : 'wifi-outline'}
                size={16}
                color={testResult?.ok ? Colors.success : Colors.primary}
              />
              <Text style={styles.serverHeaderText}>
                Server: <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }}>{activeUrl}</Text>
              </Text>
            </View>
            <Ionicons
              name={showServerConfig ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showServerConfig ? (
            <View style={styles.serverContent}>
              <Text style={styles.serverSubtext}>
                Expo Go connects to backend on port 5000. If your IP changed or you're using mobile data, adjust below:
              </Text>

              <View style={styles.serverInputRow}>
                <TextInput
                  style={styles.serverInput}
                  value={serverTarget}
                  onChangeText={setServerTarget}
                  placeholder="e.g. 192.168.29.14 or tunnel URL"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.serverSaveBtn}
                  onPress={handleSaveServerTarget}
                  activeOpacity={0.8}
                >
                  <Text style={styles.serverSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.serverActionsRow}>
                <TouchableOpacity
                  style={styles.serverActionBtn}
                  onPress={() => handleTestConnection()}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="flash-outline" size={14} color={Colors.primary} />
                      <Text style={styles.serverActionBtnText}>Test Connection</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.serverActionBtn}
                  onPress={handleResetToAutoDetect}
                >
                  <Ionicons name="refresh-outline" size={14} color={Colors.textMuted} />
                  <Text style={[styles.serverActionBtnText, { color: Colors.textMuted }]}>Auto-Detect IP</Text>
                </TouchableOpacity>
              </View>

              {testResult ? (
                <View
                  style={[
                    styles.testResultBox,
                    { backgroundColor: testResult.ok ? Colors.successLight : Colors.dangerLight },
                  ]}
                >
                  <Ionicons
                    name={testResult.ok ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={testResult.ok ? Colors.success : Colors.danger}
                  />
                  <Text
                    style={[
                      styles.testResultText,
                      { color: testResult.ok ? Colors.success : Colors.danger },
                    ]}
                  >
                    {testResult.message}
                  </Text>
                </View>
              ) : null}

              {saveNotice ? (
                <Text style={styles.saveNoticeText}>{saveNotice}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Demo hints */}
        <View style={styles.hintsBox}>
          <Text style={styles.hintsTitle}>Quick Test Credentials:</Text>
          <Text style={styles.hintsText}>• Customer: patient@carepulse.in / Pass@123</Text>
          <Text style={styles.hintsText}>• Provider: provider@carepulse.in / Pass@123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textMain,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMain,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textMain,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  hintsBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  hintsText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  fixConnectionBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  fixConnectionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  serverBox: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  serverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.borderLight,
  },
  serverHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMain,
    flex: 1,
  },
  serverContent: {
    padding: 14,
    gap: 10,
    backgroundColor: Colors.surface,
  },
  serverSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  serverInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serverInput: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    fontSize: 13,
    color: Colors.textMain,
  },
  serverSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  serverActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serverActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  serverActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveNoticeText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
