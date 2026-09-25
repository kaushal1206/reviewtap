import axios from 'axios';

let currentAccessToken: string | null = localStorage.getItem('reviewtap_token');

export const setStoredAccessToken = (token: string | null) => {
  currentAccessToken = token;
  if (token) {
    localStorage.setItem('reviewtap_token', token);
  } else {
    localStorage.removeItem('reviewtap_token');
  }
};

export const getStoredAccessToken = () => currentAccessToken;

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

/**
 * Helper to build full asset/download URLs (handles cross-origin Vercel -> Render)
 */
export const getApiAssetUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    // If API_BASE_URL is 'https://api.render.com/api', strip /api prefix from path if already included
    if (cleanPath.startsWith('/api/')) {
      return `${API_BASE_URL}${cleanPath.substring(4)}`;
    }
    return `${API_BASE_URL}${cleanPath}`;
  }
  return cleanPath;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token
api.interceptors.request.use((config) => {
  if (currentAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

// Response interceptor for automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const newToken = refreshResponse.data.data.accessToken;
        setStoredAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        setStoredAccessToken(null);
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);
