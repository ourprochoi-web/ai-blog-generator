import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import ArticleCard from '@/components/ArticleCard';
import NewsletterCTA from '@/components/NewsletterCTA';
import { getPublishedArticles, Article, formatDate, calculateReadTime } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

// Sample data for development (when API is not available)
const sampleArticles: Article[] = [
  {
    id: '1',
    source_id: null,
    title: "OpenAI's New Reasoning Model Achieves Human-Level Performance on PhD-Level Science",
    subtitle:
      'A breakthrough that could reshape how we approach complex scientific problems — and why it matters for everyone.',
    slug: 'openai-reasoning-model-breakthrough',
    content: '',
    tags: ['#Breakthrough', '#AI', '#OpenAI'],
    references: [],
    word_count: 1600,
    char_count: 8000,
    status: 'published',
    meta_description: null,
    og_image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    llm_model: 'gemini-2.5-flash',
    generation_time_seconds: 45,
  },
  {
    id: '2',
    source_id: null,
    title: 'Google DeepMind Unveils Gemini 2.5: The Race Intensifies',
    subtitle:
      'With enhanced multimodal capabilities and improved reasoning, Google fires back in the AI arms race.',
    slug: 'google-deepmind-gemini-25',
    content: '',
    tags: ['#Industry', '#Google', '#AI'],
    references: [],
    word_count: 1000,
    char_count: 5000,
    status: 'published',
    meta_description: null,
    og_image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    llm_model: 'gemini-2.5-flash',
    generation_time_seconds: 30,
  },
  {
    id: '3',
    source_id: null,
    title: "EU AI Act Takes Effect: What Companies Need to Know",
    subtitle:
      "The world's first comprehensive AI regulation is now law. Here's how it affects you.",
    slug: 'eu-ai-act-takes-effect',
    content: '',
    tags: ['#Regulation', '#Policy', '#AI'],
    references: [],
    word_count: 1200,
    char_count: 6000,
    status: 'published',
    meta_description: null,
    og_image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    llm_model: 'gemini-2.5-flash',
    generation_time_seconds: 35,
  },
];

export default async function HomePage() {
  let articles: Article[] = sampleArticles;

  try {
    const response = await getPublishedArticles(1, 20);
    if (response.articles && response.articles.length > 0) {
      articles = response.articles;
    }
  } catch (error) {
    // Use sample data if API fails
    console.log('Using sample data');
  }

  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1);

  // Category style helper
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      Breakthrough: { bg: '#FEF3C7', color: '#92400E' },
      Industry: { bg: '#DBEAFE', color: '#1E40AF' },
      Regulation: { bg: '#FCE7F3', color: '#9D174D' },
      Research: { bg: '#D1FAE5', color: '#065F46' },
    };
    return styles[category] || { bg: '#F3F4F6', color: '#374151' };
  };

  const featuredCategory = featuredArticle?.tags[0]?.replace('#', '') || 'AI News';
  const featuredCategoryStyle = getCategoryStyle(featuredCategory);
  const featuredDate = featuredArticle ? formatDate(featuredArticle.created_at) : '';
  const featuredReadTime = featuredArticle ? calculateReadTime(featuredArticle.word_count) : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main
        style={{
          flex: 1,
          backgroundColor: '#FAFAF9',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* AI Insight Box */}
          <AIInsightBox />

          {/* Featured Article - Full Content */}
          {featuredArticle && (
            <article style={{ marginBottom: '48px' }}>
              {/* Category & Date */}
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
                    backgroundColor: featuredCategoryStyle.bg,
                    color: featuredCategoryStyle.color,
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {featuredCategory}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#6B7280',
                  }}
                >
                  {featuredDate} · {featuredReadTime}
                </span>
              </div>

              {/* Title */}
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
                {featuredArticle.title}
              </h1>

              {/* Subtitle */}
              {featuredArticle.subtitle && (
                <p
                  style={{
                    fontSize: '20px',
                    color: '#4B5563',
                    lineHeight: '1.5',
                    fontWeight: '300',
                    marginBottom: '32px',
                  }}
                >
                  {featuredArticle.subtitle}
                </p>
              )}

              {/* Divider before content */}
              <div
                style={{
                  height: '1px',
                  backgroundColor: '#E5E7EB',
                  margin: '0 0 32px 0',
                }}
              />

              {/* Full Article Content */}
              <div className="article-content">
                <ReactMarkdown>{featuredArticle.content}</ReactMarkdown>
              </div>

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
                {featuredArticle.tags.map((tag) => (
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
              {featuredArticle.references.length > 0 && (
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
                    {featuredArticle.references.map((ref, index) => (
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
            </article>
          )}

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '32px 0',
            }}
          />

          {/* More Stories Label */}
          {otherArticles.length > 0 && (
            <>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}
              >
                Also in today&apos;s brief
              </h3>

              {/* Article List */}
              {otherArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </>
          )}

          {/* Newsletter CTA */}
          <NewsletterCTA />
        </div>
      </main>

      <Footer />
    </div>
  );
}
