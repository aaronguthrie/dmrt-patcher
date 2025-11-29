import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIP } from '@/lib/rate-limit'
import { createSession } from '@/lib/session'
import { Role } from '@prisma/client'
import { timingSafeEqual } from 'crypto'

// Constant-time password comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const aBuffer = Buffer.from(a, 'utf8')
  const bBuffer = Buffer.from(b, 'utf8')
  try {
    return timingSafeEqual(aBuffer, bBuffer)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP (prevent brute force on dashboard password)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
    
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many authentication attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((ipRateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': ipRateLimit.limit.toString(),
            'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
            'X-RateLimit-Reset': ipRateLimit.reset.toString(),
            'Retry-After': Math.ceil((ipRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const { password } = await request.json()
    const dashboardPassword = process.env.DASHBOARD_PASSWORD

    if (!dashboardPassword) {
      console.error('DASHBOARD_PASSWORD is not set')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Use constant-time comparison to prevent timing attacks
    if (safeCompare(password, dashboardPassword)) {
      // Create a session for dashboard access (using a special role or email)
      await createSession({
        email: 'dashboard@dmrt.ie', // Special identifier for dashboard access
        role: 'pro' as Role, // Dashboard has PRO-level access
      })

      return NextResponse.json({ authenticated: true })
    }

    // Log failed authentication attempts (without exposing password)
    if (process.env.NODE_ENV === 'production') {
      console.warn(`🚫 Dashboard authentication failed - IP: ${ip}`)
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error) {
    console.error('Dashboard authentication error:', error)
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 })
  }
}

