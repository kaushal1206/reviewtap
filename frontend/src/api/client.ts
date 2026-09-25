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

export const api = axios.create({
  baseURL: '/api',
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
        const refreshResponse = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
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
