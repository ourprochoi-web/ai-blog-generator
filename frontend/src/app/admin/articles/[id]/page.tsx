'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  getArticleById,
  getSourceById,
  updateArticle,
  updateArticleStatus,
  regenerateImage,
  Article,
  Source,
  formatDate,
} from '@/lib/admin-api';

type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export default function ArticleEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Markdown editor ref
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert markdown at cursor position
  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newContent =
      content.substring(0, start) +
      prefix +
      textToInsert +
      suffix +
      content.substring(end);

    setContent(newContent);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + textToInsert.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content]);

  // Markdown formatting functions
  const formatBold = () => insertMarkdown('**', '**', 'bold text');
  const formatItalic = () => insertMarkdown('*', '*', 'italic text');
  const formatHeading2 = () => insertMarkdown('\n## ', '\n', 'Heading');
  const formatHeading3 = () => insertMarkdown('\n### ', '\n', 'Subheading');
  const formatLink = () => insertMarkdown('[', '](url)', 'link text');
  const formatCode = () => insertMarkdown('`', '`', 'code');
  const formatCodeBlock = () => insertMarkdown('\n```\n', '\n```\n', 'code block');
  const formatQuote = () => insertMarkdown('\n> ', '\n', 'quote');
  const formatBulletList = () => insertMarkdown('\n- ', '\n', 'list item');
  const formatNumberedList = () => insertMarkdown('\n1. ', '\n', 'list item');

  useEffect(() => {
    async function loadArticle() {
      try {
        setIsLoading(true);
        const data = await getArticleById(id);
        setArticle(data);
        setTitle(data.title);
        setSubtitle(data.subtitle || '');
        setContent(data.content);
        setTags(data.tags?.join(', ') || '');
        setMetaDescription(data.meta_description || '');

        // Load source if article has source_id
        if (data.source_id) {
          try {
            const sourceData = await getSourceById(data.source_id);
            setSource(sourceData);
          } catch {
            // Source may have been deleted
          }
        }
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

  const handleRegenerateImage = async () => {
    if (!article) return;

    const hasExistingImage = !!article.og_image_url;
    const confirmMessage = hasExistingImage
      ? 'This will replace the current image. Continue?'
      : 'Generate a new hero image for this article?';

    if (!confirm(confirmMessage)) return;

    try {
      setIsRegeneratingImage(true);
      setError(null);
      const result = await regenerateImage(id);
      setArticle({ ...article, og_image_url: result.og_image_url });
      alert('Image generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!article || !article.og_image_url) return;

    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      setIsSaving(true);
      setError(null);
      const updatedArticle = await updateArticle(id, { og_image_url: null });
      setArticle(updatedArticle);
      alert('Image deleted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
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
              {source && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.sourceLink}
                  title={source.title}
                >
                  View Source ({source.type})
                </a>
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
          {/* Hero Image */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Hero Image (OG Image)</label>
            <div style={styles.imageSection}>
              {isRegeneratingImage ? (
                <div style={styles.imageLoading}>
                  <div style={styles.spinner} />
                  <p style={styles.loadingText}>Generating image with AI...</p>
                  <p style={styles.loadingSubtext}>This may take 10-30 seconds</p>
                </div>
              ) : article.og_image_url ? (
                <div style={styles.imagePreview}>
                  <img
                    src={article.og_image_url}
                    alt="Hero image"
                    style={styles.heroImage}
                  />
                  <div style={styles.imageActions}>
                    <a
                      href={article.og_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.viewImageLink}
                    >
                      View Full Size
                    </a>
                    <button
                      onClick={handleRegenerateImage}
                      disabled={isRegeneratingImage || isSaving}
                      style={styles.regenerateButton}
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={handleDeleteImage}
                      disabled={isRegeneratingImage || isSaving}
                      style={styles.deleteImageButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.noImage}>
                  <p style={styles.noImageText}>No hero image yet</p>
                  <button
                    onClick={handleRegenerateImage}
                    disabled={isRegeneratingImage}
                    style={styles.generateImageButton}
                  >
                    Generate Image
                  </button>
                </div>
              )}
            </div>
          </div>

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

          {/* Content with Markdown Toolbar */}
          <div style={styles.formGroup}>
            <div style={styles.editorHeader}>
              <label style={styles.label}>Content (Markdown)</label>
              <span style={styles.wordCount}>
                {content.split(/\s+/).filter(Boolean).length} words | {content.length} chars
              </span>
            </div>

            {/* Markdown Toolbar */}
            <div style={styles.toolbar}>
              <button type="button" onClick={formatBold} style={styles.toolbarButton} title="Bold (Ctrl+B)">
                <strong>B</strong>
              </button>
              <button type="button" onClick={formatItalic} style={styles.toolbarButton} title="Italic (Ctrl+I)">
                <em>I</em>
              </button>
              <span style={styles.toolbarDivider} />
              <button type="button" onClick={formatHeading2} style={styles.toolbarButton} title="Heading 2">
                H2
              </button>
              <button type="button" onClick={formatHeading3} style={styles.toolbarButton} title="Heading 3">
                H3
              </button>
              <span style={styles.toolbarDivider} />
              <button type="button" onClick={formatLink} style={styles.toolbarButton} title="Insert Link">
                Link
              </button>
              <button type="button" onClick={formatCode} style={styles.toolbarButton} title="Inline Code">
                {'</>'}
              </button>
              <button type="button" onClick={formatCodeBlock} style={styles.toolbarButton} title="Code Block">
                {'{ }'}
              </button>
              <span style={styles.toolbarDivider} />
              <button type="button" onClick={formatQuote} style={styles.toolbarButton} title="Quote">
                &ldquo;&rdquo;
              </button>
              <button type="button" onClick={formatBulletList} style={styles.toolbarButton} title="Bullet List">
                &bull; List
              </button>
              <button type="button" onClick={formatNumberedList} style={styles.toolbarButton} title="Numbered List">
                1. List
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={styles.textarea}
              placeholder="Write your article content in Markdown..."
              rows={30}
              onKeyDown={(e) => {
                // Keyboard shortcuts
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'b') {
                    e.preventDefault();
                    formatBold();
                  } else if (e.key === 'i') {
                    e.preventDefault();
                    formatItalic();
                  } else if (e.key === 'k') {
                    e.preventDefault();
                    formatLink();
                  }
                }
              }}
            />
            <p style={styles.editorHint}>
              Tip: Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link
            </p>
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
  sourceLink: {
    fontSize: 13,
    color: '#3B82F6',
    textDecoration: 'none',
    padding: '4px 10px',
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
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
  imageSection: {
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  imagePreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  heroImage: {
    width: '100%',
    maxWidth: 600,
    height: 'auto',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
  },
  imageActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  viewImageLink: {
    fontSize: 14,
    color: '#3B82F6',
    textDecoration: 'none',
  },
  regenerateButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    cursor: 'pointer',
  },
  deleteImageButton: {
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    color: '#DC2626',
    backgroundColor: 'white',
    border: '1px solid #FCA5A5',
    borderRadius: 6,
    cursor: 'pointer',
  },
  noImage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  noImageText: {
    fontSize: 14,
    color: '#6B7280',
  },
  generateImageButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    color: 'white',
    backgroundColor: '#8B5CF6',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  imageLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 48,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #E5E7EB',
    borderTopColor: '#8B5CF6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 500,
    color: '#374151',
    margin: 0,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    margin: 0,
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
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordCount: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px 8px 0 0',
    border: '1px solid #D1D5DB',
    borderBottom: 'none',
  },
  toolbarButton: {
    padding: '6px 10px',
    fontSize: 13,
    fontWeight: 500,
    color: '#4B5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#D1D5DB',
    margin: '0 6px',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: 15,
    fontFamily: 'monospace',
    border: '1px solid #D1D5DB',
    borderRadius: '0 0 8px 8px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
  },
  editorHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
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
