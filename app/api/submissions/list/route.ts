import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SubmissionStatus } from '@prisma/client'
import { checkBotId } from '@/lib/botid'
import { requireAuth } from '@/lib/auth-middleware'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Rate limiting by IP
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 30, 15 * 60 * 1000) // 30 requests per 15 minutes
    
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
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

    // Require authentication
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      return authCheck
    }
    const session = authCheck

    // Rate limiting by user
    const userRateLimit = await rateLimitByIdentifier(session.email, 20, 15 * 60 * 1000) // 20 requests per 15 minutes
    
    if (!userRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': userRateLimit.limit.toString(),
            'X-RateLimit-Remaining': userRateLimit.remaining.toString(),
            'X-RateLimit-Reset': userRateLimit.reset.toString(),
            'Retry-After': Math.ceil((userRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as SubmissionStatus | null

    // Build where clause with IDOR protection
    const where: any = status ? { status } : {}
    
    // Filter by user unless PRO or Leader (they can see all)
    if (session.role === 'team_member') {
      where.submittedByEmail = session.email
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
        },
        leaderApprovals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('Error fetching submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
