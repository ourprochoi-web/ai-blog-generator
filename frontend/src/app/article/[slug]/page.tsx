import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getArticleBySlug, formatDate, calculateReadTime, Article } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Metadata } from 'next';
import ShareButtons from '@/components/ShareButtons';
import ReadingProgress from '@/components/ReadingProgress';

// Hero placeholder for article detail page
function HeroPlaceholder({ category }: { category: string }) {
  const getGradient = (cat: string) => {
    const gradients: Record<string, string> = {
      Breakthrough: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      Industry: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      Regulation: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)',
      Research: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
      Innovation: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      Business: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      Analysis: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    };
    return gradients[cat] || 'linear-gradient(135deg, #6b7280 0%, #374151 100%)';
  };

  return (
    <div
      style={{
        width: '100%',
        height: '300px',
        background: getGradient(category),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          backdropFilter: 'blur(8px)',
        }}
      >
        ⚡
      </div>
    </div>
  );
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aidailybrief.com';

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);

    const description =
      article.meta_description ||
      article.subtitle ||
      article.content
        .substring(0, 160)
        .replace(/[#*\n]/g, '')
        .trim() + '...';
    const ogImage = article.og_image_url || `${SITE_URL}/og-image.png`;
    const articleUrl = `${SITE_URL}/article/${article.slug}`;

    return {
      title: article.title,
      description,
      keywords: article.tags.map((tag) => tag.replace('#', '')),
      authors: [{ name: 'AI Daily Brief' }],
      openGraph: {
        type: 'article',
        url: articleUrl,
        title: article.title,
        description,
        siteName: 'AI Daily Brief',
        publishedTime: article.published_at || article.created_at,
        modifiedTime: article.updated_at,
        tags: article.tags.map((tag) => tag.replace('#', '')),
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description,
        images: [ogImage],
      },
      alternates: {
        canonical: articleUrl,
      },
    };
  } catch {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.',
    };
  }
}

