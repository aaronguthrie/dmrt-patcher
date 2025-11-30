import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyPRO } from '@/lib/resend'
import { checkBotId } from '@/lib/botid'
import { checkSubmissionAccess } from '@/lib/auth-middleware'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'
import { logAudit, logError } from '@/lib/logtail'

export async function POST(request: NextRequest) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Rate limiting by IP
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 10, 15 * 60 * 1000) // 10 requests per 15 minutes
    
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
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
    }

    // First check if submission exists and get owner
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - only owner can mark as ready
    const authCheck = await checkSubmissionAccess(
      request,
      existingSubmission.submittedByEmail,
      false, // PRO cannot mark as ready
      false  // Leader cannot mark as ready
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const session = authCheck

    // Rate limiting by user
    const userRateLimit = await rateLimitByIdentifier(session.email, 10, 15 * 60 * 1000) // 10 requests per 15 minutes
    
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

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'awaiting_pro',
      },
    })

    // Create auth code for PRO (use first email for the code, but notify all)
    const proEmail = process.env.PRO_EMAIL!
    const code = await createAuthCode(proEmail, 'pro')
    await notifyPRO(submissionId, code)

    // Log marking as ready
    await logAudit('Submission marked as ready for PRO review', {
      component: 'submission',
      actionType: 'update',
      userEmail: session.email,
      userRole: session.role,
      resourceId: submissionId,
      resourceType: 'submission',
      success: true,
      ip: request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking submission as ready:', error)
    await logError('Error marking submission as ready', {
      component: 'submission',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return NextResponse.json({ error: 'Failed to mark submission as ready' }, { status: 500 })
  }
}

