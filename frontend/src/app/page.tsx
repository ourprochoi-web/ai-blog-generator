import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AIInsightBox from '@/components/AIInsightBox';
import NewsletterCTA from '@/components/NewsletterCTA';
import DateNavigation from '@/components/DateNavigation';
import EditionSection from '@/components/EditionSection';
import {
  getPublishedArticles,
  getSourceStats,
  getArchiveDates,
  getEditionOrder,
  Article,
} from '@/lib/api';

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
    edition: 'morning',
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
    edition: 'morning',
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
    edition: 'evening',
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
  let sourceStats = { total: 0, by_type: { news: 0, paper: 0, article: 0 }, today_count: 0 };
  let archiveDates: string[] = [];

  try {
    const [articlesResponse, statsResponse, archiveResponse] = await Promise.all([
      getPublishedArticles(1, 20),
      getSourceStats().catch(() => sourceStats),
      getArchiveDates().catch(() => ({ dates: [] })),
    ]);

    if (articlesResponse.articles && articlesResponse.articles.length > 0) {
      articles = articlesResponse.articles;
    }
    sourceStats = statsResponse;
    archiveDates = archiveResponse.dates || [];
  } catch (error) {
    // Use sample data if API fails
    console.log('Using sample data');
  }

  // Separate articles by edition
  const morningArticles = articles.filter((a) => a.edition === 'morning');
  const eveningArticles = articles.filter((a) => a.edition === 'evening');
  const noEditionArticles = articles.filter((a) => !a.edition);

  // Get edition order based on current time
  const [latestEdition, previousEdition] = getEditionOrder();

  // Get today's date for navigation
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hasYesterday = archiveDates.includes(yesterday);

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
          {/* Date Navigation */}
          {hasYesterday && (
            <DateNavigation
              currentDate={today}
              previousDate={yesterday}
              archiveDates={archiveDates}
            />
          )}

          {/* AI Insight Box */}
          <AIInsightBox
            totalSources={sourceStats.total}
            newsSources={sourceStats.by_type.news}
            paperSources={sourceStats.by_type.paper}
            articleSources={sourceStats.by_type.article}
            storiesSelected={articles.length}
          />

          {/* Edition Sections - Latest first, previous collapsible */}
          {latestEdition === 'morning' ? (
            <>
              <EditionSection
                edition="morning"
                articles={morningArticles}
                isLatest={true}
              />
              {eveningArticles.length > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '48px 0 24px 0' }} />
                  <EditionSection
                    edition="evening"
                    articles={eveningArticles}
                    isLatest={false}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <EditionSection
                edition="evening"
                articles={eveningArticles}
                isLatest={true}
              />
              {morningArticles.length > 0 && (
                <>
                  <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '48px 0 24px 0' }} />
                  <EditionSection
                    edition="morning"
                    articles={morningArticles}
                    isLatest={false}
                  />
                </>
              )}
            </>
          )}

          {/* No edition articles (fallback) */}
          {noEditionArticles.length > 0 && morningArticles.length === 0 && eveningArticles.length === 0 && (
            <EditionSection
              edition="morning"
              articles={noEditionArticles}
              isLatest={true}
            />
          )}

          {/* Newsletter CTA */}
          <NewsletterCTA />
        </div>
      </main>

      <Footer />
    </div>
  );
}
