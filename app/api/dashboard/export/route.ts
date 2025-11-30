import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkBotId } from '@/lib/botid'
import { requireAuth } from '@/lib/auth-middleware'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'
import { logAudit, logError } from '@/lib/logtail'

export async function GET(request: NextRequest) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Rate limiting by IP (stricter for export operations)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
    
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

    // Rate limiting by user (stricter for export operations)
    const userRateLimit = await rateLimitByIdentifier(session.email, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
    
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
    const submissions = await prisma.submission.findMany({
      include: {
        feedback: true,
        leaderApprovals: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Convert to CSV
    const headers = [
      'ID',
      'Date Submitted',
      'Submitted By',
      'Status',
      'Original Notes',
      'AI Generated Post',
      'PRO Edits',
      'Feedback Count',
      'Leader Approval',
      'Posted to Facebook',
      'Posted to Instagram',
      'Facebook Post ID',
      'Instagram Post ID',
      'Posted At',
    ]

    const rows = submissions.map((sub) => [
      sub.id,
      sub.createdAt.toISOString(),
      sub.submittedByEmail,
      sub.status,
      sub.notes.replace(/"/g, '""'),
      (sub.finalPostText || '').replace(/"/g, '""'),
      (sub.editedByPro || '').replace(/"/g, '""'),
      sub.feedback.length,
      sub.leaderApprovals.length > 0
        ? sub.leaderApprovals[0].approved
          ? 'Approved'
          : 'Rejected'
        : 'N/A',
      sub.postedToFacebook ? 'Yes' : 'No',
      sub.postedToInstagram ? 'Yes' : 'No',
      sub.facebookPostId || '',
      sub.instagramPostId || '',
      sub.postedAt?.toISOString() || '',
    ])

    const csv = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Log export
    await logAudit('Submissions exported to CSV', {
      component: 'dashboard',
      actionType: 'export',
      userEmail: session.email,
      userRole: session.role,
      resourceType: 'submissions',
      success: true,
      ip,
      submissionCount: submissions.length,
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="dmrt-submissions.csv"',
      },
    })
  } catch (error) {
    console.error('Error exporting submissions:', error)
    await logError('Error exporting submissions', {
      component: 'dashboard',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return NextResponse.json({ error: 'Failed to export submissions' }, { status: 500 })
  }
}

