'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article, formatDate, calculateReadTime } from '@/lib/api';

// Placeholder image component with gradient background
function ImagePlaceholder({ category }: { category: string }) {
  // Generate gradient based on category
  const getGradient = (cat: string) => {
    const gradients: Record<string, string> = {
      Innovation: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      Business: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      Analysis: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)',
      Research: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
      Default: 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
    };
    return gradients[cat] || gradients.Default;
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: getGradient(category),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Decorative pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {/* AI icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        ⚡
      </div>
    </div>
  );
}

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
    Innovation: { bg: '#FEF3C7', color: '#92400E' },
    Business: { bg: '#DBEAFE', color: '#1E40AF' },
    Analysis: { bg: '#FCE7F3', color: '#9D174D' },
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

  const [isHovered, setIsHovered] = useState(false);

  // Medium card variant for magazine grid
  if (variant === 'medium') {
    return (
      <article
        className="article-card-medium"
        aria-label={`${article.title} - ${category} - ${readTime}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: 'var(--color-card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered
            ? '0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)'
            : '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Image */}
        <Link href={`/article/${article.slug}`}>
          <div
            className="article-card-image"
            style={{
              width: '100%',
              backgroundColor: 'var(--color-bg-tertiary)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {article.og_image_url ? (
              <Image
                src={article.og_image_url}
                alt={article.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{
                  objectFit: 'cover',
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
              />
            ) : (
              <ImagePlaceholder category={category} />
            )}
            {/* Gradient overlay on hover */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.1))',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>
        </Link>

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
            <span style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{readTime}</span>
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
                color: 'var(--color-text)',
              }}
            >
              {article.title}
            </h3>

            {article.subtitle && (
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text-muted)',
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
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
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
      <article
        aria-label={`Featured: ${article.title} - ${category} - ${readTime}`}
        style={{ marginBottom: '48px' }}
      >
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
              color: 'var(--color-text-muted)',
            }}
          >
            {date} · {readTime}
          </span>
        </div>

        <Link href={`/article/${article.slug}`} style={{ textDecoration: 'none' }}>
          {/* Title */}
          <h2
            className="font-serif featured-title"
            style={{
              fontWeight: '400',
              lineHeight: '1.25',
              marginBottom: '16px',
              letterSpacing: '-0.5px',
              color: 'var(--color-text)',
            }}
          >
            {article.title}
          </h2>

          {/* Subtitle */}
          {article.subtitle && (
            <p
              className="featured-subtitle"
              style={{
                color: 'var(--color-text-secondary)',
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
              color: 'var(--color-text)',
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
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
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
      aria-label={`${article.title} - ${category} - ${readTime}`}
      style={{
        padding: '24px 0',
        borderBottom: '1px solid var(--color-border)',
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
              color: 'var(--color-text-muted)',
            }}
          >
            {category}
          </span>
          <span style={{ color: 'var(--color-text-light)' }}>·</span>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
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
            color: 'var(--color-text)',
          }}
        >
          {article.title}
        </h3>

        {article.subtitle && (
          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-text-muted)',
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
