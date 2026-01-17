import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/admin base endpoint (no sub-path)
 */
const handlers = createProxyHandlers('/api/admin');

export const GET = handlers.GET;
export const POST = handlers.POST;
