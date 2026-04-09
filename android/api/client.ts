import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoAdapter, shouldUseDemoAdapter } from './demoAdapter';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('fos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (await shouldUseDemoAdapter()) {
    config.adapter = demoAdapter;
  }
  return config;
});

export type MeUser = {
  id: number;
  email?: string;
  name?: string;
  role?: 'freelancer' | 'client';
  avatar_url?: string | null;
};

export const authApi = {
  register: (body: { email: string; password: string; full_name?: string; role?: string }) =>
    api.post('/auth/register', body),
  login: (email: string, password: string) =>
    api.post<{ access_token?: string; token?: string }>('/auth/login', { email, password }),
  me: () => api.get<MeUser>('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  patchMe: (body: { name?: string; email?: string; avatar_url?: string | null }) => api.patch<MeUser>('/auth/me', body),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', body),
  deleteMe: () => api.delete('/auth/me'),
};
