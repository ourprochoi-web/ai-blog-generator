'use client';

import { useState } from 'react';

interface FilterBarProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  activeTag: string | null;
  onTagClear: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CATEGORIES = [
  { id: null, label: 'All' },
  { id: 'Breakthrough', label: 'Breakthrough', bg: '#FEF3C7', color: '#92400E' },
  { id: 'Industry', label: 'Industry', bg: '#DBEAFE', color: '#1E40AF' },
  { id: 'Research', label: 'Research', bg: '#D1FAE5', color: '#065F46' },
  { id: 'Regulation', label: 'Regulation', bg: '#FCE7F3', color: '#9D174D' },
];

export default function FilterBar({
  activeCategory,
  onCategoryChange,
  activeTag,
  onTagClear,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 0',
        marginBottom: '24px',
        borderBottom: '1px solid #E5E7EB',
        flexWrap: 'wrap',
      }}
    >
      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id || 'all'}
              onClick={() => onCategoryChange(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: isActive ? 'none' : '1px solid #E5E7EB',
                backgroundColor: isActive
                  ? cat.bg || '#1a1a1a'
                  : '#fff',
                color: isActive
                  ? cat.color || '#fff'
                  : '#6B7280',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Right side: Active Tag + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Active Tag Badge */}
        {activeTag && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F3F4F6',
              borderRadius: '16px',
              fontSize: '13px',
              color: '#374151',
            }}
          >
            <span>#{activeTag}</span>
            <button
              onClick={onTagClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#9CA3AF',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Search */}
        {searchOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search articles..."
              autoFocus
              style={{
                padding: '8px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                width: '180px',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                  onSearchChange('');
                }
              }}
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                onSearchChange('');
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#9CA3AF',
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              background: 'none',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#6B7280',
              fontSize: '13px',
            }}
          >
            <span style={{ fontSize: '14px' }}>🔍</span>
            Search
          </button>
        )}
      </div>
    </div>
  );
}
