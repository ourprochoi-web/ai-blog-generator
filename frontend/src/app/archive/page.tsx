import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getArchiveDates, getArticlesByDate } from '@/lib/api';

interface DateGroup {
  date: string;
  displayDate: string;
  month: string;
  year: string;
  articleCount: number;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getMonthYear(dateStr: string): { month: string; year: string } {
  const date = new Date(dateStr + 'T00:00:00');
  return {
    month: date.toLocaleDateString('en-US', { month: 'long' }),
    year: date.getFullYear().toString(),
  };
}

export default async function ArchivePage() {
  let dateGroups: DateGroup[] = [];

  try {
    const archiveResponse = await getArchiveDates();
    const dates = archiveResponse.dates || [];

    // Get article counts for each date
    dateGroups = await Promise.all(
      dates.map(async (date) => {
        try {
          const articles = await getArticlesByDate(date);
          const { month, year } = getMonthYear(date);
          return {
            date,
            displayDate: formatDisplayDate(date),
            month,
            year,
            articleCount: articles.total,
          };
        } catch {
          const { month, year } = getMonthYear(date);
          return {
            date,
            displayDate: formatDisplayDate(date),
            month,
            year,
            articleCount: 0,
          };
        }
      })
    );
  } catch (error) {
    console.log('Failed to fetch archive dates');
  }

  // Group by month
  const groupedByMonth: Record<string, DateGroup[]> = {};
  dateGroups.forEach((dg) => {
    const key = `${dg.month} ${dg.year}`;
    if (!groupedByMonth[key]) {
      groupedByMonth[key] = [];
    }
    groupedByMonth[key].push(dg);
  });

  const monthKeys = Object.keys(groupedByMonth);

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
        aria-label="Archive"
        style={{ flex: 1, backgroundColor: 'var(--color-bg)' }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* Back Button */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '32px',
            }}
          >
            <span>←</span> Back to today
          </Link>

          {/* Title */}
          <h1
            className="font-serif"
            style={{
              fontSize: '36px',
              fontWeight: '400',
              marginBottom: '12px',
              color: 'var(--color-text)',
            }}
          >
            Archive
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--color-text-muted)',
              marginBottom: '40px',
            }}
          >
            Browse past editions of AI Daily Brief
          </p>

          {/* Archive List */}
          {monthKeys.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <p style={{ fontSize: 18, color: 'var(--color-text)', marginBottom: 8 }}>
                No archived articles yet
              </p>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                Check back later for past editions
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
                View today&apos;s brief
              </Link>
            </div>
          ) : (
            <nav aria-label="Archive by month">
              {monthKeys.map((monthKey) => (
                <section key={monthKey} style={{ marginBottom: '40px' }} aria-label={monthKey}>
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginBottom: '16px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {monthKey}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {groupedByMonth[monthKey].map((dg) => (
                      <Link
                        key={dg.date}
                        href={`/date/${dg.date}`}
                        className="archive-date-card"
                        aria-label={`${dg.displayDate}, ${dg.articleCount} ${dg.articleCount === 1 ? 'story' : 'stories'}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px',
                          backgroundColor: 'var(--color-card-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '15px',
                            color: 'var(--color-text)',
                            fontWeight: '500',
                          }}
                        >
                          {dg.displayDate}
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {dg.articleCount} {dg.articleCount === 1 ? 'story' : 'stories'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </nav>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
