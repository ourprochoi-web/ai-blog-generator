const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export type Edition = 'morning' | 'evening';

export interface Article {
  id: string;
  source_id: string | null;
  title: string;
  subtitle: string | null;
  slug: string;
  content: string;
  tags: string[];
  references: Array<{ url: string; title: string; verified: boolean }>;
  word_count: number;
  char_count: number;
  status: string;
  edition: Edition | null;
  meta_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  llm_model: string | null;
  generation_time_seconds: number | null;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  page_size: number;
}

export async function getArticles(
  page: number = 1,
  pageSize: number = 20,
  status?: string
): Promise<ArticlesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (status) {
    params.append('status', status);
  }

  const res = await fetch(`${API_URL}/api/articles?${params}`, {
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!res.ok) {
    throw new Error('Failed to fetch articles');
  }

  return res.json();
}

export async function getPublishedArticles(
  page: number = 1,
  pageSize: number = 20,
  edition?: Edition
): Promise<ArticlesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    status: 'published',
  });

  if (edition) {
    params.append('edition', edition);
  }

  const res = await fetch(`${API_URL}/api/articles?${params}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch published articles');
  }

  const data = await res.json();
  // Transform response format (items -> articles)
  return {
    articles: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    page_size: data.page_size || pageSize,
  };
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  const res = await fetch(`${API_URL}/api/articles/slug/${slug}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Article not found');
  }

  return res.json();
}

export async function getArticleById(id: string): Promise<Article> {
  const res = await fetch(`${API_URL}/api/articles/${id}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Article not found');
  }

  return res.json();
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Calculate read time
export function calculateReadTime(wordCount: number): string {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

// Get edition based on time
export function getEdition(dateString: string): 'morning' | 'evening' {
  const date = new Date(dateString);
  const hours = date.getHours();
  return hours < 12 ? 'morning' : 'evening';
}

// Get current edition based on KST time
export function getCurrentEdition(): 'morning' | 'evening' {
  // Get current time in KST (UTC+9)
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const localOffset = now.getTimezoneOffset();
  const kstTime = new Date(now.getTime() + (kstOffset + localOffset) * 60000);
  const kstHour = kstTime.getHours();

  // Morning: 00:00-12:00 KST, Evening: 12:00-24:00 KST
  // But show evening as latest after 8 PM (when evening edition is published)
  if (kstHour >= 20) {
    return 'evening';
  } else if (kstHour >= 8 && kstHour < 20) {
    return 'morning';
  } else {
    // Before 8 AM, show previous day's evening edition as latest
    return 'evening';
  }
}

// Get the latest edition order (which should be shown first)
export function getEditionOrder(): ['morning' | 'evening', 'morning' | 'evening'] {
  const current = getCurrentEdition();
  return current === 'morning' ? ['morning', 'evening'] : ['evening', 'morning'];
}

// Source statistics
export interface SourceStats {
  total: number;
  by_type: {
    news: number;
    paper: number;
    article: number;
  };
  today_count: number;
}

export async function getSourceStats(): Promise<SourceStats> {
  const res = await fetch(`${API_URL}/api/sources/stats`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) {
    throw new Error('Failed to fetch source stats');
  }

  return res.json();
}

// Archive dates
export interface ArchiveResponse {
  dates: string[];
}

export async function getArchiveDates(): Promise<ArchiveResponse> {
  const res = await fetch(`${API_URL}/api/articles/archive`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch archive dates');
  }

  return res.json();
}

// Articles by date
export async function getArticlesByDate(date: string): Promise<ArticlesResponse> {
  const res = await fetch(`${API_URL}/api/articles/by-date/${date}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch articles for date');
  }

  const data = await res.json();
  return {
    articles: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    page_size: data.page_size || 20,
  };
}

// Format date for display (short)
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
