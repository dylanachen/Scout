import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
  DEMO_CLIENT_USER,
  DEMO_CREDENTIALS_PASSWORD,
  DEMO_FREELANCER_USER,
  DEMO_SESSION_KEY,
} from '../api/demoAdapter';

function isFixedDemoLogin(email, password) {
  const id = String(email ?? '').trim().toLowerCase();
  return (
    password === DEMO_CREDENTIALS_PASSWORD &&
    (id === DEMO_FREELANCER_USER || id === DEMO_CLIENT_USER)
  );
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await api.get('/auth/me');
    setUser(me.data);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('fos_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('fos_token');
        localStorage.removeItem(DEMO_SESSION_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    if (isFixedDemoLogin(email, password)) {
      localStorage.setItem(DEMO_SESSION_KEY, '1');
      const { data } = await api.post('/auth/login', { email: String(email).trim(), password });
      localStorage.setItem('fos_token', data.access_token ?? data.token);
      await refreshUser();
      return;
    }
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.removeItem(DEMO_SESSION_KEY);
    localStorage.setItem('fos_token', data.access_token ?? data.token);
    await refreshUser();
  };

  /** Backend: POST /auth/register { email, password, full_name?, role? } */
  const register = async ({ email, password, fullName, role }) => {
    await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
    });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('fos_token');
    localStorage.removeItem(DEMO_SESSION_KEY);
    setUser(null);
  };

  const forgotPassword = async (email) => {
    await api.post('/auth/forgot-password', { email });
  };

  const updateProfile = async (payload) => {
    const { data } = await api.patch('/auth/me', payload);
    setUser(data);
    return data;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const deleteAccount = async () => {
    await api.delete('/auth/me');
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        forgotPassword,
        updateProfile,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
