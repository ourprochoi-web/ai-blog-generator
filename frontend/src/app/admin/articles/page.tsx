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
type SortField = 'created_at' | 'title' | 'word_count';
type SortOrder = 'asc' | 'desc';

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

  // New features
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const loadArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getArticles(page, 50, statusFilter || undefined);
      setArticles(res.items || []);
      setTotal(res.total || 0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load articles');
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Filter and sort articles
  const filteredArticles = articles
    .filter((article) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        (article.subtitle?.toLowerCase().includes(query) ?? false) ||
        article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'word_count') {
        comparison = (a.word_count || 0) - (b.word_count || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

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

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedIds.size === filteredArticles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArticles.map((a) => a.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedIds.size === 0) return;

    const actionLabels = {
      publish: 'publish',
      archive: 'archive',
      delete: 'delete',
    };

    if (!confirm(`Are you sure you want to ${actionLabels[action]} ${selectedIds.size} articles?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const ids = Array.from(selectedIds);

      for (const id of ids) {
        if (action === 'delete') {
          await deleteArticle(id);
        } else {
          await updateArticleStatus(id, action === 'publish' ? 'published' : 'archived');
        }
      }

      await loadArticles();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} articles`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const setFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    router.push(`/admin/articles?${params.toString()}`);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Articles</h1>
          <p style={styles.subtitle}>
            {total} total articles
            {searchQuery && ` · ${filteredArticles.length} matching`}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearSearch}>
              ✕
            </button>
          )}
        </div>

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
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div style={styles.bulkActions}>
          <span style={styles.selectedCount}>{selectedIds.size} selected</span>
          <button
            onClick={() => handleBulkAction('publish')}
            disabled={bulkActionLoading}
            style={styles.bulkPublish}
          >
            Publish All
          </button>
          <button
            onClick={() => handleBulkAction('archive')}
            disabled={bulkActionLoading}
            style={styles.bulkArchive}
          >
            Archive All
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={bulkActionLoading}
            style={styles.bulkDelete}
          >
            Delete All
          </button>
          <button onClick={() => setSelectedIds(new Set())} style={styles.bulkCancel}>
            Cancel
          </button>
        </div>
      )}

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
                <th style={{ ...styles.th, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredArticles.length && filteredArticles.length > 0}
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                  />
                </th>
                <th
                  style={{ ...styles.th, cursor: 'pointer' }}
                  onClick={() => handleSort('title')}
                >
                  Title {getSortIcon('title')}
                </th>
                <th style={{ ...styles.th, width: 100 }}>Status</th>
                <th style={{ ...styles.th, width: 60 }}>Score</th>
                <th
                  style={{ ...styles.th, width: 80, cursor: 'pointer' }}
                  onClick={() => handleSort('word_count')}
                >
                  Words {getSortIcon('word_count')}
                </th>
                <th
                  style={{ ...styles.th, width: 120, cursor: 'pointer' }}
                  onClick={() => handleSort('created_at')}
                >
                  Created {getSortIcon('created_at')}
                </th>
                <th style={{ ...styles.th, width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={styles.emptyCell}>
                    {searchQuery ? 'No articles match your search' : 'No articles found'}
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => {
                  const statusStyle = getStatusColor(article.status);
                  const isProcessing = actionLoading === article.id;
                  const isSelected = selectedIds.has(article.id);

                  return (
                    <tr
                      key={article.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                      }}
                    >
                      <td style={styles.td}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelect(article.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.td}>
                        <Link href={`/admin/articles/${article.id}`} style={styles.articleLink}>
                          <div style={styles.articleTitle}>{article.title}</div>
                          {article.subtitle && (
                            <div style={styles.articleSubtitle}>{article.subtitle}</div>
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
                      <td style={styles.td}>
                        {article.source_relevance_score != null ? (
                          <span style={styles.scoreBadge}>{article.source_relevance_score}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>{article.word_count || '-'}</td>
                      <td style={styles.td}>{formatRelativeTime(article.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {isProcessing ? (
                            <span style={styles.processing}>Processing...</span>
                          ) : (
                            <>
                              {article.status === 'published' && (
                                <a
                                  href={`/article/${article.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.viewButton}
                                >
                                  View
                                </a>
                              )}
                              {article.status === 'draft' && (
                                <button
                                  onClick={() => handleStatusChange(article.id, 'published')}
                                  style={styles.publishButton}
                                >
                                  Publish
                                </button>
                              )}
                              {article.status === 'published' && (
                                <button
                                  onClick={() => handleStatusChange(article.id, 'archived')}
                                  style={styles.archiveButton}
                                >
                                  Archive
                                </button>
                              )}
                              <Link href={`/admin/articles/${article.id}`} style={styles.editButton}>
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(article.id, article.title)}
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
      {!isLoading && total > 50 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.pageButton}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>
            Page {page} of {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
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
  toolbar: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    position: 'relative',
    flex: 1,
    minWidth: 200,
    maxWidth: 400,
  },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 14px',
    fontSize: 14,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    outline: 'none',
  },
  clearSearch: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    fontSize: 14,
  },
  filters: {
    display: 'flex',
    gap: 8,
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
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1E40AF',
  },
  bulkPublish: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkArchive: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkDelete: {
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 500,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  bulkCancel: {
    padding: '6px 12px',
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    marginLeft: 'auto',
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
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
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
    maxWidth: 350,
  },
  statusBadge: {
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
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  actions: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  processing: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewButton: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#6B7280',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 4,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  publishButton: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  archiveButton: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  editButton: {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    border: 'none',
    borderRadius: 4,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 10px',
    fontSize: 12,
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
