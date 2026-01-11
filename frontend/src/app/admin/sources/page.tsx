'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getSources,
  updateSourceStatus,
  deleteSource,
  scrapeUrl,
  generateArticle,
  Source,
  formatRelativeTime,
} from '@/lib/admin-api';

type SourceStatus = 'pending' | 'processed' | 'skipped' | 'failed';
type SourceType = 'news' | 'paper' | 'article';

export default function SourcesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const statusFilter = searchParams.get('status') || '';
  const typeFilter = searchParams.get('type') || '';

  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Scrape modal state
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeUrl_, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getSources(
        page,
        20,
        typeFilter || undefined,
        statusFilter || undefined
      );
      setSources(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const setFilters = (status: string, type: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    router.push(`/admin/sources?${params.toString()}`);
    setPage(1);
  };

  const handleStatusChange = async (id: string, newStatus: SourceStatus) => {
    try {
      setActionLoading(id);
      await updateSourceStatus(id, newStatus);
      await loadSources();
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
      await deleteSource(id);
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete source');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerate = async (sourceId: string) => {
    try {
      setActionLoading(sourceId);
      const result = await generateArticle({ source_id: sourceId });
      alert(
        `Article generated successfully!\nTitle: ${result.article.title}\nTime: ${result.generation_time_seconds.toFixed(1)}s`
      );
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate article');
    } finally {
      setActionLoading(null);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl_.trim()) return;

    try {
      setIsScraping(true);
      await scrapeUrl(scrapeUrl_);
      alert('URL scraped successfully!');
      setScrapeUrl('');
      setShowScrapeModal(false);
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to scrape URL');
    } finally {
      setIsScraping(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', color: '#92400E' };
      case 'processed':
        return { bg: '#D1FAE5', color: '#065F46' };
      case 'skipped':
        return { bg: '#F3F4F6', color: '#374151' };
      case 'failed':
        return { bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'news':
        return { bg: '#DBEAFE', color: '#1E40AF' };
      case 'paper':
        return { bg: '#E0E7FF', color: '#3730A3' };
      case 'article':
        return { bg: '#FCE7F3', color: '#9D174D' };
      default:
        return { bg: '#F3F4F6', color: '#374151' };
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sources</h1>
          <p style={styles.subtitle}>{total} total sources</p>
        </div>
        <button
          onClick={() => setShowScrapeModal(true)}
          style={styles.addButton}
        >
          + Scrape URL
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Status:</span>
          {['', 'pending', 'processed', 'skipped', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilters(status, typeFilter)}
              style={{
                ...styles.filterButton,
                ...(statusFilter === status ? styles.filterButtonActive : {}),
              }}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Type:</span>
          {['', 'news', 'paper', 'article'].map((type) => (
            <button
              key={type}
              onClick={() => setFilters(statusFilter, type)}
              style={{
                ...styles.filterButton,
                ...(typeFilter === type ? styles.filterButtonActive : {}),
              }}
            >
              {type || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <p>{error}</p>
          <button onClick={loadSources} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={styles.loading}>
          <p>Loading sources...</p>
        </div>
      )}

      {/* Sources Table */}
      {!isLoading && !error && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={{ ...styles.th, width: 80 }}>Type</th>
                <th style={{ ...styles.th, width: 100 }}>Status</th>
                <th style={{ ...styles.th, width: 120 }}>Scraped</th>
                <th style={{ ...styles.th, width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    No sources found
                  </td>
                </tr>
              ) : (
                sources.map((source) => {
                  const statusStyle = getStatusColor(source.status);
                  const typeStyle = getTypeColor(source.type);
                  const isProcessing = actionLoading === source.id;

                  return (
                    <tr key={source.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.sourceTitle}>{source.title}</div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.sourceUrl}
                        >
                          {source.url}
                        </a>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: typeStyle.bg,
                            color: typeStyle.color,
                          }}
                        >
                          {source.type}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {source.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {formatRelativeTime(source.scraped_at)}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isProcessing ? (
                            <span style={styles.processing}>Processing...</span>
                          ) : (
                            <>
                              {source.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleGenerate(source.id)}
                                    style={styles.generateButton}
                                  >
                                    Generate
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleStatusChange(source.id, 'skipped')
                                    }
                                    style={styles.skipButton}
                                  >
                                    Skip
                                  </button>
                                </>
                              )}
                              {source.status === 'skipped' && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(source.id, 'pending')
                                  }
                                  style={styles.restoreButton}
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDelete(source.id, source.title)
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

      {/* Scrape Modal */}
      {showScrapeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>Scrape URL</h2>
            <p style={styles.modalSubtitle}>
              Enter a URL to scrape and add to sources
            </p>

            <form onSubmit={handleScrape}>
              <input
                type="url"
                value={scrapeUrl_}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com/article"
                style={styles.input}
                autoFocus
                required
              />

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowScrapeModal(false)}
                  style={styles.cancelButton}
                  disabled={isScraping}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={isScraping}
                >
                  {isScraping ? 'Scraping...' : 'Scrape'}
                </button>
              </div>
            </form>
          </div>
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
  addButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  filtersRow: {
    display: 'flex',
    gap: 24,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#6B7280',
  },
  filterButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
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
  sourceTitle: {
    fontWeight: 500,
    color: '#111827',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 400,
  },
  sourceUrl: {
    fontSize: 12,
    color: '#6B7280',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
    maxWidth: 400,
  },
  badge: {
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
    flexWrap: 'wrap',
  },
  processing: {
    fontSize: 13,
    color: '#6B7280',
  },
  generateButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#8B5CF6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  skipButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  restoreButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    border: 'none',
    borderRadius: 4,
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    outline: 'none',
    marginBottom: 24,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
