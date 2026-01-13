import Link from 'next/link';

interface DateNavigationProps {
  currentDate: string;
  previousDate?: string;
  nextDate?: string;
  archiveDates?: string[];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
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
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
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
            color: '#6B7280',
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
            color: '#9CA3AF',
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
          color: '#1a1a1a',
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
            color: '#6B7280',
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
            color: '#6B7280',
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
