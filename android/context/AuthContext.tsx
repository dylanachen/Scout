import React, { createContext, useContext } from 'react';
import type { MeUser } from '../api/client';

type AuthContextValue = {
  signOut: () => Promise<void>;
  user: MeUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  signOut,
  user,
}: {
  children: React.ReactNode;
  signOut: () => Promise<void>;
  user: MeUser | null;
}) {
  return <AuthContext.Provider value={{ signOut, user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
