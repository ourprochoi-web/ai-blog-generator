'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface HeaderProps {
  initialEdition?: 'morning' | 'evening';
}

export default function Header({ initialEdition }: HeaderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

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
        borderBottom: '1px solid #E8E8E6',
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 100,
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
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
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
        <div className="edition-toggle">
          <button
            className="edition-toggle-btn"
            onClick={() => handleEditionChange('morning')}
            style={{
              backgroundColor: edition === 'morning' ? '#1a1a1a' : 'transparent',
              color: edition === 'morning' ? '#fff' : '#666',
            }}
          >
            <span>☀️</span>
            <span className="edition-toggle-text">Morning</span>
          </button>
          <button
            className="edition-toggle-btn"
            onClick={() => handleEditionChange('evening')}
            style={{
              backgroundColor: edition === 'evening' ? '#1a1a1a' : 'transparent',
              color: edition === 'evening' ? '#fff' : '#666',
            }}
          >
            <span>🌙</span>
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
            }}
          >
            Archive
          </Link>
          <button
            className="header-subscribe"
            style={{
              padding: '10px 20px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Subscribe
          </button>
        </div>
      </div>
    </header>
  );
}
