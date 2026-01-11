import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import ArticleCard from '@/components/ArticleCard';
import NewsletterCTA from '@/components/NewsletterCTA';
import { getPublishedArticles, Article } from '@/lib/api';

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

          {/* Featured Article */}
          {featuredArticle && <ArticleCard article={featuredArticle} featured />}

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: '#E5E7EB',
              margin: '0 0 32px 0',
            }}
          />

          {/* More Stories Label */}
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

          {/* Newsletter CTA */}
          <NewsletterCTA />
        </div>
      </main>

      <Footer />
    </div>
  );
}
