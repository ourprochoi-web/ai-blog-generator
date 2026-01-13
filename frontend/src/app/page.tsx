import HomeContent from '@/components/HomeContent';
import {
  getArticlesByDate,
  getSourceStats,
  getArchiveDates,
  getCurrentEdition,
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
    content: '## Introduction\n\nThis is sample content for the article...',
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
    content: '## Introduction\n\nThis is sample content...',
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
    content: '## Introduction\n\nThis is sample content...',
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

interface HomePageProps {
  searchParams: Promise<{ edition?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  let articles: Article[] = sampleArticles;
  let sourceStats = { total: 0, by_type: { news: 0, paper: 0, article: 0 }, today_count: 0 };
  let archiveDates: string[] = [];

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  try {
    const [articlesResponse, statsResponse, archiveResponse] = await Promise.all([
      getArticlesByDate(today),
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

  // Determine initial edition from URL or current time
  const urlEdition = params.edition as 'morning' | 'evening' | undefined;
  const currentEdition = getCurrentEdition();
  const initialEdition = urlEdition || currentEdition;

  // Get yesterday for navigation
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const hasYesterday = archiveDates.includes(yesterday);

  return (
    <HomeContent
      morningArticles={morningArticles}
      eveningArticles={eveningArticles}
      noEditionArticles={noEditionArticles}
      sourceStats={sourceStats}
      archiveDates={archiveDates}
      initialEdition={initialEdition}
      today={today}
      yesterday={yesterday}
      hasYesterday={hasYesterday}
    />
  );
}
