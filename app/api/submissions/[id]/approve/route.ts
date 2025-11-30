import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyProPostApproved, notifyProPostRejected } from '@/lib/resend'
import { checkBotId } from '@/lib/botid'
import { requireRole } from '@/lib/auth-middleware'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'
import { logAudit, logError } from '@/lib/logtail'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Require leader role to approve
    const authCheck = await requireRole(request, 'leader')
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

    const { approved, comment } = await request.json()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Create leader approval record
    await prisma.leaderApproval.create({
      data: {
        submissionId: params.id,
        approved,
        comment: comment || null,
      },
    })

    // Create auth code for PRO (for magic link in notification email)
    const proEmail = process.env.PRO_EMAIL!
    const code = await createAuthCode(proEmail, 'pro')

    if (approved) {
      // Update status and notify PRO
      await prisma.submission.update({
        where: { id: params.id },
        data: {
          status: 'awaiting_pro_to_post',
        },
      })
      await notifyProPostApproved(params.id, code)

      // Log approval
      await logAudit('Submission approved by leader', {
        component: 'approval',
        actionType: 'approve',
        userEmail: session.email,
        userRole: session.role,
        resourceId: params.id,
        resourceType: 'submission',
        success: true,
        ip: request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
        comment: comment || null,
      })
    } else {
      // Reject and notify PRO
      await prisma.submission.update({
        where: { id: params.id },
        data: {
          status: 'rejected',
        },
      })
      await notifyProPostRejected(params.id, comment || '', code)

      // Log rejection
      await logAudit('Submission rejected by leader', {
        component: 'approval',
        actionType: 'reject',
        userEmail: session.email,
        userRole: session.role,
        resourceId: params.id,
        resourceType: 'submission',
        success: true,
        ip: request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
        comment: comment || null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing approval:', error)
    await logError('Error processing approval', {
      component: 'approval',
      error: error instanceof Error ? error : new Error(String(error)),
      submissionId: params.id,
    })
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 })
  }
}