// Sample article for development
const sampleArticle: Article = {
  id: '1',
  source_id: null,
  title: "OpenAI's New Reasoning Model Achieves Human-Level Performance on PhD-Level Science",
  subtitle:
    'A breakthrough that could reshape how we approach complex scientific problems — and why it matters for everyone.',
  slug: 'openai-reasoning-model-breakthrough',
  content: `The landscape of artificial intelligence shifted dramatically this week with the announcement of a new reasoning model that has demonstrated unprecedented performance on complex scientific tasks. This isn't just another incremental improvement — it represents a fundamental change in what AI systems can accomplish.

For years, researchers have been working toward systems that can truly reason rather than simply pattern-match. The difference matters: pattern matching finds answers in training data, while reasoning constructs solutions to novel problems. This new model appears to cross that threshold in meaningful ways.

## Why This Matters to You

For researchers, this means AI can now serve as a genuine collaborator in tackling problems that previously required years of specialized training. For businesses, it opens doors to applications that seemed impossibly far off just months ago. For everyone else, it signals a world where expert-level analysis becomes dramatically more accessible.

The benchmarks are striking: 89.4% accuracy on PhD-level science questions, 78.2% on Math Olympiad problems, and near-perfect scores on complex multi-step reasoning tasks. But numbers only tell part of the story. What's more impressive is how the model handles uncertainty — acknowledging when it doesn't know something rather than confabulating an answer.

## The Competitive Landscape

Google DeepMind has already announced an accelerated timeline for their next Gemini release. Anthropic remains characteristically quiet but is rumored to be close to a major announcement. The AI race, which some thought might be slowing, has clearly entered a new phase.

What makes this moment different from previous cycles of AI hype is the tangible nature of the improvements. These aren't benchmarks that only matter to researchers — they translate directly into real-world capabilities that businesses and individuals can use today.

## Looking Ahead

The implications extend beyond the laboratory. Healthcare, climate science, materials engineering, drug discovery — virtually every field that relies on complex reasoning stands to benefit from these advances. The question is no longer whether AI will transform these fields, but how quickly the transformation will unfold.

For now, the message is clear: the tools available to solve hard problems just got dramatically better. How we choose to use them will shape the next chapter of human progress.`,
  tags: ['#Breakthrough', '#AI', '#OpenAI', '#MachineLearning', '#FutureOfAI'],
  references: [
    { url: 'https://openai.com/blog', title: 'OpenAI Research Blog', verified: true },
    { url: 'https://arxiv.org', title: 'arXiv: Advances in AI Reasoning Systems', verified: true },
  ],
  word_count: 1600,
  char_count: 8000,
  status: 'published',
  edition: 'morning',
  meta_description: null,
  og_image_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  llm_model: 'gemini-2.5-flash',
  generation_time_seconds: 45,
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  let article: Article = sampleArticle;

  try {
    article = await getArticleBySlug(slug);
  } catch (error) {
    // Use sample data if API fails
    console.log('Using sample article');
  }

  const category = article.tags[0]?.replace('#', '') || 'AI News';
  const date = formatDate(article.created_at);
  const readTime = calculateReadTime(article.word_count);

  // Edition info
  const editionIcon = article.edition === 'morning' ? '☀️' : '🌙';
  const editionLabel = article.edition === 'morning' ? 'Morning' : 'Evening';

  // Category style
  const getCategoryStyle = (cat: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Breakthrough: { bg: '#FEF3C7', color: '#92400E' },
      Industry: { bg: '#DBEAFE', color: '#1E40AF' },
      Regulation: { bg: '#FCE7F3', color: '#9D174D' },
      Research: { bg: '#D1FAE5', color: '#065F46' },
    };
    return styles[cat] || { bg: '#F3F4F6', color: '#374151' };
  };

  const categoryStyle = getCategoryStyle(category);

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description:
      article.meta_description ||
      article.subtitle ||
      article.content
        .substring(0, 160)
        .replace(/[#*\n]/g, '')
        .trim(),
    image: article.og_image_url || `${SITE_URL}/og-image.png`,
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at,
    author: {
      '@type': 'Organization',
      name: 'AI Daily Brief',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI Daily Brief',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/article/${article.slug}`,
    },
    keywords: article.tags.map((tag) => tag.replace('#', '')).join(', '),
    wordCount: article.word_count,
    articleSection: category,
  };

  const shareUrl = `${SITE_URL}/article/${article.slug}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Reading Progress Bar */}
      <ReadingProgress />

      {/* JSON-LD for SEO */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<div style={{ height: 73 }} />}>
        <Header initialEdition={article.edition || 'morning'} />
      </Suspense>

      <main style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
        <div
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* Back Button */}
          <Link
            href={`/?edition=${article.edition || 'morning'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#6B7280',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '32px',
            }}
          >
            <span>←</span> Back to {editionLabel} Edition
          </Link>

          {/* Article Header */}
          <header style={{ marginBottom: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '4px 10px',
                  backgroundColor: categoryStyle.bg,
                  color: categoryStyle.color,
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {category}
              </span>
              {article.edition && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: '#6B7280',
                  }}
                >
                  {editionIcon} {editionLabel}
                </span>
              )}
              <span style={{ color: '#D1D5DB' }}>·</span>
              <span
                style={{
                  fontSize: '13px',
                  color: '#6B7280',
                }}
              >
                {date} · {readTime}
              </span>
            </div>

            <h1
              className="font-serif"
              style={{
                fontSize: '42px',
                fontWeight: '400',
                lineHeight: '1.2',
                marginBottom: '20px',
                letterSpacing: '-1px',
                color: '#1a1a1a',
              }}
            >
              {article.title}
            </h1>

            {article.subtitle && (
              <p
                style={{
                  fontSize: '20px',
                  color: '#4B5563',
                  lineHeight: '1.5',
                  fontWeight: '300',
                }}
              >
                {article.subtitle}
              </p>
            )}
          </header>

          {/* Hero Image */}
          <div
            style={{
              marginBottom: '40px',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {article.og_image_url ? (
              <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                <Image
                  src={article.og_image_url}
                  alt={article.title}
                  fill
                  sizes="(max-width: 680px) 100vw, 680px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </div>
            ) : (
              <HeroPlaceholder category={category} />
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '0 0 40px 0',
            }}
          />

          {/* Article Body */}
          <article className="article-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
          </article>

          {/* Tags */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '48px',
              paddingTop: '24px',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            {article.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '16px',
                  fontSize: '13px',
                  color: '#4B5563',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* References */}
          {article.references.length > 0 && (
            <div
              style={{
                marginTop: '32px',
                padding: '24px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
              }}
            >
              <h4
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6B7280',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                References
              </h4>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                }}
              >
                {article.references.map((ref, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '14px',
                      color: '#4B5563',
                      marginBottom: '8px',
                    }}
                  >
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563EB', textDecoration: 'none' }}
                    >
                      {ref.title}
                    </a>
                    {ref.verified && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#059669' }}>✓ Verified</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '48px',
              paddingTop: '24px',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            <Link
              href={`/?edition=${article.edition || 'morning'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#1a1a1a',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '10px 16px',
                textDecoration: 'none',
              }}
            >
              <span>←</span> {editionLabel} Edition
            </Link>

            <ShareButtons url={shareUrl} title={article.title} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
