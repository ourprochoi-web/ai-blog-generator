'use client';

/**
 * Admin API Client
 *
 * All admin API calls go through Next.js API routes (/api/*) which proxy
 * to the backend with the API key. This keeps the API key server-side only.
 */

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

// Helper for API calls (all calls go through internal proxy)
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // All calls go to internal Next.js API routes (no external API key needed)
  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));

    // Provide more specific error messages for auth failures
    if (res.status === 401) {
      throw new Error('Authentication required. Please configure ADMIN_API_KEY on the server.');
    }
    if (res.status === 403) {
      throw new Error('Invalid API key. Access denied.');
    }
    if (res.status === 502) {
      throw new Error('Backend API unavailable. Please check the server.');
    }

    throw new Error(error.detail || `API error: ${res.status}`);
  }

  // Handle 204 No Content responses
  if (res.status === 204) {
    return undefined as T;
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
  // Backend returns Article directly, wrap it for frontend compatibility
  const article = await apiCall<Article>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return {
    article,
    generation_time_seconds: article.generation_time_seconds || 0,
  };
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

// Evaluate progress event from SSE stream
export interface EvaluateProgressEvent {
  type: 'start' | 'progress' | 'evaluated' | 'error' | 'complete';
  message?: string;
  current?: number;
  total?: number;
  source_id?: string;
  source_title?: string;
  score?: number;
  selected?: boolean;
  evaluated_count?: number;
  selected_count?: number;
  error?: string;
  evaluated?: number;
  errors?: number;
}

// Stream evaluate pending sources with progress updates
export function streamEvaluatePending(
  onProgress: (event: EvaluateProgressEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): () => void {
  const abortController = new AbortController();

  fetch('/api/sources/evaluate/pending/stream', {
    headers: {
      'Accept': 'text/event-stream',
    },
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required for evaluation.');
        }
        if (response.status === 502) {
          throw new Error('Backend API unavailable.');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as EvaluateProgressEvent;
              onProgress(data);

              if (data.type === 'complete' || data.type === 'error') {
                onComplete?.();
                return;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      onComplete?.();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    });

  // Return cleanup function
  return () => abortController.abort();
}

// Pipeline progress event from SSE stream
export interface PipelineProgressEvent {
  step: 'scrape' | 'evaluate' | 'generate' | 'done' | 'error';
  status: 'running' | 'completed' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

// Stream full pipeline with progress updates
// Uses internal proxy route which handles API key server-side
export function streamFullPipeline(
  onProgress: (event: PipelineProgressEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): () => void {
  const abortController = new AbortController();

  // Use internal proxy route (API key added server-side)
  fetch('/api/scheduler/run/stream', {
    headers: {
      'Accept': 'text/event-stream',
    },
    signal: abortController.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required for pipeline access.');
        }
        if (response.status === 502) {
          throw new Error('Backend API unavailable.');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as PipelineProgressEvent;
              onProgress(data);

              if (data.step === 'done' || data.step === 'error') {
                onComplete?.();
                return;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      onComplete?.();
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    });

  // Return cleanup function
  return () => abortController.abort();
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
