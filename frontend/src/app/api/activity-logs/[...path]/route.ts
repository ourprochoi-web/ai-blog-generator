import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/activity-logs/* endpoints
 */
const handlers = createProxyHandlers('/api/activity-logs');

export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
