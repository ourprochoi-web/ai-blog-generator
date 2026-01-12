'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Types
export interface Source {
  id: string;
  type: 'news' | 'paper' | 'article';
  title: string;
  url: string;
  content: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  scraped_at: string;
  status: 'pending' | 'selected' | 'processed' | 'skipped' | 'failed';
  error_message: string | null;
  relevance_score: number | null;
  created_at: string;
  updated_at: string;
}

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
  status: 'draft' | 'review' | 'published' | 'archived';
  edition: 'morning' | 'evening' | null;
  meta_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  llm_model: string | null;
  generation_time_seconds: number | null;
  source_relevance_score: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Helper for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// Articles API
export async function getArticles(
  page: number = 1,
  pageSize: number = 20,
  status?: string,
  edition?: 'morning' | 'evening'
): Promise<PaginatedResponse<Article>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (status) params.append('status', status);
  if (edition) params.append('edition', edition);

  return apiCall<PaginatedResponse<Article>>(`/api/articles?${params}`);
}

export async function getArticleById(id: string): Promise<Article> {
  return apiCall<Article>(`/api/articles/${id}`);
}

export async function updateArticle(
  id: string,
  data: Partial<Article>
): Promise<Article> {
  return apiCall<Article>(`/api/articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateArticleStatus(
  id: string,
  status: 'draft' | 'review' | 'published' | 'archived'
): Promise<Article> {
  return apiCall<Article>(`/api/articles/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteArticle(id: string): Promise<void> {
  await apiCall<void>(`/api/articles/${id}`, {
    method: 'DELETE',
  });
}

// Sources API
export async function getSources(
  page: number = 1,
  pageSize: number = 20,
  type?: string,
  status?: string
): Promise<PaginatedResponse<Source>> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  return apiCall<PaginatedResponse<Source>>(`/api/sources?${params}`);
}

export async function getSourceById(id: string): Promise<Source> {
  return apiCall<Source>(`/api/sources/${id}`);
}

export async function updateSourceStatus(
  id: string,
  status: 'pending' | 'selected' | 'processed' | 'skipped' | 'failed'
): Promise<Source> {
  return apiCall<Source>(`/api/sources/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteSource(id: string): Promise<void> {
  await apiCall<void>(`/api/sources/${id}`, {
    method: 'DELETE',
  });
}

export async function scrapeUrl(url: string): Promise<Source> {
  return apiCall<Source>('/api/sources/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// Generation API
export interface GenerateRequest {
  source_id: string;
  edition?: 'morning' | 'evening';
}

export interface GenerateResponse {
  article: Article;
  generation_time_seconds: number;
}

export async function generateArticle(
  request: GenerateRequest
): Promise<GenerateResponse> {
  return apiCall<GenerateResponse>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function previewArticle(
  sourceId: string
): Promise<{ content: string; title: string }> {
  return apiCall<{ content: string; title: string }>('/api/generate/preview', {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId }),
  });
}

export async function validateReferences(
  articleId: string
): Promise<{ results: Array<{ url: string; is_valid: boolean; error?: string }> }> {
  return apiCall('/api/generate/validate-refs', {
    method: 'POST',
    body: JSON.stringify({ article_id: articleId }),
  });
}

export async function regenerateImage(
  articleId: string
): Promise<{ og_image_url: string; image_size_bytes: number }> {
  return apiCall(`/api/articles/${articleId}/regenerate-image`, {
    method: 'POST',
  });
}

// Pipeline triggers (uses scheduler API)
interface SchedulerJobResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export async function triggerScraping(
  _type?: 'news' | 'paper' | 'article'
): Promise<{ message: string; sources_count: number }> {
  // Note: Backend scrape endpoint doesn't support type filter yet
  const result = await apiCall<SchedulerJobResult>('/api/scheduler/scrape', {
    method: 'POST',
  });
  return {
    message: result.message,
    sources_count: (result.data?.sources_count as number) || 0,
  };
}

export async function triggerGeneration(
  _edition?: 'morning' | 'evening'
): Promise<{ message: string; articles_count: number }> {
  // Note: Backend generate endpoint doesn't support edition filter yet
  const result = await apiCall<SchedulerJobResult>('/api/scheduler/generate', {
    method: 'POST',
  });
  return {
    message: result.message,
    articles_count: (result.data?.articles_count as number) || 0,
  };
}

export async function triggerFullPipeline(): Promise<{ message: string }> {
  const result = await apiCall<SchedulerJobResult>('/api/scheduler/run', {
    method: 'POST',
  });
  return { message: result.message };
}

// Evaluate pending sources
export interface EvaluateResponse {
  evaluations: Array<{
    source_id: string;
    relevance_score: number;
    suggested_topic: string;
    reason: string;
  }>;
  evaluated_count: number;
}

export async function evaluatePendingSources(): Promise<EvaluateResponse> {
  return apiCall<EvaluateResponse>('/api/sources/evaluate/pending', {
    method: 'POST',
  });
}

// Pipeline progress event from SSE stream
export interface PipelineProgressEvent {
  step: 'scrape' | 'evaluate' | 'generate' | 'done' | 'error';
  status: 'running' | 'completed' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

// Stream full pipeline with progress updates
export function streamFullPipeline(
  onProgress: (event: PipelineProgressEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): () => void {
  const eventSource = new EventSource(`${API_URL}/api/scheduler/run/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as PipelineProgressEvent;
      onProgress(data);

      // Close connection when done or error
      if (data.step === 'done' || data.step === 'error') {
        eventSource.close();
        onComplete?.();
      }
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    onError?.(new Error('Connection lost'));
  };

  // Return cleanup function
  return () => eventSource.close();
}

export async function getSchedulerStatus(): Promise<{
  running: boolean;
  next_run: string | null;
}> {
  return apiCall('/api/scheduler/status', { method: 'GET' });
}

// Stats
export interface DashboardStats {
  articles: {
    total: number;
    draft: number;
    review: number;
    published: number;
    archived: number;
  };
  sources: {
    total: number;
    pending: number;
    selected: number;
    processed: number;
    failed: number;
    skipped: number;
  };
  today: {
    articles_generated: number;
    sources_scraped: number;
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiCall<DashboardStats>('/api/admin/stats');
}

// Activity Logs API
export interface ActivityLog {
  id: string;
  type: 'scrape' | 'evaluate' | 'generate' | 'pipeline';
  status: 'running' | 'success' | 'error';
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogListResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getActivityLogs(
  page: number = 1,
  pageSize: number = 50,
  type?: string,
  status?: string
): Promise<ActivityLogListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  return apiCall<ActivityLogListResponse>(`/api/activity-logs?${params}`);
}

export async function getRecentActivityLogs(
  limit: number = 50,
  type?: string,
  status?: string
): Promise<ActivityLog[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  return apiCall<ActivityLog[]>(`/api/activity-logs/recent?${params}`);
}

// Format helpers
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}
