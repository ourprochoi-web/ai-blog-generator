import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/scheduler/* endpoints
 */
const handlers = createProxyHandlers('/api/scheduler');

export const GET = handlers.GET;
export const POST = handlers.POST;
