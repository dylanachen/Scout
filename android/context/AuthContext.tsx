import React, { createContext, useContext } from 'react';

type AuthContextValue = {
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, signOut }: { children: React.ReactNode; signOut: () => Promise<void> }) {
  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
