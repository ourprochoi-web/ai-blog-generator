'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getArticles,
  getSources,
  Article,
  Source,
  formatRelativeTime,
} from '@/lib/admin-api';

interface Stats {
  articles: { draft: number; review: number; published: number; total: number };
  sources: { pending: number; processed: number; failed: number; total: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    articles: { draft: 0, review: 0, published: 0, total: 0 },
    sources: { pending: 0, processed: 0, failed: 0, total: 0 },
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [recentSources, setRecentSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        const [
          draftRes,
          reviewRes,
          publishedRes,
          pendingSourcesRes,
          processedSourcesRes,
        ] = await Promise.all([
          getArticles(1, 5, 'draft'),
          getArticles(1, 1, 'review'),
          getArticles(1, 1, 'published'),
          getSources(1, 5, undefined, 'pending'),
          getSources(1, 1, undefined, 'processed'),
        ]);

        setStats({
          articles: {
            draft: draftRes.total,
            review: reviewRes.total,
            published: publishedRes.total,
            total: draftRes.total + reviewRes.total + publishedRes.total,
          },
          sources: {
            pending: pendingSourcesRes.total,
            processed: processedSourcesRes.total,
            failed: 0,
            total: pendingSourcesRes.total + processedSourcesRes.total,
          },
        });

        setRecentArticles(draftRes.items.slice(0, 5));
        setRecentSources(pendingSourcesRes.items.slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

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

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeftColor: '#F59E0B' }}>
          <div style={styles.statValue}>{stats.articles.draft}</div>
          <div style={styles.statLabel}>Draft Articles</div>
          <Link href="/admin/articles?status=draft" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#8B5CF6' }}>
          <div style={styles.statValue}>{stats.articles.review}</div>
          <div style={styles.statLabel}>In Review</div>
          <Link href="/admin/articles?status=review" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#10B981' }}>
          <div style={styles.statValue}>{stats.articles.published}</div>
          <div style={styles.statLabel}>Published</div>
          <Link href="/admin/articles?status=published" style={styles.statLink}>
            View all →
          </Link>
        </div>

        <div style={{ ...styles.statCard, borderLeftColor: '#3B82F6' }}>
          <div style={styles.statValue}>{stats.sources.pending}</div>
          <div style={styles.statLabel}>Pending Sources</div>
          <Link href="/admin/sources?status=pending" style={styles.statLink}>
            View all →
          </Link>
        </div>
      </div>

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

      {/* Two Column Layout */}
      <div style={styles.columnsGrid}>
        {/* Recent Draft Articles */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.sectionTitle}>Recent Drafts</h2>
            <Link href="/admin/articles?status=draft" style={styles.viewAllLink}>
              View all
            </Link>
          </div>

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
                    {formatRelativeTime(article.created_at)} · {article.word_count} words
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Sources */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <h2 style={styles.sectionTitle}>Pending Sources</h2>
            <Link href="/admin/sources?status=pending" style={styles.viewAllLink}>
              View all
            </Link>
          </div>

          {recentSources.length === 0 ? (
            <p style={styles.emptyText}>No pending sources</p>
          ) : (
            <div style={styles.list}>
              {recentSources.map((source) => (
                <div key={source.id} style={styles.listItem}>
                  <div style={styles.listItemTitle}>{source.title}</div>
                  <div style={styles.listItemMeta}>
                    <span style={styles.typeBadge}>{source.type}</span>
                    {formatRelativeTime(source.scraped_at)}
                  </div>
                </div>
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
    marginBottom: 32,
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
