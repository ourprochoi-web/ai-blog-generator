import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import ArticleCard from '@/components/ArticleCard';
import DateNavigation from '@/components/DateNavigation';
import {
  getArticlesByDate,
  getArchiveDates,
  getSourceStats,
  Article,
} from '@/lib/api';

interface PageProps {
  params: Promise<{ date: string }>;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function DatePage({ params }: PageProps) {
  const { date } = await params;

  let articles: Article[] = [];
  let archiveDates: string[] = [];
  let sourceStats = { total: 0, by_type: { news: 0, paper: 0, article: 0 }, today_count: 0 };

  try {
    const [articlesResponse, archiveResponse, statsResponse] = await Promise.all([
      getArticlesByDate(date),
      getArchiveDates().catch(() => ({ dates: [] })),
      getSourceStats().catch(() => sourceStats),
    ]);

    articles = articlesResponse.articles || [];
    archiveDates = archiveResponse.dates || [];
    sourceStats = statsResponse;
  } catch (error) {
    console.log('Failed to fetch data for date:', date);
  }

  // Find previous and next dates
  const currentIndex = archiveDates.indexOf(date);
  const previousDate = currentIndex < archiveDates.length - 1 ? archiveDates[currentIndex + 1] : undefined;
  const nextDate = currentIndex > 0 ? archiveDates[currentIndex - 1] : undefined;

  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Skip to main content */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Suspense fallback={<div style={{ height: 73 }} />}>
        <Header />
      </Suspense>

      <main
        id="main-content"
        role="main"
        aria-label={`Articles from ${formatDisplayDate(date)}`}
        style={{ flex: 1, backgroundColor: 'var(--color-bg)' }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* Date Navigation */}
          <DateNavigation
            currentDate={date}
            previousDate={previousDate}
            nextDate={nextDate}
            archiveDates={archiveDates}
          />

          {/* Date Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1
              className="font-serif"
              style={{
                fontSize: '28px',
                fontWeight: '400',
                color: 'var(--color-text)',
                marginBottom: '8px',
              }}
            >
              {formatDisplayDate(date)}
            </h1>
          </div>

          {/* AI Insight Box */}
          <AIInsightBox
            totalSources={sourceStats.total}
            newsSources={sourceStats.by_type.news}
            paperSources={sourceStats.by_type.paper}
            articleSources={sourceStats.by_type.article}
            storiesSelected={articles.length}
            edition="morning"
          />

          {/* No articles message */}
          {articles.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📰</div>
              <p style={{ fontSize: 18, color: 'var(--color-text)', marginBottom: 8 }}>
                No stories were published on this date
              </p>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                Check other dates or go back to today
              </p>
              <Link
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Go to today&apos;s brief →
              </Link>
            </div>
          ) : (
            <section aria-label="Articles from this day">
              {/* Featured Article Card */}
              {featuredArticle && (
                <ArticleCard article={featuredArticle} featured />
              )}

              {/* Other Articles as Cards */}
              {otherArticles.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px',
                    marginTop: '32px',
                  }}
                >
                  {otherArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} variant="medium" />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
