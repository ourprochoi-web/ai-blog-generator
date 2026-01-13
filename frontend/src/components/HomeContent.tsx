'use client';

import { Suspense, useMemo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import NewsletterCTA from '@/components/NewsletterCTA';
import DateNavigation from '@/components/DateNavigation';
import ArticleCard from '@/components/ArticleCard';
import FilterBar from '@/components/FilterBar';
import { Article } from '@/lib/api';

interface SourceStats {
  total: number;
  by_type: { news: number; paper: number; article: number };
  today_count: number;
}

interface HomeContentProps {
  morningArticles: Article[];
  eveningArticles: Article[];
  noEditionArticles: Article[];
  sourceStats: SourceStats;
  archiveDates: string[];
  initialEdition: 'morning' | 'evening';
  today: string;
  yesterday: string;
  hasYesterday: boolean;
}

// Helper to get category from tags
function getCategory(tags: string[]): string {
  const validCategories = ['Innovation', 'Business', 'Analysis', 'Research'];
  for (const tag of tags) {
    const cleanTag = tag.replace('#', '');
    if (validCategories.includes(cleanTag)) {
      return cleanTag;
    }
  }
  return '';
}

function HomeContentInner({
  morningArticles,
  eveningArticles,
  noEditionArticles,
  sourceStats,
  archiveDates,
  initialEdition,
  today,
  yesterday,
  hasYesterday,
}: HomeContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Get edition from URL or use initial
  const edition = (searchParams.get('edition') as 'morning' | 'evening') || initialEdition;

  // Get filters from URL
  const activeCategory = searchParams.get('category');
  const activeTag = searchParams.get('tag');

  // Get articles for current edition
  const currentArticles = edition === 'morning' ? morningArticles : eveningArticles;
  const otherEdition = edition === 'morning' ? 'evening' : 'morning';
  const otherArticles = edition === 'morning' ? eveningArticles : morningArticles;

  // If no articles in either edition, show no-edition articles
  const baseArticles =
    currentArticles.length > 0
      ? currentArticles
      : noEditionArticles.length > 0
        ? noEditionArticles
        : [];

  // Apply filters
  const displayArticles = useMemo(() => {
    let filtered = baseArticles;

    // Category filter
    if (activeCategory) {
      filtered = filtered.filter((article) => {
        const category = getCategory(article.tags);
        return category === activeCategory;
      });
    }

    // Tag filter
    if (activeTag) {
      filtered = filtered.filter((article) =>
        article.tags.some((t) => t.replace('#', '').toLowerCase() === activeTag.toLowerCase())
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          (article.subtitle?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [baseArticles, activeCategory, activeTag, searchQuery]);

  // Filter handlers
  const handleCategoryChange = useCallback(
    (category: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (category) {
        params.set('category', category);
      } else {
        params.delete('category');
      }
      params.delete('tag'); // Clear tag when changing category
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleTagClick = useCallback(
    (tag: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tag', tag.replace('#', ''));
      params.delete('category'); // Clear category when clicking tag
      router.push(`/?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handleTagClear = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tag');
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleCategoryClick = useCallback(
    (category: string) => {
      handleCategoryChange(category);
    },
    [handleCategoryChange]
  );

  const featuredArticle = displayArticles[0];
  const otherDisplayArticles = displayArticles.slice(1);

  const editionLabel = edition === 'morning' ? 'Morning Edition' : 'Evening Edition';
  const editionIcon = edition === 'morning' ? '☀️' : '🌙';

  // Check if any filter is active
  const hasActiveFilter = activeCategory || activeTag || searchQuery.trim();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header initialEdition={initialEdition} />

      <main
        style={{
          flex: 1,
          backgroundColor: '#FAFAF9',
        }}
      >
        <div
          className="main-content"
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          {/* Date Navigation - Always show */}
          <DateNavigation
            currentDate={today}
            previousDate={hasYesterday ? yesterday : undefined}
            archiveDates={archiveDates}
          />

          {/* AI Insight Box */}
          <AIInsightBox
            totalSources={sourceStats.total}
            newsSources={sourceStats.by_type.news}
            paperSources={sourceStats.by_type.paper}
            articleSources={sourceStats.by_type.article}
            storiesSelected={morningArticles.length + eveningArticles.length + noEditionArticles.length}
            edition={edition}
          />

          {/* Edition Header */}
          <div
            className="edition-header"
            style={{
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: '2px solid #1a1a1a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="edition-header-icon">{editionIcon}</span>
              <div>
                <h2
                  className="font-serif edition-header-title"
                  style={{
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: 0,
                  }}
                >
                  {editionLabel}
                </h2>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                  {hasActiveFilter
                    ? `${displayArticles.length} of ${baseArticles.length} stories`
                    : `${displayArticles.length} ${displayArticles.length === 1 ? 'story' : 'stories'}`}
                </p>
              </div>
            </div>

            {/* Other edition link */}
            {otherArticles.length > 0 && (
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('edition', otherEdition);
                  router.push(`/?${params.toString()}`, { scroll: false });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#F3F4F6',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 13,
                  color: '#4B5563',
                  cursor: 'pointer',
                }}
              >
                <span>{otherEdition === 'morning' ? '☀️' : '🌙'}</span>
                {otherArticles.length} in {otherEdition}
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <FilterBar
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            activeTag={activeTag}
            onTagClear={handleTagClear}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Articles Grid */}
          {displayArticles.length > 0 ? (
            <div>
              {/* Featured Article */}
              {featuredArticle && (
                <ArticleCard
                  article={featuredArticle}
                  featured={true}
                  onTagClick={handleTagClick}
                  onCategoryClick={handleCategoryClick}
                />
              )}

              {/* Magazine Grid */}
              {otherDisplayArticles.length > 0 && (
                <>
                  <div
                    style={{
                      height: 1,
                      backgroundColor: '#E5E7EB',
                      margin: '32px 0 24px 0',
                    }}
                  />

                  <h3
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      marginBottom: 16,
                    }}
                  >
                    More stories
                  </h3>

                  <div className="articles-grid">
                    {otherDisplayArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        variant="medium"
                        onTagClick={handleTagClick}
                        onCategoryClick={handleCategoryClick}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                backgroundColor: '#fff',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
              }}
            >
              {hasActiveFilter ? (
                <>
                  <p style={{ fontSize: 18, marginBottom: 8, color: '#374151' }}>No stories match your filters</p>
                  <p style={{ fontSize: 14, marginBottom: 16, color: '#6B7280' }}>Try adjusting your search or category filter</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {edition === 'morning' ? '🌅' : '🌙'}
                  </div>
                  <p style={{ fontSize: 18, marginBottom: 8, color: '#374151' }}>No stories in {edition} edition yet</p>
                  <p style={{ fontSize: 14, marginBottom: 20, color: '#6B7280' }}>
                    {otherArticles.length > 0
                      ? `But there ${otherArticles.length === 1 ? 'is' : 'are'} ${otherArticles.length} ${otherArticles.length === 1 ? 'story' : 'stories'} in ${otherEdition}!`
                      : 'Check back later for new stories'}
                  </p>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {!hasActiveFilter && otherArticles.length > 0 && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('edition', otherEdition);
                      router.push(`/?${params.toString()}`, { scroll: false });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      backgroundColor: '#1a1a1a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{otherEdition === 'morning' ? '☀️' : '🌙'}</span>
                    View {otherEdition} edition
                  </button>
                )}
                {hasYesterday && !hasActiveFilter && (
                  <Link
                    href={`/date/${yesterday}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 24px',
                      backgroundColor: otherArticles.length > 0 ? '#F3F4F6' : '#1a1a1a',
                      color: otherArticles.length > 0 ? '#374151' : '#fff',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    View yesterday&apos;s stories
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Newsletter CTA */}
          <div style={{ marginTop: 48 }}>
            <NewsletterCTA />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function HomeContent(props: HomeContentProps) {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading...
          </div>
        </div>
      }
    >
      <HomeContentInner {...props} />
    </Suspense>
  );
}
