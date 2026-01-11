'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  getArticleById,
  updateArticle,
  updateArticleStatus,
  Article,
  formatDate,
} from '@/lib/admin-api';

type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export default function ArticleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    async function loadArticle() {
      try {
        setIsLoading(true);
        const data = await getArticleById(id);
        setArticle(data);
        setTitle(data.title);
        setSubtitle(data.subtitle || '');
        setContent(data.content);
        setTags(data.tags.join(', '));
        setMetaDescription(data.meta_description || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        setIsLoading(false);
      }
    }

    loadArticle();
  }, [id]);

  const handleSave = async () => {
    if (!article) return;

    try {
      setIsSaving(true);
      setError(null);

      const updatedArticle = await updateArticle(id, {
        title,
        subtitle: subtitle || null,
        content,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        meta_description: metaDescription || null,
      });

      setArticle(updatedArticle);
      alert('Article saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ArticleStatus) => {
    if (!article) return;

    const confirmMessages: Record<string, string> = {
      published: 'Are you sure you want to publish this article?',
      archived: 'Are you sure you want to archive this article?',
      draft: 'Are you sure you want to move this article back to draft?',
      review: 'Are you sure you want to move this article to review?',
    };

    if (!confirm(confirmMessages[newStatus])) return;

    try {
      setIsSaving(true);
      const updatedArticle = await updateArticleStatus(id, newStatus);
      setArticle(updatedArticle);
      alert(`Article ${newStatus === 'published' ? 'published' : 'status updated'}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <p>Loading article...</p>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div style={styles.errorPage}>
        <p>Error: {error}</p>
        <Link href="/admin/articles" style={styles.backLink}>
          Back to Articles
        </Link>
      </div>
    );
  }

  if (!article) return null;

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

  const statusStyle = getStatusColor(article.status);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/admin/articles" style={styles.backButton}>
            ← Back
          </Link>
          <div>
            <h1 style={styles.title}>Edit Article</h1>
            <div style={styles.meta}>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.color,
                }}
              >
                {article.status}
              </span>
              <span style={styles.metaText}>
                Created {formatDate(article.created_at)}
              </span>
              {article.word_count && (
                <span style={styles.metaText}>{article.word_count} words</span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={styles.previewButton}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>

          {article.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={isSaving}
              style={styles.publishButton}
            >
              Publish
            </button>
          )}

          {article.status === 'published' && (
            <button
              onClick={() => handleStatusChange('archived')}
              disabled={isSaving}
              style={styles.archiveButton}
            >
              Archive
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <p>{error}</p>
        </div>
      )}

      {/* Editor / Preview */}
      {showPreview ? (
        <div style={styles.previewContainer}>
          <div style={styles.previewHeader}>
            <h1 style={styles.previewTitle}>{title}</h1>
            {subtitle && <p style={styles.previewSubtitle}>{subtitle}</p>}
            <div style={styles.previewTags}>
              {tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} style={styles.previewTag}>
                    {tag}
                  </span>
                ))}
            </div>
          </div>
          <div className="article-content" style={styles.previewContent}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div style={styles.editorContainer}>
          {/* Title */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Article title"
            />
          </div>

          {/* Subtitle */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              style={styles.input}
              placeholder="Optional subtitle"
            />
          </div>

          {/* Tags */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={styles.input}
              placeholder="#AI, #MachineLearning, #Tech"
            />
          </div>

          {/* Meta Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Meta Description <span style={styles.labelHint}>(for SEO)</span>
            </label>
            <input
              type="text"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              style={styles.input}
              placeholder="Brief description for search engines (max 160 chars)"
              maxLength={160}
            />
            <span style={styles.charCount}>{metaDescription.length}/160</span>
          </div>

          {/* Content */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Content (Markdown)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={styles.textarea}
              placeholder="Write your article content in Markdown..."
              rows={30}
            />
          </div>

          {/* References */}
          {article.references && article.references.length > 0 && (
            <div style={styles.formGroup}>
              <label style={styles.label}>References</label>
              <div style={styles.referencesBox}>
                {article.references.map((ref, index) => (
                  <div key={index} style={styles.referenceItem}>
                    <span style={styles.referenceTitle}>{ref.title}</span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.referenceUrl}
                    >
                      {ref.url}
                    </a>
                    <span
                      style={{
                        ...styles.verifiedBadge,
                        backgroundColor: ref.verified ? '#D1FAE5' : '#FEF3C7',
                        color: ref.verified ? '#065F46' : '#92400E',
                      }}
                    >
                      {ref.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  errorPage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 400,
    color: '#DC2626',
    gap: 16,
  },
  backLink: {
    color: '#3B82F6',
    textDecoration: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: '1px solid #E5E7EB',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
  },
  backButton: {
    padding: '8px 12px',
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    textDecoration: 'none',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  headerActions: {
    display: 'flex',
    gap: 12,
  },
  previewButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  publishButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#10B981',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  archiveButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    color: '#DC2626',
    marginBottom: 24,
  },
  editorContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
    fontWeight: 400,
    color: '#9CA3AF',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    outline: 'none',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    display: 'block',
    textAlign: 'right',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: 15,
    fontFamily: 'monospace',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
  },
  referencesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  referenceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    flex: 1,
  },
  referenceUrl: {
    fontSize: 13,
    color: '#3B82F6',
    textDecoration: 'none',
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  verifiedBadge: {
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
  },
  previewContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 48,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    maxWidth: 720,
    margin: '0 auto',
  },
  previewHeader: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: '1px solid #E5E7EB',
  },
  previewTitle: {
    fontSize: 36,
    fontWeight: 400,
    lineHeight: 1.2,
    color: '#1a1a1a',
    marginBottom: 12,
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  previewSubtitle: {
    fontSize: 20,
    color: '#4B5563',
    lineHeight: 1.5,
    fontWeight: 300,
    marginBottom: 20,
  },
  previewTags: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  previewTag: {
    padding: '6px 12px',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    fontSize: 13,
    color: '#4B5563',
  },
  previewContent: {
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: 18,
    lineHeight: 1.8,
    color: '#374151',
  },
};
