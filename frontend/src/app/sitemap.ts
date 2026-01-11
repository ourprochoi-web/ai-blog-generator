import { MetadataRoute } from 'next';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aidailybrief.com';

interface Article {
  slug: string;
  updated_at: string;
  published_at: string | null;
}

async function getPublishedArticleSlugs(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_URL}/api/articles?status=published&page_size=1000`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedArticleSlugs();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // Article pages
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/article/${article.slug}`,
    lastModified: new Date(article.updated_at || article.published_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...staticPages, ...articlePages];
}
