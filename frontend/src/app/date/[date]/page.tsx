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
  formatDate,
  calculateReadTime,
} from '@/lib/api';
import ReactMarkdown from 'react-markdown';

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

  // Category style helper
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Breakthrough: { bg: '#FEF3C7', color: '#92400E' },
      Industry: { bg: '#DBEAFE', color: '#1E40AF' },
      Regulation: { bg: '#FCE7F3', color: '#9D174D' },
      Research: { bg: '#D1FAE5', color: '#065F46' },
    };
    return styles[category] || { bg: '#F3F4F6', color: '#374151' };
  };

  const featuredCategory = featuredArticle?.tags[0]?.replace('#', '') || 'AI News';
  const featuredCategoryStyle = getCategoryStyle(featuredCategory);
  const featuredDate = featuredArticle ? formatDate(featuredArticle.created_at) : '';
  const featuredReadTime = featuredArticle ? calculateReadTime(featuredArticle.word_count) : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Suspense fallback={<div style={{ height: 73 }} />}>
        <Header />
      </Suspense>

      <main style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
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
                color: '#1a1a1a',
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
                padding: '48px 24px',
                color: '#6B7280',
              }}
            >
              <p>No stories were published on this date.</p>
              <Link
                href="/"
                style={{
                  color: '#2563EB',
                  textDecoration: 'none',
                  marginTop: '16px',
                  display: 'inline-block',
                }}
              >
                Go to today&apos;s brief →
              </Link>
            </div>
          ) : (
            <>
              {/* Featured Article - Full Content */}
              {featuredArticle && (
                <article style={{ marginBottom: '48px' }}>
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
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {featuredDate} · {featuredReadTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    className="font-serif"
                    style={{
                      fontSize: '36px',
                      fontWeight: '400',
                      lineHeight: '1.2',
                      marginBottom: '20px',
                      letterSpacing: '-0.5px',
                      color: '#1a1a1a',
                    }}
                  >
                    {featuredArticle.title}
                  </h2>

                  {/* Subtitle */}
                  {featuredArticle.subtitle && (
                    <p
                      style={{
                        fontSize: '18px',
                        color: '#4B5563',
                        lineHeight: '1.5',
                        fontWeight: '300',
                        marginBottom: '32px',
                      }}
                    >
                      {featuredArticle.subtitle}
                    </p>
                  )}

                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: '#E5E7EB',
                      margin: '0 0 32px 0',
                    }}
                  />

                  {/* Full Article Content */}
                  <div className="article-content">
                    <ReactMarkdown>{featuredArticle.content}</ReactMarkdown>
                  </div>

                  {/* Tags */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginTop: '48px',
                      paddingTop: '24px',
                      borderTop: '1px solid #E5E7EB',
                    }}
                  >
                    {featuredArticle.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F3F4F6',
                          borderRadius: '16px',
                          fontSize: '13px',
                          color: '#4B5563',
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
                        backgroundColor: '#F9FAFB',
                        borderRadius: '12px',
                      }}
                    >
                      <h4
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6B7280',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        References
                      </h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {featuredArticle.references.map((ref, index) => (
                          <li
                            key={index}
                            style={{
                              fontSize: '14px',
                              color: '#4B5563',
                              marginBottom: '8px',
                            }}
                          >
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#2563EB', textDecoration: 'none' }}
                            >
                              {ref.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              )}

              {/* Other Articles */}
              {otherArticles.length > 0 && (
                <>
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: '#E5E7EB',
                      margin: '32px 0',
                    }}
                  />
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                    }}
                  >
                    Also from this day
                  </h3>
                  {otherArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
