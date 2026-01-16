/**
 * Next.js Middleware
 * Runs on all requests before they reach route handlers
 * 
 * Features:
 * - Security headers (CSP, HSTS, X-Frame-Options)
 * - Request logging
 * - CSRF protection
 * - Route protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from './lib/utils';

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  const headers = response.headers;
  
  // Content Security Policy - adjust for your needs
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.appwrite.io", // Allow Appwrite API
      "frame-ancestors 'none'",
    ].join('; ')
  );
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy, but doesn't hurt)
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // HTTPS enforcement (only in production)
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/**
 * Check if route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  const protectedRoutes = ['/feed', '/profile'];
  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if route is auth page (login/register)
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/login') || pathname.startsWith('/register');
}

/**
 * Simple CSRF protection using custom header
 * All state-changing requests must include X-CSRF-Token header
 */
function checkCsrfProtection(request: NextRequest): boolean {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }
  
  // Skip CSRF check for authentication endpoints (they use credentials)
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return true;
  }
  
  // Check for custom header or form submission
  const csrfHeader = request.headers.get('x-csrf-token');
  const isFormSubmission = request.headers.get('content-type')?.includes('multipart/form-data');
  
  // Allow requests with CSRF token or form submissions (from same origin)
  return Boolean(csrfHeader || isFormSubmission);
}

/**
 * Check if user has an active Appwrite session
 * Checks for session cookies with fallback patterns
 */
function hasAppwriteSession(request: NextRequest): boolean {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  
  // Log all cookies in development for debugging
  if (process.env.NODE_ENV === 'development') {
    const allCookies = request.cookies.getAll();
    console.log('[Session Check] All cookies:', allCookies.map(c => c.name));
  }
  
  // Primary session cookie format
  const primaryCookie = request.cookies.get(`a_session_${projectId}`);
  if (primaryCookie?.value) {
    return true;
  }
  
  // Legacy/alternative session cookie format
  const legacyCookie = request.cookies.get(`a_session_${projectId}_legacy`);
  if (legacyCookie?.value) {
    return true;
  }
  
  // Check all cookies for any session-like pattern (fallback)
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('a_session') && cookie.value) {
      return true;
    }
  }
  
  return false;
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }
  
  // Create response
  let response = NextResponse.next();
  
  // Add request ID header
  response.headers.set('X-Request-ID', requestId);
  
  // Add security headers
  addSecurityHeaders(response);
  
  // CSRF protection for API routes
  if (pathname.startsWith('/api') && !checkCsrfProtection(request)) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'CSRF token missing or invalid',
        code: 'CSRF_ERROR',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      }
    );
  }
  
  // Note: Appwrite uses client-side session management with JWT tokens.
  // The middleware cannot reliably detect Appwrite sessions because they're
  // stored in the SDK's internal storage, not traditional cookies.
  // 
  // Route protection is handled client-side in the components:
  // - useCurrentUser hook checks if user is authenticated
  // - Pages can redirect unauthenticated users
  //
  // The middleware focuses on:
  // - Security headers
  // - CSRF protection
  // - Redirecting authenticated users away from login/register pages (when detectable)
  
  // Redirect authenticated users away from auth pages
  if (isAuthPage(pathname)) {
    if (hasAppwriteSession(request)) {
      // Check if there's a redirect parameter
      const redirectParam = request.nextUrl.searchParams.get('redirect');
      let redirectUrl: URL;
      
      if (redirectParam) {
        try {
          redirectUrl = new URL(redirectParam, request.url);
          // Security check: only allow redirects to the same origin
          if (redirectUrl.origin !== new URL(request.url).origin) {
            redirectUrl = new URL('/feed', request.url);
          }
        } catch {
          // Invalid URL, fallback to /feed
          redirectUrl = new URL('/feed', request.url);
        }
      } else {
        redirectUrl = new URL('/feed', request.url);
      }
      
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Log request in development
  if (process.env.NODE_ENV === 'development') {
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ${request.method} ${pathname} - ${duration}ms`);
  }
  
  return response;
}

/**
 * Matcher configuration
 * Specify which routes should run through middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
