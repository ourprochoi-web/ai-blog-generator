import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/generate/* endpoints
 */
const handlers = createProxyHandlers('/api/generate');

export const POST = handlers.POST;
