import { createBaseProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/sources base endpoint (no sub-path)
 */
const handlers = createBaseProxyHandlers('/api/sources');

export const GET = handlers.GET;
export const POST = handlers.POST;
