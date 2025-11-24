import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to normalize domain (www <-> non-www redirect)
 * 
 * Redirects all traffic to the canonical domain specified in NEXT_PUBLIC_APP_URL.
 * This ensures consistent domain usage and prevents CORS issues.
 * 
 * Set NEXT_PUBLIC_APP_URL to your preferred canonical domain (with or without www).
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Skip middleware for localhost and internal Next.js requests
  if (
    hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.includes('.vercel.app') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static')
  ) {
    return NextResponse.next()
  }

  // Get canonical domain from env (preferred domain)
  const canonicalDomain = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
    : null

  if (!canonicalDomain) {
    // No canonical domain set, allow all requests
    return NextResponse.next()
  }

  // Extract root domain (without www) for comparison
  const rootDomain = canonicalDomain.replace(/^www\./, '')
  const currentRootDomain = hostname.replace(/^www\./, '')

  // If root domains don't match, this is a different domain entirely - allow it
  if (rootDomain !== currentRootDomain) {
    return NextResponse.next()
  }

  // Root domains match, check if www prefix matches canonical
  const isCanonicalWww = canonicalDomain.startsWith('www.')
  const isCurrentWww = hostname.startsWith('www.')

  // Redirect if www prefix doesn't match canonical
  if (isCanonicalWww !== isCurrentWww) {
    url.hostname = canonicalDomain
    return NextResponse.redirect(url, 301) // Permanent redirect
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

