'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface HeaderProps {
  initialEdition?: 'morning' | 'evening';
}

export default function Header({ initialEdition }: HeaderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // Get edition from URL or use initial edition
  const edition = (searchParams.get('edition') as 'morning' | 'evening') || initialEdition || 'morning';

  const handleEditionChange = (newEdition: 'morning' | 'evening') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('edition', newEdition);
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <header
      style={{
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'box-shadow 0.3s ease',
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
                color: '#1a1a1a',
              }}
            >
              AI Daily Brief
            </h1>
            <p
              style={{
                fontSize: '11px',
                color: '#888',
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
            background: 'linear-gradient(135deg, #F5F5F4 0%, #E7E5E4 100%)',
            borderRadius: '28px',
            padding: '4px',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <button
            className="edition-toggle-btn"
            onClick={() => handleEditionChange('morning')}
            style={{
              backgroundColor: edition === 'morning' ? '#FFFFFF' : 'transparent',
              color: edition === 'morning' ? '#1a1a1a' : '#666',
              boxShadow: edition === 'morning' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
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
              backgroundColor: edition === 'evening' ? '#FFFFFF' : 'transparent',
              color: edition === 'evening' ? '#1a1a1a' : '#666',
              boxShadow: edition === 'evening' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
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

        {/* Right side: Archive + Subscribe */}
        <div className="header-right">
          <Link
            href="/archive"
            className="header-archive"
            style={{
              fontSize: '14px',
              color: '#6B7280',
              textDecoration: 'none',
              fontWeight: '500',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            Archive
          </Link>
          <button
            className="header-subscribe"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
          >
            Subscribe
          </button>
        </div>
      </div>
    </header>
  );
}
