import axios from 'axios';
import { demoAdapter, shouldUseDemoAdapter } from './demoAdapter';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scout_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (shouldUseDemoAdapter()) {
    config.adapter = demoAdapter;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    window.dispatchEvent(
      new CustomEvent('scout-toast', {
        detail: {
          type: 'error',
          message: error?.response?.data?.detail || error?.message || 'Request failed',
        },
      }),
    );
    return Promise.reject(error);
  },
);
