import { createBaseProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/activity-logs base endpoint (no sub-path)
 */
const handlers = createBaseProxyHandlers('/api/activity-logs');

export const GET = handlers.GET;
export const POST = handlers.POST;
