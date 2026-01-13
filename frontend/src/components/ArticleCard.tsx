import Link from 'next/link';
import { Article, formatDate, calculateReadTime } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  variant?: 'hero' | 'medium' | 'compact';
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
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

export default function ArticleCard({
  article,
  featured = false,
  variant,
  onTagClick,
  onCategoryClick,
}: ArticleCardProps) {
  const category = getCategory(article.tags);
  const categoryStyle = getCategoryStyle(category);
  const readTime = calculateReadTime(article.word_count);
  const date = formatDate(article.created_at);

  // Medium card variant for magazine grid
  if (variant === 'medium') {
    return (
      <article
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'box-shadow 0.15s ease',
        }}
      >
        {/* Image */}
        {article.og_image_url && (
          <Link href={`/article/${article.slug}`}>
            <div
              style={{
                width: '100%',
                height: '160px',
                backgroundColor: '#F3F4F6',
                overflow: 'hidden',
              }}
            >
              <img
                src={article.og_image_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          </Link>
        )}

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Category & Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                onCategoryClick?.(category);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: categoryStyle.bg,
                color: categoryStyle.color,
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {category}
            </button>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{readTime}</span>
          </div>

          {/* Title */}
          <Link href={`/article/${article.slug}`} style={{ textDecoration: 'none', flex: 1 }}>
            <h3
              className="font-serif"
              style={{
                fontSize: '20px',
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
                  fontSize: '14px',
                  color: '#6B7280',
                  lineHeight: '1.5',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {article.subtitle}
              </p>
            )}
          </Link>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                marginTop: '12px',
              }}
            >
              {article.tags.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.preventDefault();
                    onTagClick?.(tag);
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#6B7280',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </article>
    );
  }

  if (featured) {
    return (
      <article style={{ marginBottom: '48px' }}>
        {/* Category & Date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => onCategoryClick?.(category)}
            style={{
              padding: '4px 10px',
              backgroundColor: categoryStyle.bg,
              color: categoryStyle.color,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {category}
          </button>
          <span
            style={{
              fontSize: '13px',
              color: '#6B7280',
            }}
          >
            {date} · {readTime}
          </span>
        </div>

        <Link href={`/article/${article.slug}`} style={{ textDecoration: 'none' }}>
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

        {/* Tags */}
        {article.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '16px',
            }}
          >
            {article.tags.slice(0, 4).map((tag) => (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: '#6B7280',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        )}
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
