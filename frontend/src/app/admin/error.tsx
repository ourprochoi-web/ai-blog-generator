'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>⚠️</div>
        <h2 style={styles.title}>Something went wrong</h2>
        <p style={styles.message}>
          {error.message || 'An unexpected error occurred'}
        </p>
        <div style={styles.actions}>
          <button onClick={reset} style={styles.retryButton}>
            Try again
          </button>
          <a href="/admin" style={styles.homeLink}>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  content: {
    textAlign: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: 400,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  retryButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  homeLink: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    textDecoration: 'none',
  },
};
