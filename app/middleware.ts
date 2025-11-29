import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isBot } from '@/lib/security'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')
  const isApiRoute = pathname.startsWith('/api')

  // Block bots
  const userAgent = request.headers.get('user-agent')
  if (isBot(userAgent)) {
    // Log bot detection attempts for security monitoring
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚫 Bot detected: ${userAgent?.substring(0, 50) || 'no user-agent'} - IP: ${request.ip || 'unknown'}`)
    }
    
    return new NextResponse('Access Denied', { 
      status: 403,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Blocked-Reason': 'bot-detection', // Helps differentiate from auth failures
      },
    })
  }

  // Add security headers
  const response = NextResponse.next()

  // CORS configuration for API routes - restrict to same origin only
  if (isApiRoute) {
    // Get the request origin and compare with server origin
    const serverOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`
    
    // Only allow same-origin requests
    // - If no Origin header, it's a same-origin request (browsers don't send Origin for same-origin)
    // - If Origin header matches server origin, allow it
    // - Otherwise, don't set CORS headers (browsers will block cross-origin requests)
    const isSameOrigin = !origin || origin === serverOrigin
    
    // Log CORS violation attempts for security monitoring
    if (origin && origin !== serverOrigin && process.env.NODE_ENV === 'production') {
      console.warn(`🚫 CORS violation attempt from origin: ${origin} - IP: ${request.ip || 'unknown'} - Path: ${pathname}`)
    }
    
    if (request.method === 'OPTIONS') {
      // Handle preflight requests
      // Only respond to same-origin preflight requests
      if (isSameOrigin) {
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin || serverOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Allow-Credentials': 'true',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      } else {
        // Block cross-origin preflight requests
        // Log the violation attempt
        if (process.env.NODE_ENV === 'production') {
          console.warn(`🚫 CORS preflight blocked from origin: ${origin} - IP: ${request.ip || 'unknown'}`)
        }
        return new NextResponse(null, { 
          status: 403,
          headers: {
            'X-Blocked-Reason': 'cors-violation',
          },
        })
      }
    }

    // Set CORS headers only for same-origin requests
    // Note: Same-origin requests work without CORS headers, but setting them explicitly
    // ensures consistent behavior and prevents any potential issues
    if (isSameOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin || serverOrigin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    // If not same-origin, don't set CORS headers - browser will block the request
  }

  // Prevent indexing
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')

  // Security headers (apply to all routes)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'no-referrer')
  
  // Content Security Policy - prevents XSS attacks
  // Only apply CSP to non-API routes (API routes don't serve HTML)
  if (!isApiRoute) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://api.resend.com https://generativelanguage.googleapis.com https://graph.facebook.com https://graph.instagram.com; frame-ancestors 'none';"
    )
  }
  
  // Permissions Policy - disable unused browser features
  // Only apply to non-API routes
  if (!isApiRoute) {
    response.headers.set(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()'
    )
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo-icon.png, manifest.json (static assets)
     * 
     * Note: API routes are now included to set proper CORS headers
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-icon.png|manifest.json|logo.png|apple-icon.png|icon.png|apple-icon-|android-icon-|favicon-|ms-icon-|browserconfig.xml).*)',
  ],
}

