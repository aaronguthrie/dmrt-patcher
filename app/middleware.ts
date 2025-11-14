import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isBot } from '@/lib/security'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block bots
  const userAgent = request.headers.get('user-agent')
  if (isBot(userAgent)) {
    return new NextResponse('Access Denied', { 
      status: 403,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }

  // Add security headers
  const response = NextResponse.next()

  // Prevent indexing
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'no-referrer')
  
  // Content Security Policy - prevents XSS attacks
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.resend.com https://generativelanguage.googleapis.com https://graph.facebook.com https://graph.instagram.com; frame-ancestors 'none';"
  )
  
  // Permissions Policy - disable unused browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()'
  )

  return response
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

