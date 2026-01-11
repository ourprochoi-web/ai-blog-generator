import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getArticleBySlug, formatDate, calculateReadTime, Article } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

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
  params: { slug: string };
}

export default async function ArticlePage({ params }: PageProps) {
  let article: Article = sampleArticle;

  try {
    article = await getArticleBySlug(params.slug);
  } catch (error) {
    // Use sample data if API fails
    console.log('Using sample article');
  }

  const category = article.tags[0]?.replace('#', '') || 'AI News';
  const date = formatDate(article.created_at);
  const readTime = calculateReadTime(article.word_count);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

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
            href="/"
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
            <span>←</span> Back to all stories
          </Link>

          {/* Article Header */}
          <header style={{ marginBottom: '40px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
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
            <ReactMarkdown>{article.content}</ReactMarkdown>
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
              href="/"
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
              <span>←</span> All stories
            </Link>

            <button
              style={{
                padding: '10px 16px',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Share
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
