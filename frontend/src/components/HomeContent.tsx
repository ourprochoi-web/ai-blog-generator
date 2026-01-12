'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import NewsletterCTA from '@/components/NewsletterCTA';
import DateNavigation from '@/components/DateNavigation';
import ArticleCard from '@/components/ArticleCard';
import { Article } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

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

  // Get edition from URL or use initial
  const edition = (searchParams.get('edition') as 'morning' | 'evening') || initialEdition;

  // Get articles for current edition
  const currentArticles = edition === 'morning' ? morningArticles : eveningArticles;
  const otherEdition = edition === 'morning' ? 'evening' : 'morning';
  const otherArticles = edition === 'morning' ? eveningArticles : morningArticles;

  // If no articles in either edition, show no-edition articles
  const displayArticles =
    currentArticles.length > 0
      ? currentArticles
      : noEditionArticles.length > 0
        ? noEditionArticles
        : [];

  const featuredArticle = displayArticles[0];
  const otherDisplayArticles = displayArticles.slice(1);

  const editionLabel = edition === 'morning' ? 'Morning Edition' : 'Evening Edition';
  const editionIcon = edition === 'morning' ? '☀️' : '🌙';

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
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* Date Navigation */}
          {hasYesterday && (
            <DateNavigation currentDate={today} previousDate={yesterday} archiveDates={archiveDates} />
          )}

          {/* AI Insight Box */}
          <AIInsightBox
            totalSources={sourceStats.total}
            newsSources={sourceStats.by_type.news}
            paperSources={sourceStats.by_type.paper}
            articleSources={sourceStats.by_type.article}
            storiesSelected={morningArticles.length + eveningArticles.length + noEditionArticles.length}
          />

          {/* Edition Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 32,
              paddingBottom: 16,
              borderBottom: '2px solid #1a1a1a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>{editionIcon}</span>
              <div>
                <h2
                  className="font-serif"
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: '#1a1a1a',
                    margin: 0,
                  }}
                >
                  {editionLabel}
                </h2>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                  {displayArticles.length} {displayArticles.length === 1 ? 'story' : 'stories'}
                </p>
              </div>
            </div>

            {/* Other edition count */}
            {otherArticles.length > 0 && (
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                {otherArticles.length} in {otherEdition}
              </p>
            )}
          </div>

          {/* Articles List */}
          {displayArticles.length > 0 ? (
            <div>
              {/* Featured Article */}
              {featuredArticle && <ArticleCard article={featuredArticle} featured={true} />}

              {/* Divider */}
              {otherDisplayArticles.length > 0 && (
                <div
                  style={{
                    height: 1,
                    backgroundColor: '#E5E7EB',
                    margin: '32px 0 24px 0',
                  }}
                />
              )}

              {/* More Stories Label */}
              {otherDisplayArticles.length > 0 && (
                <h3
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  More stories
                </h3>
              )}

              {/* Other Articles */}
              {otherDisplayArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                color: '#6B7280',
              }}
            >
              <p style={{ fontSize: 18, marginBottom: 8 }}>No stories in this edition yet</p>
              <p style={{ fontSize: 14, marginBottom: 16 }}>Check back later or switch to {otherEdition} edition</p>
              {hasYesterday && (
                <Link
                  href={`/date/${yesterday}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
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
