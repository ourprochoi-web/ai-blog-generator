'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setPassword('');
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Admin Login</h1>
          <p style={styles.loginSubtitle}>AI Daily Brief Dashboard</p>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={styles.input}
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.loginButton}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/articles', label: 'Articles', icon: '📝' },
    { href: '/admin/sources', label: 'Sources', icon: '📰' },
    { href: '/admin/pipeline', label: 'Pipeline', icon: '⚙️' },
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <Link href="/admin" style={styles.logo}>
            AI Daily Brief
          </Link>
          <span style={styles.badge}>Admin</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navItem,
                ...(pathname === item.href ? styles.navItemActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <Link href="/" style={styles.viewSiteLink}>
            View Site →
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #E5E7EB',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F3F4F6',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: 48,
    borderRadius: 12,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: 400,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center' as const,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  input: {
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    outline: 'none',
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    margin: 0,
  },
  loginButton: {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
  },
  sidebar: {
    width: 240,
    backgroundColor: '#1F2937',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    height: '100vh',
    left: 0,
    top: 0,
  },
  sidebarHeader: {
    padding: 20,
    borderBottom: '1px solid #374151',
  },
  logo: {
    fontSize: 18,
    fontWeight: 600,
    color: 'white',
    textDecoration: 'none',
    display: 'block',
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 6,
    color: '#D1D5DB',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  navItemActive: {
    backgroundColor: '#374151',
    color: 'white',
  },
  navIcon: {
    fontSize: 16,
  },
  sidebarFooter: {
    padding: 16,
    borderTop: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  viewSiteLink: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 6,
    textAlign: 'center' as const,
  },
  logoutButton: {
    padding: '8px 12px',
    fontSize: 13,
    color: '#9CA3AF',
    backgroundColor: 'transparent',
    border: '1px solid #374151',
    borderRadius: 6,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    marginLeft: 240,
    padding: 32,
  },
};
