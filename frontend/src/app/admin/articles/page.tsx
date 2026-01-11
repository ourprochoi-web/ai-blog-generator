'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getArticles,
  updateArticleStatus,
  deleteArticle,
  Article,
  formatRelativeTime,
} from '@/lib/admin-api';

type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export default function ArticlesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get('status') || '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getArticles(page, 20, statusFilter || undefined);
      setArticles(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleStatusChange = async (id: string, newStatus: ArticleStatus) => {
    try {
      setActionLoading(id);
      await updateArticleStatus(id, newStatus);
      await loadArticles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      setActionLoading(id);
      await deleteArticle(id);
      await loadArticles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete article');
    } finally {
      setActionLoading(null);
    }
  };

  const setFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    router.push(`/admin/articles?${params.toString()}`);
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return { bg: '#FEF3C7', color: '#92400E' };
      case 'review':
        return { bg: '#E0E7FF', color: '#3730A3' };
      case 'published':
        return { bg: '#D1FAE5', color: '#065F46' };
      case 'archived':
        return { bg: '#F3F4F6', color: '#374151' };
      default:
        return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Articles</h1>
          <p style={styles.subtitle}>{total} total articles</p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {['', 'draft', 'review', 'published', 'archived'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterButton,
              ...(statusFilter === status ? styles.filterButtonActive : {}),
            }}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <p>{error}</p>
          <button onClick={loadArticles} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={styles.loading}>
          <p>Loading articles...</p>
        </div>
      )}

      {/* Articles Table */}
      {!isLoading && !error && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={{ ...styles.th, width: 100 }}>Status</th>
                <th style={{ ...styles.th, width: 80 }}>Words</th>
                <th style={{ ...styles.th, width: 120 }}>Created</th>
                <th style={{ ...styles.th, width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    No articles found
                  </td>
                </tr>
              ) : (
                articles.map((article) => {
                  const statusStyle = getStatusColor(article.status);
                  const isProcessing = actionLoading === article.id;

                  return (
                    <tr key={article.id} style={styles.tr}>
                      <td style={styles.td}>
                        <Link
                          href={`/admin/articles/${article.id}`}
                          style={styles.articleLink}
                        >
                          <div style={styles.articleTitle}>{article.title}</div>
                          {article.subtitle && (
                            <div style={styles.articleSubtitle}>
                              {article.subtitle}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {article.status}
                        </span>
                      </td>
                      <td style={styles.td}>{article.word_count}</td>
                      <td style={styles.td}>
                        {formatRelativeTime(article.created_at)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isProcessing ? (
                            <span style={styles.processing}>Processing...</span>
                          ) : (
                            <>
                              {article.status === 'draft' && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(article.id, 'published')
                                  }
                                  style={styles.publishButton}
                                >
                                  Publish
                                </button>
                              )}
                              {article.status === 'published' && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(article.id, 'archived')
                                  }
                                  style={styles.archiveButton}
                                >
                                  Archive
                                </button>
                              )}
                              <Link
                                href={`/admin/articles/${article.id}`}
                                style={styles.editButton}
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() =>
                                  handleDelete(article.id, article.title)
                                }
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && total > 20 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.pageButton}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            style={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  },
  filters: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  filterButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
    textTransform: 'capitalize',
  },
  filterButtonActive: {
    color: '#3B82F6',
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  errorBox: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    color: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    color: '#6B7280',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  tr: {
    borderBottom: '1px solid #F3F4F6',
  },
  td: {
    padding: '14px 16px',
    fontSize: 14,
    color: '#374151',
    verticalAlign: 'middle',
  },
  emptyCell: {
    padding: 40,
    textAlign: 'center',
    color: '#9CA3AF',
  },
  articleLink: {
    textDecoration: 'none',
    display: 'block',
  },
  articleTitle: {
    fontWeight: 500,
    color: '#111827',
    marginBottom: 2,
  },
  articleSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 400,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  processing: {
    fontSize: 13,
    color: '#6B7280',
  },
  publishButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  archiveButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  editButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    border: 'none',
    borderRadius: 4,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  pageButton: {
    padding: '8px 16px',
    fontSize: 14,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
};
