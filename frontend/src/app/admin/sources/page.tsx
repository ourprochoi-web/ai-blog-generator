'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getSources,
  getArticles,
  updateSourceStatus,
  deleteSource,
  scrapeUrl,
  generateArticle,
  streamEvaluatePending,
  Source,
  Article,
  formatRelativeTime,
  EvaluateProgressEvent,
} from '@/lib/admin-api';

type SourceStatus = 'pending' | 'selected' | 'processed' | 'skipped' | 'failed';
type SourceType = 'news' | 'paper' | 'article';
type SortField = 'scraped_at' | 'relevance_score' | 'title';
type SortOrder = 'asc' | 'desc';

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

  // Evaluate state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [evaluateProgress, setEvaluateProgress] = useState<EvaluateProgressEvent | null>(null);
  const [evaluateLog, setEvaluateLog] = useState<EvaluateProgressEvent[]>([]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Source to Article mapping
  const [sourceArticleMap, setSourceArticleMap] = useState<Map<string, Article>>(new Map());

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('scraped_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
      setSources(res.items || []);
      setTotal(res.total || 0);

      // Load articles to map source_id -> article
      const processedSourceIds = (res.items || [])
        .filter((s: Source) => s.status === 'processed')
        .map((s: Source) => s.id);

      if (processedSourceIds.length > 0) {
        try {
          // Fetch all articles to find ones with matching source_ids
          const articlesRes = await getArticles(1, 100);
          const articleMap = new Map<string, Article>();
          (articlesRes.items || []).forEach((article: Article) => {
            if (article.source_id && processedSourceIds.includes(article.source_id)) {
              articleMap.set(article.source_id, article);
            }
          });
          setSourceArticleMap(articleMap);
        } catch {
          // Silently fail - article mapping is optional
        }
      }
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

  const handleEvaluate = () => {
    setShowEvaluateModal(true);
    setEvaluateProgress(null);
    setEvaluateLog([]);
    setIsEvaluating(true);

    const cleanup = streamEvaluatePending(
      (event) => {
        setEvaluateProgress(event);
        setEvaluateLog((prev) => [...prev.slice(-50), event]); // Keep last 50 events
      },
      (error) => {
        setEvaluateProgress({
          type: 'error',
          message: error.message,
        });
        setIsEvaluating(false);
      },
      () => {
        setIsEvaluating(false);
        loadSources();
      }
    );

    // Store cleanup function for potential cancellation
    return cleanup;
  };

  const handleCloseEvaluateModal = () => {
    if (isEvaluating) {
      if (!confirm('Evaluation is still in progress. Close anyway?')) {
        return;
      }
    }
    setShowEvaluateModal(false);
    setEvaluateProgress(null);
    setEvaluateLog([]);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === sources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sources.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkSkip = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Skip ${selectedIds.size} selected sources?`)) return;

    try {
      setIsBulkProcessing(true);
      const promises = Array.from(selectedIds).map((id) =>
        updateSourceStatus(id, 'skipped')
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to skip sources');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected sources? This cannot be undone.`)) return;

    try {
      setIsBulkProcessing(true);
      const promises = Array.from(selectedIds).map((id) => deleteSource(id));
      await Promise.all(promises);
      setSelectedIds(new Set());
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete sources');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Restore ${selectedIds.size} selected sources to pending?`)) return;

    try {
      setIsBulkProcessing(true);
      const promises = Array.from(selectedIds).map((id) =>
        updateSourceStatus(id, 'pending')
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      await loadSources();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore sources');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#FEF3C7', color: '#92400E' };
      case 'selected':
        return { bg: '#DBEAFE', color: '#1E40AF' };
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

  const getScoreColor = (score: number | null) => {
    if (score === null) return { bg: '#F3F4F6', color: '#9CA3AF' };
    if (score >= 70) return { bg: '#D1FAE5', color: '#065F46' };
    if (score >= 50) return { bg: '#FEF3C7', color: '#92400E' };
    return { bg: '#FEE2E2', color: '#991B1B' };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'relevance_score' ? 'desc' : 'desc');
    }
  };

  // Sort sources locally
  const sortedSources = [...sources].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'relevance_score':
        const scoreA = a.relevance_score ?? -1;
        const scoreB = b.relevance_score ?? -1;
        comparison = scoreA - scoreB;
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'scraped_at':
      default:
        comparison = new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime();
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sources</h1>
          <p style={styles.subtitle}>{total} total sources</p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            style={styles.evaluateButton}
          >
            {isEvaluating ? 'Evaluating...' : 'Evaluate Pending'}
          </button>
          <button
            onClick={() => setShowScrapeModal(true)}
            style={styles.addButton}
          >
            + Scrape URL
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersRow}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Status:</span>
          {['', 'pending', 'selected', 'processed', 'skipped', 'failed'].map((status) => (
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

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkActionsBar}>
          <span style={styles.bulkActionsText}>
            {selectedIds.size} selected
          </span>
          <div style={styles.bulkActionsButtons}>
            <button
              onClick={handleBulkSkip}
              disabled={isBulkProcessing}
              style={styles.bulkSkipButton}
            >
              Skip Selected
            </button>
            <button
              onClick={handleBulkRestore}
              disabled={isBulkProcessing}
              style={styles.bulkRestoreButton}
            >
              Restore Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
              style={styles.bulkDeleteButton}
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={styles.bulkCancelButton}
            >
              Clear
            </button>
          </div>
          {isBulkProcessing && <span style={styles.bulkProcessing}>Processing...</span>}
        </div>
      )}

      {/* Sources Table */}
      {!isLoading && !error && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={sources.length > 0 && selectedIds.size === sources.length}
                    onChange={toggleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th
                  style={{ ...styles.th, ...styles.sortableHeader }}
                  onClick={() => handleSort('title')}
                >
                  Title{getSortIndicator('title')}
                </th>
                <th style={{ ...styles.th, width: 80 }}>Type</th>
                <th style={{ ...styles.th, width: 100 }}>Status</th>
                <th
                  style={{ ...styles.th, ...styles.sortableHeader, width: 70 }}
                  onClick={() => handleSort('relevance_score')}
                >
                  Score{getSortIndicator('relevance_score')}
                </th>
                <th
                  style={{ ...styles.th, ...styles.sortableHeader, width: 120 }}
                  onClick={() => handleSort('scraped_at')}
                >
                  Scraped{getSortIndicator('scraped_at')}
                </th>
                <th style={{ ...styles.th, width: 240 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyCell}>
                    No sources found
                  </td>
                </tr>
              ) : (
                sortedSources.map((source) => {
                  const statusStyle = getStatusColor(source.status);
                  const typeStyle = getTypeColor(source.type);
                  const isProcessing = actionLoading === source.id;

                  return (
                    <tr key={source.id} style={styles.tr}>
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(source.id)}
                          onChange={() => toggleSelect(source.id)}
                          style={styles.checkbox}
                        />
                      </td>
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
                        {source.relevance_score != null ? (
                          <span
                            style={{
                              ...styles.scoreBadge,
                              backgroundColor: getScoreColor(source.relevance_score).bg,
                              color: getScoreColor(source.relevance_score).color,
                            }}
                          >
                            {source.relevance_score}
                          </span>
                        ) : (
                          <span style={styles.noScore}>-</span>
                        )}
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
                              {(source.status === 'pending' || source.status === 'selected') && (
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
                              {source.status === 'processed' && sourceArticleMap.has(source.id) && (
                                <Link
                                  href={`/admin/articles/${sourceArticleMap.get(source.id)!.id}`}
                                  style={styles.viewArticleButton}
                                >
                                  View Article
                                </Link>
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

      {/* Evaluate Modal */}
      {showEvaluateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.evaluateModal}>
            <div style={styles.evaluateModalHeader}>
              <h2 style={styles.modalTitle}>Evaluating Sources</h2>
              <button
                onClick={handleCloseEvaluateModal}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            {/* Progress Bar */}
            {evaluateProgress && evaluateProgress.total && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${((evaluateProgress.current || 0) / evaluateProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.progressText}>
                  {evaluateProgress.current || 0} / {evaluateProgress.total} sources
                  {evaluateProgress.selected_count !== undefined && (
                    <span style={styles.selectedCount}>
                      ({evaluateProgress.selected_count} selected)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Current Status */}
            {evaluateProgress && (
              <div style={styles.currentStatus}>
                {evaluateProgress.type === 'start' && (
                  <p style={styles.statusText}>{evaluateProgress.message}</p>
                )}
                {evaluateProgress.type === 'progress' && (
                  <p style={styles.statusText}>
                    Evaluating: {evaluateProgress.source_title}...
                  </p>
                )}
                {evaluateProgress.type === 'evaluated' && (
                  <div style={styles.evaluatedItem}>
                    <span style={styles.sourceTitle}>{evaluateProgress.source_title}</span>
                    <span
                      style={{
                        ...styles.scoreBadge,
                        backgroundColor: (evaluateProgress.score || 0) >= 70 ? '#D1FAE5' : (evaluateProgress.score || 0) >= 50 ? '#FEF3C7' : '#FEE2E2',
                        color: (evaluateProgress.score || 0) >= 70 ? '#065F46' : (evaluateProgress.score || 0) >= 50 ? '#92400E' : '#991B1B',
                      }}
                    >
                      {evaluateProgress.score}
                    </span>
                    {evaluateProgress.selected && (
                      <span style={styles.selectedBadge}>Selected</span>
                    )}
                  </div>
                )}
                {evaluateProgress.type === 'error' && (
                  <p style={styles.errorText}>
                    Error: {evaluateProgress.error || evaluateProgress.message}
                  </p>
                )}
                {evaluateProgress.type === 'complete' && (
                  <div style={styles.completeBox}>
                    <p style={styles.completeText}>{evaluateProgress.message}</p>
                    <div style={styles.completeStats}>
                      <span>Evaluated: {evaluateProgress.evaluated}</span>
                      <span>Selected: {evaluateProgress.selected_count || evaluateProgress.selected}</span>
                      {(evaluateProgress.errors || 0) > 0 && (
                        <span style={styles.errorCount}>Errors: {evaluateProgress.errors}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Log */}
            <div style={styles.logContainer}>
              <div style={styles.logHeader}>Recent Activity</div>
              <div style={styles.logContent}>
                {evaluateLog.slice(-20).reverse().map((event, idx) => (
                  <div key={idx} style={styles.logItem}>
                    {event.type === 'evaluated' && (
                      <span>
                        <span style={styles.logScore}>[{event.score}]</span>{' '}
                        {event.source_title}
                        {event.selected && <span style={styles.logSelected}> ✓</span>}
                      </span>
                    )}
                    {event.type === 'error' && (
                      <span style={styles.logError}>
                        Error: {event.source_title} - {event.error}
                      </span>
                    )}
                    {event.type === 'start' && (
                      <span style={styles.logInfo}>{event.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Time */}
            {isEvaluating && evaluateProgress?.total && evaluateProgress?.current && (
              <div style={styles.estimatedTime}>
                Estimated time remaining: ~{Math.ceil(((evaluateProgress.total - evaluateProgress.current) * 4) / 60)} min
              </div>
            )}

            {/* Close Button */}
            {!isEvaluating && (
              <div style={styles.modalActions}>
                <button
                  onClick={handleCloseEvaluateModal}
                  style={styles.submitButton}
                >
                  Close
                </button>
              </div>
            )}
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
  headerActions: {
    display: 'flex',
    gap: 12,
  },
  evaluateButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#F59E0B',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
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
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
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
  scoreBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    minWidth: 32,
    textAlign: 'center',
  },
  noScore: {
    color: '#9CA3AF',
    fontSize: 12,
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
  viewArticleButton: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
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
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
  },
  bulkActionsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 16,
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  bulkActionsText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1E40AF',
  },
  bulkActionsButtons: {
    display: 'flex',
    gap: 8,
  },
  bulkSkipButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #D1D5DB',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkRestoreButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: 'white',
    border: '1px solid #3B82F6',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkDeleteButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#DC2626',
    backgroundColor: 'white',
    border: '1px solid #DC2626',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkCancelButton: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkProcessing: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  // Evaluate Modal Styles
  evaluateModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  evaluateModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#F3F4F6',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  selectedCount: {
    color: '#059669',
    fontWeight: 500,
  },
  currentStatus: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    minHeight: 60,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    margin: 0,
  },
  evaluatedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  selectedBadge: {
    padding: '2px 8px',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    margin: 0,
  },
  completeBox: {
    textAlign: 'center',
  },
  completeText: {
    fontSize: 16,
    fontWeight: 500,
    color: '#059669',
    margin: '0 0 8px 0',
  },
  completeStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: 16,
    fontSize: 14,
    color: '#374151',
  },
  errorCount: {
    color: '#DC2626',
  },
  logContainer: {
    flex: 1,
    minHeight: 150,
    maxHeight: 200,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  logHeader: {
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  logContent: {
    padding: 12,
    maxHeight: 150,
    overflowY: 'auto',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  logItem: {
    marginBottom: 4,
    lineHeight: 1.4,
  },
  logScore: {
    color: '#6B7280',
  },
  logSelected: {
    color: '#059669',
    fontWeight: 600,
  },
  logError: {
    color: '#DC2626',
  },
  logInfo: {
    color: '#3B82F6',
  },
  estimatedTime: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
};
