'use client';

import { useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { Article, formatDate, calculateReadTime } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EditionSectionProps {
  edition: 'morning' | 'evening';
  articles: Article[];
  isLatest: boolean;
  defaultExpanded?: boolean;
}

export default function EditionSection({
  edition,
  articles,
  isLatest,
  defaultExpanded = false,
}: EditionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(isLatest || defaultExpanded);

  if (articles.length === 0) return null;

  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1);

  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Breakthrough: { bg: '#FEF3C7', color: '#92400E' },
      Industry: { bg: '#DBEAFE', color: '#1E40AF' },
      Regulation: { bg: '#FCE7F3', color: '#9D174D' },
      Research: { bg: '#D1FAE5', color: '#065F46' },
    };
    return styles[category] || { bg: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' };
  };

  const featuredCategory = featuredArticle.tags[0]?.replace('#', '') || 'AI News';
  const featuredCategoryStyle = getCategoryStyle(featuredCategory);
  const featuredDate = formatDate(featuredArticle.created_at);
  const featuredReadTime = calculateReadTime(featuredArticle.word_count);

  const editionIcon = edition === 'morning' ? '☀️' : '🌙';
  const editionLabel = edition === 'morning' ? 'Morning Edition' : 'Evening Edition';
  const editionColor = edition === 'morning' ? '#F59E0B' : '#6366F1';
  const editionBgColor = edition === 'morning' ? '#FEF3C7' : '#E0E7FF';

  return (
    <section style={{ marginBottom: isLatest ? 0 : 32 }}>
      {/* Edition Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: isLatest ? editionBgColor : 'var(--color-bg-tertiary)',
          border: 'none',
          borderRadius: '12px',
          cursor: isLatest ? 'default' : 'pointer',
          marginBottom: isExpanded ? 24 : 0,
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{editionIcon}</span>
          <div style={{ textAlign: 'left' }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: isLatest ? '#111827' : 'var(--color-text)',
                margin: 0,
              }}
            >
              {editionLabel}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: isLatest ? '#6B7280' : 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              {articles.length} {articles.length === 1 ? 'story' : 'stories'}
              {isLatest && ' • Latest'}
            </p>
          </div>
        </div>
        {!isLatest && (
          <span
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              padding: '6px 12px',
              backgroundColor: 'var(--color-card-bg)',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
        )}
      </button>

      {/* Edition Content */}
      {isExpanded && (
        <div>
          {/* Featured Article - Full Content */}
          <article style={{ marginBottom: otherArticles.length > 0 ? 32 : 0 }}>
            {/* Category & Date */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  backgroundColor: featuredCategoryStyle.bg,
                  color: featuredCategoryStyle.color,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {featuredCategory}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-muted)',
                }}
              >
                {featuredDate} · {featuredReadTime}
              </span>
            </div>

            {/* Title */}
            <h1
              className="font-serif"
              style={{
                fontSize: '42px',
                fontWeight: '400',
                lineHeight: '1.2',
                marginBottom: '20px',
                letterSpacing: '-1px',
                color: 'var(--color-text)',
              }}
            >
              {featuredArticle.title}
            </h1>

            {/* Subtitle */}
            {featuredArticle.subtitle && (
              <p
                style={{
                  fontSize: '20px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.5',
                  fontWeight: '300',
                  marginBottom: '32px',
                }}
              >
                {featuredArticle.subtitle}
              </p>
            )}

            {/* Divider before content */}
            <div
              style={{
                height: '1px',
                backgroundColor: 'var(--color-border)',
                margin: '0 0 32px 0',
              }}
            />

            {/* Hero Image */}
            {featuredArticle.og_image_url && (
              <div
                style={{
                  marginBottom: '32px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={featuredArticle.og_image_url}
                  alt={featuredArticle.title}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            )}

            {/* Full Article Content */}
            <div className="article-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{featuredArticle.content}</ReactMarkdown>
            </div>

            {/* Tags */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '48px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              {featuredArticle.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* References */}
            {featuredArticle.references.length > 0 && (
              <div
                style={{
                  marginTop: '32px',
                  padding: '24px',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '12px',
                }}
              >
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--color-text-muted)',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  References
                </h4>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                  }}
                >
                  {featuredArticle.references.map((ref, index) => (
                    <li
                      key={index}
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '8px',
                      }}
                    >
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-link)', textDecoration: 'none' }}
                      >
                        {ref.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>

          {/* Other articles in this edition */}
          {otherArticles.length > 0 && (
            <>
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--color-border)',
                  margin: '32px 0',
                }}
              />
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}
              >
                Also in {editionLabel.toLowerCase()}
              </h3>
              {otherArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
