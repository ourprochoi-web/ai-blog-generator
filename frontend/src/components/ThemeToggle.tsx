'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export default function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 8,
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#9CA3AF',
        cursor: 'pointer',
        fontSize: 13,
        transition: 'all 0.2s ease',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          backgroundColor: isDark ? '#3B82F6' : 'rgba(255, 255, 255, 0.2)',
          position: 'relative',
          transition: 'background-color 0.3s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: isDark ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'white',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
      <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  );
}
