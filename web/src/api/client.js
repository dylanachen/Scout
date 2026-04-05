import axios from 'axios';
import { demoAdapter, isDemoMode } from './demoAdapter';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL,
  ...(isDemoMode() ? { adapter: demoAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
