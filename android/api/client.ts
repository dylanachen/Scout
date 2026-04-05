import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoAdapter, isDemoMode } from './demoAdapter';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export const api = axios.create({
  baseURL,
  ...(isDemoMode() ? { adapter: demoAdapter } : {}),
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('fos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (email: string, password: string) => api.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post<{ access_token?: string; token?: string }>('/auth/login', { email, password }),
  me: () => api.get<{ id: number; email?: string; name?: string }>('/auth/me'),
};
