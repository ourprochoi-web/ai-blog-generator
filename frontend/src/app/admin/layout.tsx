'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme, adminTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const { theme, isDark } = useTheme();
  const colors = adminTheme[theme];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <div style={styles.loginHeader}>
            <div style={styles.loginIcon}>⚡</div>
            <h1 style={styles.loginTitle}>Admin Login</h1>
            <p style={styles.loginSubtitle}>AI Daily Brief Dashboard</p>
          </div>

          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.inputWrapper}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={styles.input}
                autoFocus
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.loginButton}>
              Sign In
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
      {/* Mobile Header */}
      {isMobile && (
        <header style={styles.mobileHeader}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={styles.hamburgerButton}
            aria-label="Toggle menu"
          >
            <div style={{
              ...styles.hamburgerLine,
              transform: isMobileMenuOpen ? 'rotate(45deg) translateY(6px)' : 'none',
            }} />
            <div style={{
              ...styles.hamburgerLine,
              opacity: isMobileMenuOpen ? 0 : 1,
            }} />
            <div style={{
              ...styles.hamburgerLine,
              transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-6px)' : 'none',
            }} />
          </button>
          <span style={styles.mobileTitle}>AI Daily Brief</span>
          <span style={styles.mobileBadge}>Admin</span>
        </header>
      )}

      {/* Backdrop for mobile */}
      {isMobile && isMobileMenuOpen && (
        <div
          style={styles.backdrop}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile ? {
            transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isMobileMenuOpen ? '4px 0 20px rgba(0, 0, 0, 0.3)' : 'none',
          } : {}),
        }}
      >
        <div style={styles.sidebarHeader}>
          <Link href="/admin" style={styles.logo}>
            <span style={styles.logoIcon}>⚡</span>
            AI Daily Brief
          </Link>
          <span style={styles.badge}>Admin</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span style={styles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <ThemeToggle />
          <Link href="/" style={styles.viewSiteLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View Site
          </Link>
          <button onClick={handleLogout} style={styles.logoutButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        ...styles.main,
        backgroundColor: colors.background,
        ...(isMobile ? { marginLeft: 0, paddingTop: 80 } : {}),
      }}>
        {children}
      </main>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
    padding: 20,
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '48px 40px',
    borderRadius: 20,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: 400,
  },
  loginHeader: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  loginIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    margin: '0 auto 20px',
    boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    margin: 0,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  inputWrapper: {
    position: 'relative' as const,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 16,
    border: '2px solid #E5E7EB',
    borderRadius: 12,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  error: {
    color: '#DC2626',
    fontSize: 14,
    margin: 0,
    padding: '8px 12px',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  loginButton: {
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
  },
  mobileHeader: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#1F2937',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
    transition: 'all 0.3s ease',
  },
  mobileTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 600,
    flex: 1,
  },
  mobileBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: '4px 8px',
    borderRadius: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 150,
    animation: 'fadeIn 0.3s ease',
  },
  sidebar: {
    width: 260,
    background: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    height: '100vh',
    left: 0,
    top: 0,
    zIndex: 200,
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'white',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3B82F6',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginLeft: 42,
  },
  nav: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 10,
    color: '#9CA3AF',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#60A5FA',
  },
  navIcon: {
    fontSize: 18,
  },
  activeIndicator: {
    position: 'absolute' as const,
    right: 12,
    width: 6,
    height: 6,
    backgroundColor: '#3B82F6',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
  },
  sidebarFooter: {
    padding: 16,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  viewSiteLink: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecoration: 'none',
    padding: '10px 16px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'background-color 0.2s',
  },
  logoutButton: {
    padding: '10px 16px',
    fontSize: 13,
    color: '#9CA3AF',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    marginLeft: 260,
    padding: 32,
    minHeight: '100vh',
  },
};

// Wrapper component with ThemeProvider
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ThemeProvider>
  );
}
