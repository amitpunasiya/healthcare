import axios from 'axios';

export const getAdminApiBaseUrl = () => {
  const envMeta = (import.meta as any).env;
  if (envMeta && envMeta.VITE_API_BASE_URL) {
    return envMeta.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:5000/api/v1`;
  }
  return 'http://localhost:5000/api/v1';
};

const adminApi = axios.create({
  baseURL: getAdminApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin_unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
