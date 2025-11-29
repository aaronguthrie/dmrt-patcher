import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkBotId } from '@/lib/botid'
import { requireAuth } from '@/lib/auth-middleware'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Stricter rate limiting for deletions (prevent mass deletion)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 10, 60 * 1000) // 10 deletions per minute (reduced from 20)
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many deletion requests. Please try again later.',
          retryAfter: Math.ceil((ipRateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((ipRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Require session authentication (dashboard auth now creates a session)
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      return authCheck
    }
    const session = authCheck

    const submissionId = params.id

    // Check if submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Optional: Prevent deletion of posted submissions (uncomment if desired)
    // if (submission.postedToFacebook || submission.postedToInstagram) {
    //   return NextResponse.json(
    //     { error: 'Cannot delete submissions that have been posted to social media' },
    //     { status: 403 }
    //   )
    // }

    // Audit log before deletion
    const auditInfo = {
      submissionId: submission.id,
      submittedBy: submission.submittedByEmail,
      status: submission.status,
      deletedBy: session.email,
      deletedAt: new Date().toISOString(),
      ip: ip,
    }
    
    if (process.env.NODE_ENV === 'production') {
      console.log(`🗑️ Submission deleted:`, JSON.stringify(auditInfo))
    }

    // Delete the submission (cascade will delete related Feedback and LeaderApproval records)
    await prisma.submission.delete({
      where: { id: submissionId },
    })

    // Note: Photos stored in Vercel Blob will remain, but that's acceptable
    // as they're not directly linked to the submission anymore

    return NextResponse.json({ success: true, message: 'Submission deleted successfully' })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
  }
}

