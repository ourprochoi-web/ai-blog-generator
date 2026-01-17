import { createBaseProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/admin base endpoint (no sub-path)
 */
const handlers = createBaseProxyHandlers('/api/admin');

export const GET = handlers.GET;
export const POST = handlers.POST;
