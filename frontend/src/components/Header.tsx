'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  initialEdition?: 'morning' | 'evening';
}

export default function Header({ initialEdition }: HeaderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get edition from URL or use initial edition
  const edition = (searchParams.get('edition') as 'morning' | 'evening') || initialEdition || 'morning';

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleEditionChange = (newEdition: 'morning' | 'evening') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('edition', newEdition);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <header
      style={{
        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div
        className="header-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            ⚡
          </div>
          <div className="header-logo-text">
            <h1
              className="font-serif"
              style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: 0,
                letterSpacing: '-0.5px',
                color: isDark ? '#F1F5F9' : '#1a1a1a',
              }}
            >
              AI Daily Brief
            </h1>
            <p
              style={{
                fontSize: '11px',
                color: isDark ? '#64748B' : '#888',
                margin: 0,
                letterSpacing: '0.5px',
              }}
            >
              Curated by AI, twice a day
            </p>
          </div>
        </Link>

        {/* Edition Toggle */}
        <div
          className="edition-toggle"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #334155 0%, #1E293B 100%)'
              : 'linear-gradient(135deg, #F5F5F4 0%, #E7E5E4 100%)',
            borderRadius: '28px',
            padding: '4px',
            boxShadow: isDark
              ? 'inset 0 1px 2px rgba(0, 0, 0, 0.3)'
              : 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <button
            className="edition-toggle-btn"
            onClick={() => handleEditionChange('morning')}
            style={{
              backgroundColor: edition === 'morning'
                ? (isDark ? '#475569' : '#FFFFFF')
                : 'transparent',
              color: edition === 'morning'
                ? (isDark ? '#F1F5F9' : '#1a1a1a')
                : (isDark ? '#64748B' : '#666'),
              boxShadow: edition === 'morning'
                ? (isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)')
                : 'none',
              transform: edition === 'morning' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              filter: edition === 'morning' ? 'none' : 'grayscale(50%)',
              transition: 'filter 0.2s ease',
            }}>☀️</span>
            <span className="edition-toggle-text">Morning</span>
          </button>
          <button
            className="edition-toggle-btn"
            onClick={() => handleEditionChange('evening')}
            style={{
              backgroundColor: edition === 'evening'
                ? (isDark ? '#475569' : '#FFFFFF')
                : 'transparent',
              color: edition === 'evening'
                ? (isDark ? '#F1F5F9' : '#1a1a1a')
                : (isDark ? '#64748B' : '#666'),
              boxShadow: edition === 'evening'
                ? (isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)')
                : 'none',
              transform: edition === 'evening' ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              filter: edition === 'evening' ? 'none' : 'grayscale(50%)',
              transition: 'filter 0.2s ease',
            }}>🌙</span>
            <span className="edition-toggle-text">Evening</span>
          </button>
        </div>

        {/* Right side: Theme Toggle + Archive + Subscribe (Desktop) */}
        <div className="header-right">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</span>
          </button>
          <Link
            href="/archive"
            className="header-archive"
            style={{
              fontSize: '14px',
              color: isDark ? '#94A3B8' : '#6B7280',
              textDecoration: 'none',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#F3F4F6';
              e.currentTarget.style.color = isDark ? '#F1F5F9' : '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDark ? '#94A3B8' : '#6B7280';
            }}
          >
            Archive
          </Link>
          <button
            className="header-subscribe"
            style={{
              padding: '10px 20px',
              background: isDark
                ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                : 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: isDark
                ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isDark
                ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
          >
            Subscribe
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMobileMenuOpen}
          style={{
            display: 'none',
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: isMobileMenuOpen
              ? (isDark ? '#334155' : '#F3F4F6')
              : 'transparent',
            border: 'none',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 5,
            padding: 8,
            transition: 'background-color 0.2s ease',
          }}
        >
          <span
            style={{
              display: 'block',
              width: 20,
              height: 2,
              backgroundColor: isDark ? '#F1F5F9' : '#1a1a1a',
              borderRadius: 1,
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              transform: isMobileMenuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 20,
              height: 2,
              backgroundColor: isDark ? '#F1F5F9' : '#1a1a1a',
              borderRadius: 1,
              transition: 'opacity 0.3s ease',
              opacity: isMobileMenuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 20,
              height: 2,
              backgroundColor: isDark ? '#F1F5F9' : '#1a1a1a',
              borderRadius: 1,
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              transform: isMobileMenuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
            }}
          />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: 'fixed',
            top: 73,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              gap: 8,
            }}
          >
            {/* Dark mode toggle in mobile */}
            <button
              onClick={toggleTheme}
              style={{
                fontSize: 18,
                color: isDark ? '#F1F5F9' : '#1a1a1a',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '16px',
                borderRadius: 12,
                backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background-color 0.2s ease',
              }}
            >
              <span style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</span>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <Link
              href="/archive"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                fontSize: 18,
                color: isDark ? '#F1F5F9' : '#1a1a1a',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '16px',
                borderRadius: 12,
                backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                transition: 'background-color 0.2s ease',
              }}
            >
              📚 Archive
            </Link>
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                fontSize: 18,
                color: isDark ? '#F1F5F9' : '#1a1a1a',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '16px',
                borderRadius: 12,
                backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                transition: 'background-color 0.2s ease',
              }}
            >
              ⚙️ Admin
            </Link>
            <div style={{ height: 1, backgroundColor: isDark ? '#334155' : '#E5E7EB', margin: '8px 0' }} />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                fontSize: 18,
                color: '#fff',
                fontWeight: '600',
                padding: '16px',
                borderRadius: 12,
                background: isDark
                  ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                  : 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isDark
                  ? '0 4px 12px rgba(59, 130, 246, 0.3)'
                  : '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              Subscribe
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
