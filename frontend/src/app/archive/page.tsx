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
      <Header />

      <main style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
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
              color: '#6B7280',
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
              color: '#1a1a1a',
            }}
          >
            Archive
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '40px',
            }}
          >
            Browse past editions of AI Daily Brief
          </p>

          {/* Archive List */}
          {monthKeys.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No archived articles yet.</p>
          ) : (
            monthKeys.map((monthKey) => (
              <div key={monthKey} style={{ marginBottom: '40px' }}>
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #E5E7EB',
                  }}
                >
                  {monthKey}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupedByMonth[monthKey].map((dg) => (
                    <Link
                      key={dg.date}
                      href={`/date/${dg.date}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        textDecoration: 'none',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          color: '#1a1a1a',
                          fontWeight: '500',
                        }}
                      >
                        {dg.displayDate}
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#6B7280',
                        }}
                      >
                        {dg.articleCount} {dg.articleCount === 1 ? 'story' : 'stories'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
