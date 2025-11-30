import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { createSession } from '@/lib/session'
import { rateLimitByIP } from '@/lib/rate-limit'
import { checkBotId } from '@/lib/botid'
import { logAudit, logError } from '@/lib/logtail'

export async function POST(request: NextRequest) {
  try {
    // Block bots using BotID
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Rate limiting by IP (prevent brute force)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes
    
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
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

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Get PRO password hash from environment variable
    const proPasswordHash = process.env.PRO_PASSWORD_HASH?.trim()

    if (!proPasswordHash) {
      console.error('PRO_PASSWORD_HASH is not set')
      return NextResponse.json({ 
        error: 'Server configuration error',
        code: 'MISSING_PASSWORD_CONFIG'
      }, { status: 500 })
    }

    // Validate hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (!proPasswordHash.match(/^\$2[ayb]\$/)) {
      console.error('PRO_PASSWORD_HASH has invalid format. Expected bcrypt hash starting with $2a$, $2b$, or $2y$')
      return NextResponse.json({ 
        error: 'Server configuration error',
        code: 'INVALID_PASSWORD_HASH_FORMAT'
      }, { status: 500 })
    }

    // Get PRO email from environment variable
    const proEmail = process.env.PRO_EMAIL?.trim()

    if (!proEmail) {
      console.error('PRO_EMAIL is not set')
      return NextResponse.json({ 
        error: 'Server configuration error',
        code: 'MISSING_PRO_EMAIL'
      }, { status: 500 })
    }

    // Compare password with hash
    const isValid = await compare(password, proPasswordHash)

    if (!isValid) {
      // Log failed login attempts for security monitoring
      if (process.env.NODE_ENV === 'production') {
        console.warn(`🚫 Failed password login attempt - IP: ${ip}`)
      }
      
      // Log failed authentication attempt
      await logAudit('Password login failed - invalid password', {
        component: 'authentication',
        actionType: 'authenticate',
        userEmail: proEmail,
        userRole: 'pro',
        success: false,
        ip,
        reason: 'invalid_password',
      })
      
      return NextResponse.json({ 
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      }, { status: 401 })
    }

    // Create session after successful authentication
    await createSession({
      email: proEmail,
      role: 'pro',
    })

    // Log successful authentication
    await logAudit('Password login successful', {
      component: 'authentication',
      actionType: 'authenticate',
      userEmail: proEmail,
      userRole: 'pro',
      success: true,
      ip,
    })

    return NextResponse.json({
      success: true,
      email: proEmail,
      role: 'pro',
    })
  } catch (error: any) {
    console.error('Error in password login:', error)
    await logError('Error in password login', {
      component: 'authentication',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return NextResponse.json({ 
      error: 'Failed to authenticate',
      code: 'AUTH_ERROR'
    }, { status: 500 })
  }
}

