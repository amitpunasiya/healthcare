import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: any) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from AsyncStorage on app launch
  useEffect(() => {
    const loadStoredSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('@carepulse_token');
        const storedUser = await AsyncStorage.getItem('@carepulse_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          // Verify with backend in background
          try {
            const res = await api.get('/auth/me');
            if (res.data.success && res.data.user) {
              setUser(res.data.user);
              await AsyncStorage.setItem('@carepulse_user', JSON.stringify(res.data.user));
            }
          } catch (meErr: any) {
            if (meErr?.response?.status === 401) {
              await logout();
            }
          }
        }
      } catch (err) {
        console.log('[AUTH INIT] Failed to load stored session:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStoredSession();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password: pass,
      });

      if (res.data.success && res.data.token) {
        const receivedToken = res.data.token;
        const receivedUser = res.data.user;

        await AsyncStorage.setItem('@carepulse_token', receivedToken);
        await AsyncStorage.setItem('@carepulse_user', JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);

        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err: any) {
      const isNetwork =
        err.message?.includes('Network Error') ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        !err.response;
      const errorMsg =
        err.response?.data?.message ||
        (isNetwork
          ? 'Cannot reach backend server. Check Wi-Fi / IP settings.'
          : 'Login failed. Please check credentials.');
      return { success: false, message: errorMsg };
    }
  };

  const register = async (data: any) => {
    try {
      const endpoint =
        data.role === 'PROVIDER' ? '/auth/register/provider' : '/auth/register/customer';

      const res = await api.post(endpoint, data);
      if (res.data.success) {
        if (res.data.token && res.data.user) {
          await AsyncStorage.setItem('@carepulse_token', res.data.token);
          await AsyncStorage.setItem('@carepulse_user', JSON.stringify(res.data.user));
          setToken(res.data.token);
          setUser(res.data.user);
        }
        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data.message || 'Registration failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed. Please check your data.',
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('@carepulse_token');
      await AsyncStorage.removeItem('@carepulse_user');
    } catch (err) {
      console.log('[LOGOUT] Error clearing AsyncStorage:', err);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem('@carepulse_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.log('[REFRESH USER] Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
