'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem('admin-theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('admin-theme', theme);
      // Update document class for global CSS targeting if needed
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme colors for admin pages
export const adminTheme = {
  light: {
    background: '#F9FAFB',
    cardBg: '#FFFFFF',
    cardBorder: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    hover: '#F3F4F6',
    success: '#059669',
    successBg: '#D1FAE5',
    warning: '#D97706',
    warningBg: '#FEF3C7',
    error: '#DC2626',
    errorBg: '#FEE2E2',
    info: '#2563EB',
    infoBg: '#DBEAFE',
  },
  dark: {
    background: '#0F172A',
    cardBg: '#1E293B',
    cardBorder: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    hover: '#334155',
    success: '#10B981',
    successBg: '#064E3B',
    warning: '#F59E0B',
    warningBg: '#78350F',
    error: '#EF4444',
    errorBg: '#7F1D1D',
    info: '#3B82F6',
    infoBg: '#1E3A8A',
  },
};
