import { NextResponse } from 'next/server';

// Middleware now only passes the request through.
// Authentication checks are moved to _app.js for client-side handling with localStorage.
export function middleware(request) {
  return NextResponse.next();
}

// Keep the config to define which paths the middleware applies to,
// even though it doesn't do much now.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (assuming files in /public are served directly)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.json|.*\\..*).*)',
  ],
};