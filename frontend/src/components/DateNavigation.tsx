import Link from 'next/link';

interface DateNavigationProps {
  currentDate: string;
  previousDate?: string;
  nextDate?: string;
  archiveDates?: string[];
}

// Get today's date string in UTC (YYYY-MM-DD)
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  const todayStr = getTodayUTC();
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (dateStr === todayStr) {
    return 'Today';
  } else if (dateStr === yesterdayStr) {
    return 'Yesterday';
  } else {
    // Parse as UTC date for display
    const date = new Date(dateStr + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayUTC();
}

export default function DateNavigation({
  currentDate,
  previousDate,
  nextDate,
  archiveDates = [],
}: DateNavigationProps) {
  const currentIsToday = isToday(currentDate);

  // If viewing yesterday or older, always show "Today →" on the right
  const todayStr = new Date().toISOString().split('T')[0];
  const showTodayLink = !currentIsToday;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '12px 16px',
        backgroundColor: 'var(--color-card-bg)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Previous / Archive */}
      {previousDate ? (
        <Link
          href={`/date/${previousDate}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          <span>←</span>
          <span>{formatDisplayDate(previousDate)}</span>
        </Link>
      ) : (
        <Link
          href="/archive"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--color-text-light)',
            textDecoration: 'none',
          }}
        >
          <span>📚</span>
          <span>Archive</span>
        </Link>
      )}

      {/* Current */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--color-text)',
        }}
      >
        {formatDisplayDate(currentDate)}
      </div>

      {/* Next / Today */}
      {showTodayLink ? (
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          <span>Today</span>
          <span>→</span>
        </Link>
      ) : nextDate ? (
        <Link
          href={`/date/${nextDate}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
          }}
        >
          <span>{formatDisplayDate(nextDate)}</span>
          <span>→</span>
        </Link>
      ) : (
        <div style={{ width: '80px' }} />
      )}
    </div>
  );
}
