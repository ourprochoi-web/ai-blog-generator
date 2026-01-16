import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/api-proxy';

/**
 * Proxy for POST /api/generate endpoint
 */
export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/api/generate', 'POST');
}
