import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

// Fallback LAN IP for physical device connection on same Wi-Fi
export const FALLBACK_SERVER_IP = '192.168.29.14';

/**
 * Automatically extracts the Metro bundler host IP that Expo Go used to load the app.
 * E.g., if bundle was fetched from http://192.168.29.14:8081/..., returns "192.168.29.14"
 */
export const getAutoDetectedHost = (): string => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL && typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {
    // ignore
  }
  return FALLBACK_SERVER_IP;
};

/**
 * Normalizes input string into a valid API v1 base URL.
 * Handles:
 *  - "192.168.29.14" -> "http://192.168.29.14:5000/api/v1"
 *  - "192.168.29.14:5000" -> "http://192.168.29.14:5000/api/v1"
 *  - "http://192.168.29.14:5000" -> "http://192.168.29.14:5000/api/v1"
 *  - "https://tunnel.loca.lt" -> "https://tunnel.loca.lt/api/v1"
 */
export const normalizeApiUrl = (input?: string | null): string => {
  let val = (input || '').trim();
  if (!val) {
    return `http://${getAutoDetectedHost()}:5000/api/v1`;
  }
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    if (val.includes(':')) {
      val = `http://${val}`;
    } else {
      val = `http://${val}:5000`;
    }
  }
  val = val.replace(/\/+$/, '');
  if (!val.endsWith('/api/v1')) {
    val = `${val}/api/v1`;
  }
  return val;
};

export const DEFAULT_API_BASE_URL = normalizeApiUrl(getAutoDetectedHost());

let currentBaseUrl = DEFAULT_API_BASE_URL;

export const setApiBaseUrl = (url: string) => {
  const normalized = normalizeApiUrl(url);
  currentBaseUrl = normalized;
  api.defaults.baseURL = normalized;
};

export const getApiBaseUrl = () => currentBaseUrl;

export const getSavedServerTarget = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem('@carepulse_server_ip');
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    // ignore
  }
  return getAutoDetectedHost();
};

export const saveServerTarget = async (target: string): Promise<string> => {
  const trimmed = target.trim();
  await AsyncStorage.setItem('@carepulse_server_ip', trimmed);
  const normalized = normalizeApiUrl(trimmed);
  setApiBaseUrl(normalized);
  return normalized;
};

export const resetServerTargetToDefault = async (): Promise<string> => {
  await AsyncStorage.removeItem('@carepulse_server_ip');
  const detected = getAutoDetectedHost();
  const normalized = normalizeApiUrl(detected);
  setApiBaseUrl(normalized);
  return normalized;
};

export const testServerConnection = async (
  targetUrl?: string
): Promise<{ ok: boolean; message: string; latency?: number }> => {
  const urlToTest = targetUrl ? normalizeApiUrl(targetUrl) : currentBaseUrl;
  const rootUrl = urlToTest.replace(/\/api\/v1\/?$/, '');
  const healthEndpoint = `${rootUrl}/api/health`;
  const startTime = Date.now();

  try {
    const res = await axios.get(healthEndpoint, {
      timeout: 5000,
      headers: {
        'bypass-tunnel-reminder': 'true',
      },
    });
    const latency = Date.now() - startTime;
    if (res.status === 200) {
      return { ok: true, message: `Connected (${latency}ms)`, latency };
    }
    return { ok: false, message: `Server HTTP ${res.status}` };
  } catch (err: any) {
    // If /api/health failed, try /api/v1 directly
    try {
      await axios.get(urlToTest, {
        timeout: 4000,
        headers: { 'bypass-tunnel-reminder': 'true' },
      });
      return { ok: true, message: `Connected to API (${Date.now() - startTime}ms)` };
    } catch (innerErr: any) {
      if (innerErr?.response?.status) {
        return { ok: true, message: `Server reachable (${innerErr.response.status})` };
      }
      return {
        ok: false,
        message: err.message?.includes('Network Error')
          ? 'Network Error (Unreachable)'
          : err.message || 'Connection failed',
      };
    }
  }
};

const api = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const saved = await AsyncStorage.getItem('@carepulse_server_ip');
      const activeUrl = normalizeApiUrl(saved);
      config.baseURL = activeUrl;
      currentBaseUrl = activeUrl;

      const token = await AsyncStorage.getItem('@carepulse_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('[API Interceptor] Error setting baseURL / token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('@carepulse_token');
      await AsyncStorage.removeItem('@carepulse_user');
    }
    return Promise.reject(error);
  }
);

export default api;

