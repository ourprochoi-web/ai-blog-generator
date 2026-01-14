import Link from 'next/link';

interface DateNavigationProps {
  currentDate: string;
  previousDate?: string;
  nextDate?: string;
  archiveDates?: string[];
}

// Get today's date in KST (Korea Standard Time, UTC+9)
function getTodayKST(): Date {
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60 * 1000);
  kstTime.setHours(0, 0, 0, 0);
  return kstTime;
}

function formatDisplayDate(dateStr: string): string {
  // Parse date as KST midnight
  const date = new Date(dateStr + 'T00:00:00+09:00');
  date.setHours(0, 0, 0, 0);

  const today = getTodayKST();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Compare just the date parts
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00+09:00');
  const today = getTodayKST();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
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
