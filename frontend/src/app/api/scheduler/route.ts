import { createBaseProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/scheduler base endpoint (no sub-path)
 */
const handlers = createBaseProxyHandlers('/api/scheduler');

export const GET = handlers.GET;
export const POST = handlers.POST;
