'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [edition, setEdition] = useState<'morning' | 'evening'>('morning');

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
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          <div>
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
          style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: '#F5F5F4',
            borderRadius: '24px',
          }}
        >
          <button
            onClick={() => setEdition('morning')}
            style={{
              padding: '8px 16px',
              backgroundColor: edition === 'morning' ? '#1a1a1a' : 'transparent',
              color: edition === 'morning' ? '#fff' : '#666',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>☀️</span> Morning
          </button>
          <button
            onClick={() => setEdition('evening')}
            style={{
              padding: '8px 16px',
              backgroundColor: edition === 'evening' ? '#1a1a1a' : 'transparent',
              color: edition === 'evening' ? '#fff' : '#666',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🌙</span> Evening
          </button>
        </div>

        {/* Right side: Archive + Subscribe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/archive"
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
            style={{
              padding: '10px 20px',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Subscribe
          </button>
        </div>
      </div>
    </header>
  );
}
