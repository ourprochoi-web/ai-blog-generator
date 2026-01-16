'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8 }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

// Article Card Skeleton
export function ArticleCardSkeleton({ variant = 'medium' }: { variant?: 'hero' | 'medium' | 'compact' }) {
  if (variant === 'hero') {
    return (
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Skeleton width={80} height={24} borderRadius={4} />
          <Skeleton width={120} height={20} borderRadius={4} />
        </div>
        <Skeleton width="100%" height={48} borderRadius={8} />
        <div style={{ marginTop: 12 }}>
          <Skeleton width="90%" height={24} borderRadius={6} />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={80} height={32} borderRadius={16} />
          <Skeleton width={80} height={32} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (variant === 'medium') {
    return (
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        {/* Image placeholder */}
        <Skeleton width="100%" height={160} borderRadius={0} />

        <div style={{ padding: 20 }}>
          {/* Category & Meta */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Skeleton width={70} height={22} borderRadius={4} />
            <Skeleton width={50} height={20} borderRadius={4} />
          </div>

          {/* Title */}
          <Skeleton width="100%" height={24} borderRadius={6} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width="85%" height={20} borderRadius={6} />
          </div>

          {/* Subtitle */}
          <div style={{ marginTop: 12 }}>
            <Skeleton width="100%" height={16} borderRadius={4} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width="70%" height={16} borderRadius={4} />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            <Skeleton width={60} height={24} borderRadius={12} />
            <Skeleton width={70} height={24} borderRadius={12} />
            <Skeleton width={50} height={24} borderRadius={12} />
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid #E5E7EB' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Skeleton width={60} height={16} borderRadius={4} />
        <Skeleton width={50} height={16} borderRadius={4} />
      </div>
      <Skeleton width="100%" height={28} borderRadius={6} />
      <div style={{ marginTop: 8 }}>
        <Skeleton width="80%" height={20} borderRadius={4} />
      </div>
    </div>
  );
}

// Grid of skeletons for loading state
export function ArticleGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="articles-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 24,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} variant="medium" />
      ))}
    </div>
  );
}

// Article detail page skeleton
export function ArticleDetailSkeleton() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
      {/* Back button */}
      <Skeleton width={150} height={20} borderRadius={4} />

      {/* Header */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <Skeleton width={80} height={24} borderRadius={4} />
          <Skeleton width={100} height={20} borderRadius={4} />
        </div>

        {/* Title */}
        <Skeleton width="100%" height={48} borderRadius={8} />
        <div style={{ marginTop: 12 }}>
          <Skeleton width="80%" height={48} borderRadius={8} />
        </div>

        {/* Subtitle */}
        <div style={{ marginTop: 20 }}>
          <Skeleton width="100%" height={24} borderRadius={6} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width="60%" height={24} borderRadius={6} />
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div style={{ marginTop: 40, marginBottom: 40 }}>
        <Skeleton width="100%" height={300} borderRadius={12} />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton width="100%" height={20} borderRadius={4} />
        <Skeleton width="95%" height={20} borderRadius={4} />
        <Skeleton width="100%" height={20} borderRadius={4} />
        <Skeleton width="88%" height={20} borderRadius={4} />
        <div style={{ marginTop: 24 }}>
          <Skeleton width="40%" height={32} borderRadius={6} />
        </div>
        <Skeleton width="100%" height={20} borderRadius={4} />
        <Skeleton width="92%" height={20} borderRadius={4} />
        <Skeleton width="100%" height={20} borderRadius={4} />
        <Skeleton width="75%" height={20} borderRadius={4} />
      </div>

      {/* Tags */}
      <div style={{ marginTop: 48, display: 'flex', gap: 8 }}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={70} height={32} borderRadius={16} />
      </div>
    </div>
  );
}
