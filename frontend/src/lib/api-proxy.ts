import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API Proxy Utility
 *
 * Proxies requests to the backend API with the admin API key.
 * The API key is stored server-side only, never exposed to the browser.
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// Detect if BACKEND_URL is misconfigured (pointing to self)
function isBackendMisconfigured(): boolean {
  const vercelUrl = process.env.VERCEL_URL;
  if (!vercelUrl) return false;

  // Check if BACKEND_URL points to the Vercel deployment itself
  return BACKEND_URL.includes(vercelUrl) ||
         BACKEND_URL.includes('ai-blog-generator-five.vercel.app');
}

export async function proxyToBackend(
  request: NextRequest,
  backendPath: string,
  method: string
): Promise<NextResponse> {
  // Check for misconfiguration that would cause a loop
  if (isBackendMisconfigured()) {
    console.error('BACKEND_URL is misconfigured - pointing to Vercel deployment itself. Set BACKEND_URL to your Replit backend URL.');
    return NextResponse.json(
      {
        detail: 'Backend configuration error: BACKEND_URL points to the frontend. Please set BACKEND_URL environment variable to your Replit backend URL.',
        configured_url: BACKEND_URL
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}${backendPath}${url.search}`;

  // Prepare headers
  const headers: Record<string, string> = {};

  // Add API key if configured
  if (ADMIN_API_KEY) {
    headers['X-API-Key'] = ADMIN_API_KEY;
  }

  // Forward relevant headers from the original request
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers['Content-Type'] = contentType;
  } else if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  const accept = request.headers.get('accept');
  if (accept) {
    headers['Accept'] = accept;
  }

  try {
    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    // Make the request to the backend
    const response = await fetch(backendUrl, fetchOptions);

    // Handle streaming responses (SSE)
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // Handle no-content responses
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // Get response data
    const data = await response.json().catch(() => null);

    // Return the response with the same status
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { detail: 'Failed to connect to backend API' },
      { status: 502 }
    );
  }
}

/**
 * Create route handlers for a proxied endpoint
 */
export function createProxyHandlers(pathPrefix: string) {
  return {
    GET: async (
      request: NextRequest,
      { params }: { params: Promise<{ path?: string[] }> }
    ) => {
      const { path } = await params;
      const fullPath = path ? `${pathPrefix}/${path.join('/')}` : pathPrefix;
      return proxyToBackend(request, fullPath, 'GET');
    },

    POST: async (
      request: NextRequest,
      { params }: { params: Promise<{ path?: string[] }> }
    ) => {
      const { path } = await params;
      const fullPath = path ? `${pathPrefix}/${path.join('/')}` : pathPrefix;
      return proxyToBackend(request, fullPath, 'POST');
    },

    PUT: async (
      request: NextRequest,
      { params }: { params: Promise<{ path?: string[] }> }
    ) => {
      const { path } = await params;
      const fullPath = path ? `${pathPrefix}/${path.join('/')}` : pathPrefix;
      return proxyToBackend(request, fullPath, 'PUT');
    },

    PATCH: async (
      request: NextRequest,
      { params }: { params: Promise<{ path?: string[] }> }
    ) => {
      const { path } = await params;
      const fullPath = path ? `${pathPrefix}/${path.join('/')}` : pathPrefix;
      return proxyToBackend(request, fullPath, 'PATCH');
    },

    DELETE: async (
      request: NextRequest,
      { params }: { params: Promise<{ path?: string[] }> }
    ) => {
      const { path } = await params;
      const fullPath = path ? `${pathPrefix}/${path.join('/')}` : pathPrefix;
      return proxyToBackend(request, fullPath, 'DELETE');
    },
  };
}
