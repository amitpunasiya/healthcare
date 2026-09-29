import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../config/firebase';
import api from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, metadata?: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync token and load user profile from backend
  const syncBackendSession = async (idToken: string, fUser?: FirebaseUser | null, extraData?: any) => {
    try {
      localStorage.setItem('token', idToken);
      setToken(idToken);

      const syncRes = await api.post(
        '/webhooks/sync-session',
        {
          fullName: extraData?.fullName || fUser?.displayName || '',
          phone: extraData?.phone || fUser?.phoneNumber || '',
          role: extraData?.role || 'CUSTOMER',
        },
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (syncRes.data.success && syncRes.data.user) {
        setUser(syncRes.data.user);
        localStorage.setItem('user', JSON.stringify(syncRes.data.user));
      }
    } catch (err) {
      console.warn('[AUTH SYNC] Backend sync fallback to /auth/me');
      try {
        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (meRes.data.success && meRes.data.user) {
          setUser(meRes.data.user);
          localStorage.setItem('user', JSON.stringify(meRes.data.user));
        }
      } catch (meErr) {
        console.error('[AUTH ERROR] Could not fetch profile:', meErr);
      }
    }
  };

  const fetchCurrentUser = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        await logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Listen to Firebase auth state transitions & handle backend JWT persistence
  useEffect(() => {
    let isSubscribed = true;

    // Listen to global unauthorized events (e.g. from axios 401 interceptor)
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    if (!auth) {
      // If Firebase config is omitted in local dev, fallback to stored token
      fetchCurrentUser();
      return () => {
        isSubscribed = false;
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      if (!isSubscribed) return;
      setFirebaseUser(currentFirebaseUser);

      if (currentFirebaseUser) {
        try {
          const idToken = await currentFirebaseUser.getIdToken();
          await syncBackendSession(idToken, currentFirebaseUser);
        } catch (error) {
          console.error('[Firebase Auth] Error retrieving ID token:', error);
        } finally {
          if (isSubscribed) setLoading(false);
        }
      } else {
        // Firebase user is null; check for stored backend JWT session
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          try {
            const res = await api.get('/auth/me');
            if (isSubscribed && res.data.success && res.data.user) {
              setUser(res.data.user);
              localStorage.setItem('user', JSON.stringify(res.data.user));
            }
          } catch (err: any) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
              if (isSubscribed) await logout();
            }
          } finally {
            if (isSubscribed) setLoading(false);
          }
        } else {
          if (isSubscribed) {
            setUser(null);
            setToken(null);
            setLoading(false);
          }
        }
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not configured');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      await syncBackendSession(idToken, cred.user);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitHub = async () => {
    if (!auth) throw new Error('Firebase Auth is not configured');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, githubProvider);
      const idToken = await cred.user.getIdToken();
      await syncBackendSession(idToken, cred.user);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not configured');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      await syncBackendSession(idToken, cred.user);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, metadata?: any) => {
    if (!auth) throw new Error('Firebase Auth is not configured');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      await syncBackendSession(idToken, cred.user, metadata);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      if (auth && auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('[Firebase Auth] Logout notice:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('pending_booking_state');
      setToken(null);
      setUser(null);
      setFirebaseUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        firebaseUser,
        loading,
        login,
        logout,
        loginWithGoogle,
        loginWithGitHub,
        signInWithEmail,
        signUpWithEmail,
        refreshUser: fetchCurrentUser,
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
