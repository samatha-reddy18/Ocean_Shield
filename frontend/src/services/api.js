import axios from 'axios';

// Base API client for the Express backend.
// Vite proxies /api to the backend during development, so the base URL can be empty.
const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach JWT to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('oceanshield_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally: expire session on 401 (except login/register)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        // Token expired or invalid — clear local session
        localStorage.removeItem('oceanshield_token');
        localStorage.removeItem('oceanshield_user');
        // Redirect to login if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper to extract a friendly error message
export function errorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'An unexpected error occurred. Please try again.'
  );
}

export default api;
