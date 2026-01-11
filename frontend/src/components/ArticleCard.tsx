import Link from 'next/link';
import { Article, formatDate, calculateReadTime } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

// Get category from tags or default
function getCategory(tags: string[]): string {
  if (tags.length > 0) {
    return tags[0].replace('#', '');
  }
  return 'AI News';
}

// Category color mapping
function getCategoryStyle(category: string): { bg: string; color: string } {
  const categoryMap: Record<string, { bg: string; color: string }> = {
    Breakthrough: { bg: '#FEF3C7', color: '#92400E' },
    Industry: { bg: '#DBEAFE', color: '#1E40AF' },
    Regulation: { bg: '#FCE7F3', color: '#9D174D' },
    Research: { bg: '#D1FAE5', color: '#065F46' },
    Default: { bg: '#F3F4F6', color: '#374151' },
  };
  return categoryMap[category] || categoryMap.Default;
}

export default function ArticleCard({ article, featured = false }: ArticleCardProps) {
  const category = getCategory(article.tags);
  const categoryStyle = getCategoryStyle(category);
  const readTime = calculateReadTime(article.word_count);
  const date = formatDate(article.created_at);

  if (featured) {
    return (
      <article style={{ marginBottom: '48px' }}>
        <Link href={`/article/${article.slug}`} style={{ textDecoration: 'none' }}>
          {/* Category & Date */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: categoryStyle.bg,
                color: categoryStyle.color,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {category}
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              {date} · {readTime}
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-serif"
            style={{
              fontSize: '36px',
              fontWeight: '400',
              lineHeight: '1.25',
              marginBottom: '16px',
              letterSpacing: '-0.5px',
              color: '#1a1a1a',
            }}
          >
            {article.title}
          </h2>

          {/* Subtitle */}
          {article.subtitle && (
            <p
              style={{
                fontSize: '18px',
                color: '#4B5563',
                lineHeight: '1.6',
                margin: 0,
                fontWeight: '400',
              }}
            >
              {article.subtitle}
            </p>
          )}

          {/* Read More */}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1a1a1a',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Read full analysis
            <span style={{ fontSize: '18px' }}>→</span>
          </div>
        </Link>
      </article>
    );
  }

  // Regular card
  return (
    <article
      style={{
        padding: '24px 0',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <Link href={`/article/${article.slug}`} style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            {category}
          </span>
          <span style={{ color: '#D1D5DB' }}>·</span>
          <span
            style={{
              fontSize: '12px',
              color: '#6B7280',
            }}
          >
            {readTime}
          </span>
        </div>

        <h3
          className="font-serif"
          style={{
            fontSize: '22px',
            fontWeight: '400',
            lineHeight: '1.3',
            marginBottom: '8px',
            color: '#1a1a1a',
          }}
        >
          {article.title}
        </h3>

        {article.subtitle && (
          <p
            style={{
              fontSize: '15px',
              color: '#6B7280',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            {article.subtitle}
          </p>
        )}
      </Link>
    </article>
  );
}
