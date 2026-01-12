'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getDashboardStats,
  getSchedulerStatus,
  getArticles,
  Article,
  formatRelativeTime,
  DashboardStats,
} from '@/lib/admin-api';

interface SchedulerInfo {
  running: boolean;
  next_run: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [schedulerInfo, setSchedulerInfo] = useState<SchedulerInfo | null>(null);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const [statsRes, schedulerRes, draftRes] = await Promise.all([
          getDashboardStats(),
          getSchedulerStatus().catch(() => null),
          getArticles(1, 5, 'draft'),
        ]);

        setStats(statsRes);
        setSchedulerInfo(schedulerRes);
        setRecentArticles(draftRes.items.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Format next run time to KST
  const formatNextRun = (isoString: string | null) => {
    if (!isoString) return 'Not scheduled';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' KST';
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Dashboard</h1>
      <p style={styles.subtitle}>Overview of your AI blog platform</p>

      {/* Scheduler Status Banner */}
      {schedulerInfo && (
        <div style={styles.schedulerBanner}>
          <div style={styles.schedulerStatus}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: schedulerInfo.running ? '#10B981' : '#EF4444'
            }} />
            <span style={styles.schedulerText}>
              Scheduler {schedulerInfo.running ? 'Running' : 'Stopped'}
            </span>
          </div>
          <div style={styles.nextRun}>
            Next pipeline: <strong>{formatNextRun(schedulerInfo.next_run)}</strong>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeftColor: '#F59E0B' }}>
          <div style={styles.statValue}>{stats?.articles.draft || 0}</div>
          <div style={styles.statLabel}>Draft Articles</div>
          <Link href="/admin/articles?status=draft" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#8B5CF6' }}>
          <div style={styles.statValue}>{stats?.articles.review || 0}</div>
          <div style={styles.statLabel}>In Review</div>
          <Link href="/admin/articles?status=review" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#10B981' }}>
          <div style={styles.statValue}>{stats?.articles.published || 0}</div>
          <div style={styles.statLabel}>Published</div>
          <Link href="/admin/articles?status=published" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#3B82F6' }}>
          <div style={styles.statValue}>{stats?.sources.selected || 0}</div>
          <div style={styles.statLabel}>Selected Sources</div>
          <Link href="/admin/sources?status=selected" style={styles.statLink}>
            View all →
          </Link>
        </div>
      </div>

      {/* Sources Stats Row */}
      <div style={styles.sourcesStatsRow}>
        <div style={styles.sourceStatItem}>
          <span style={styles.sourceStatValue}>{stats?.sources.pending || 0}</span>
          <span style={styles.sourceStatLabel}>Pending</span>
        </div>
        <div style={styles.sourceStatItem}>
          <span style={styles.sourceStatValue}>{stats?.sources.selected || 0}</span>
          <span style={styles.sourceStatLabel}>Selected</span>
        </div>
        <div style={styles.sourceStatItem}>
          <span style={styles.sourceStatValue}>{stats?.sources.processed || 0}</span>
          <span style={styles.sourceStatLabel}>Processed</span>
        </div>
        <div style={styles.sourceStatItem}>
          <span style={styles.sourceStatValue}>{stats?.sources.skipped || 0}</span>
          <span style={styles.sourceStatLabel}>Skipped</span>
        </div>
        <div style={styles.sourceStatItem}>
          <span style={{ ...styles.sourceStatValue, color: stats?.sources.failed ? '#EF4444' : '#6B7280' }}>
            {stats?.sources.failed || 0}
          </span>
          <span style={styles.sourceStatLabel}>Failed</span>
        </div>
      </div>

      {/* Today Stats */}
      {stats?.today && (
        <div style={styles.todayStats}>
          <h3 style={styles.todayTitle}>Today&apos;s Activity</h3>
          <div style={styles.todayGrid}>
            <div style={styles.todayItem}>
              <span style={styles.todayValue}>{stats.today.articles_generated}</span>
              <span style={styles.todayLabel}>Articles Generated</span>
            </div>
            <div style={styles.todayItem}>
              <span style={styles.todayValue}>{stats.today.sources_scraped}</span>
              <span style={styles.todayLabel}>Sources Scraped</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <Link href="/admin/pipeline" style={styles.actionButton}>
            <span style={styles.actionIcon}>🔄</span>
            Run Scraping
          </Link>
          <Link href="/admin/pipeline" style={styles.actionButton}>
            <span style={styles.actionIcon}>✨</span>
            Generate Articles
          </Link>
          <Link href="/admin/articles?status=draft" style={styles.actionButton}>
            <span style={styles.actionIcon}>📝</span>
            Review Drafts
          </Link>
        </div>
      </div>

      {/* Recent Draft Articles */}
      <div style={styles.section}>
        <div style={styles.columnHeader}>
          <h2 style={styles.sectionTitle}>Recent Drafts</h2>
          <Link href="/admin/articles?status=draft" style={styles.viewAllLink}>
            View all
          </Link>
        </div>

        <div style={styles.column}>
          {recentArticles.length === 0 ? (
            <p style={styles.emptyText}>No draft articles</p>
          ) : (
            <div style={styles.list}>
              {recentArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}`}
                  style={styles.listItem}
                >
                  <div style={styles.listItemTitle}>{article.title}</div>
                  <div style={styles.listItemMeta}>
                    {article.edition && (
                      <span style={{
                        ...styles.editionBadge,
                        backgroundColor: article.edition === 'morning' ? '#FEF3C7' : '#E0E7FF',
                        color: article.edition === 'morning' ? '#92400E' : '#3730A3',
                      }}>
                        {article.edition === 'morning' ? '☀️' : '🌙'} {article.edition}
                      </span>
                    )}
                    {formatRelativeTime(article.created_at)} · {article.word_count} words
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    color: '#6B7280',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    color: '#DC2626',
    gap: 16,
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  title: {
    fontSize: 28,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  schedulerBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 8,
    marginBottom: 24,
  },
  schedulerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  schedulerText: {
    fontSize: 14,
    fontWeight: 500,
    color: '#166534',
  },
  nextRun: {
    fontSize: 13,
    color: '#166534',
  },
  sourcesStatsRow: {
    display: 'flex',
    gap: 24,
    padding: '16px 20px',
    backgroundColor: 'white',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  sourceStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  sourceStatValue: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
  },
  sourceStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  todayStats: {
    padding: '16px 20px',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    marginBottom: 24,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1E40AF',
    marginBottom: 12,
  },
  todayGrid: {
    display: 'flex',
    gap: 32,
  },
  todayItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  todayValue: {
    fontSize: 24,
    fontWeight: 600,
    color: '#1E40AF',
  },
  todayLabel: {
    fontSize: 12,
    color: '#3B82F6',
  },
  editionBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    marginRight: 8,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    borderLeft: '4px solid',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 600,
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statLink: {
    fontSize: 13,
    color: '#3B82F6',
    textDecoration: 'none',
    marginTop: 12,
    display: 'inline-block',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 16,
  },
  actionsGrid: {
    display: 'flex',
    gap: 12,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  actionIcon: {
    fontSize: 16,
  },
  columnsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  column: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 13,
    color: '#3B82F6',
    textDecoration: 'none',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItem: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    textDecoration: 'none',
    display: 'block',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#111827',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listItemMeta: {
    fontSize: 12,
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    padding: '2px 6px',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 32,
  },
};
