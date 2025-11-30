import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyTeamLeader } from '@/lib/resend'
import { SubmissionStatus } from '@prisma/client'
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

    // Require PRO role to send for approval
    const authCheck = await requireRole(request, 'pro')
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

    const { editedPostText } = await request.json()

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Update with PRO's edits if provided
    const updateData: { status: SubmissionStatus; editedByPro?: string } = {
      status: 'awaiting_leader',
    }

    if (editedPostText) {
      updateData.editedByPro = editedPostText
    }

    await prisma.submission.update({
      where: { id: params.id },
      data: updateData,
    })

    // Create auth code for team leader (use first email for the code, but notify all)
    const leaderEmails = process.env.TEAM_LEADER_EMAIL?.split(',').map(e => e.trim()).filter(Boolean) || []
    if (leaderEmails.length === 0) {
      throw new Error('TEAM_LEADER_EMAIL is not set')
    }
    const leaderEmail = leaderEmails[0] // Use first email for the auth code
    const code = await createAuthCode(leaderEmail, 'leader', params.id)
    await notifyTeamLeader(params.id, code)

    // Log sending for approval
    await logAudit('Submission sent for leader approval', {
      component: 'approval',
      actionType: 'update',
      userEmail: session.email,
      userRole: session.role,
      resourceId: params.id,
      resourceType: 'submission',
      success: true,
      ip: request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
      hasEdits: !!editedPostText,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending for approval:', error)
    await logError('Error sending for approval', {
      component: 'approval',
      error: error instanceof Error ? error : new Error(String(error)),
      submissionId: params.id,
    })
    return NextResponse.json({ error: 'Failed to send for approval' }, { status: 500 })
  }
}

