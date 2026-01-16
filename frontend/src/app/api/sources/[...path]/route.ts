import { createProxyHandlers } from '@/lib/api-proxy';

/**
 * Proxy for /api/sources/* endpoints (write operations)
 * Read operations go directly to the backend (public)
 */
const handlers = createProxyHandlers('/api/sources');

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
