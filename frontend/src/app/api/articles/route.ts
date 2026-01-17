import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/articles base endpoint (no sub-path)
 * Handles: GET /api/articles, POST /api/articles
 */
const handlers = createProxyHandlers('/api/articles');

export const GET = handlers.GET;
export const POST = handlers.POST;
