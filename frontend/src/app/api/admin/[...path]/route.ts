import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/admin/* endpoints
 */
const handlers = createProxyHandlers('/api/admin');

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
