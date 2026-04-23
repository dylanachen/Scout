import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  danger: string;
};

const lightPalette: Palette = {
  background: '#f6f8fb',
  surface: '#ffffff',
  surfaceAlt: '#e8ecf2',
  text: '#0f1623',
  textMuted: '#9aa0ae',
  border: '#e2e6ed',
  primary: '#1d6ecd',
  danger: '#dc2626',
};

const darkPalette: Palette = {
  background: '#0a1220',
  surface: '#111a28',
  surfaceAlt: '#1d2838',
  text: '#e6edf7',
  textMuted: '#93a2b8',
  border: '#2b3647',
  primary: '#66a3ff',
  danger: '#f87171',
};

type ThemeContextValue = {
  isDark: boolean;
  colors: Palette;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightPalette,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? darkPalette : lightPalette,
    }),
    [isDark],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
