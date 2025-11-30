import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePost } from '@/lib/gemini'
import { checkBotId } from '@/lib/botid'
import { validateFeedbackLength } from '@/lib/validation'
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

    // Rate limiting: 5 requests per minute per user (stricter for expensive AI operations)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    
    // First check authentication to get user email for identifier-based rate limiting
    const { submissionId, feedback } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
    }

    // Get submission to check access and get user email
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - user must own submission or be PRO/leader
    const authCheck = await checkSubmissionAccess(
      request,
      submission.submittedByEmail,
      true, // Allow PRO
      true  // Allow leader
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const session = authCheck

    // Rate limiting by IP (5 per minute)
    const ipRateLimit = await rateLimitByIP(ip, 5, 60 * 1000) // 5 requests per minute
    
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again in a moment.',
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

    // Rate limiting by user email (5 per minute)
    const userRateLimit = await rateLimitByIdentifier(session.email, 5, 60 * 1000) // 5 requests per minute
    
    if (!userRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again in a moment.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((userRateLimit.reset - Date.now()) / 1000),
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

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 })
    }

    // Validate feedback length if provided
    if (feedback) {
      const feedbackValidation = validateFeedbackLength(feedback)
      if (!feedbackValidation.valid) {
        return NextResponse.json({ error: feedbackValidation.error }, { status: 400 })
      }
    }

    // Get feedback count for version number
    const feedbackCount = await prisma.feedback.count({
      where: { submissionId },
    })

    // Generate new post
    let newPost: string
    try {
      newPost = await generatePost(
        submission.notes,
        submission.finalPostText || null,
        feedback || null
      )
    } catch (aiError) {
      await logError('Failed to regenerate post with AI', {
        component: 'submission',
        error: aiError instanceof Error ? aiError : new Error(String(aiError)),
        submissionId,
        userEmail: session.email,
      })
      throw aiError
    }

    // Save feedback if provided
    if (feedback) {
      await prisma.feedback.create({
        data: {
          submissionId,
          feedbackText: feedback,
          versionNumber: feedbackCount + 1,
        },
      })
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        finalPostText: newPost,
      },
    })

    // Log regeneration
    await logAudit('Post regenerated', {
      component: 'submission',
      actionType: 'update',
      userEmail: session.email,
      userRole: session.role,
      resourceId: submissionId,
      resourceType: 'submission',
      success: true,
      ip: request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown',
      hasFeedback: !!feedback,
      feedbackVersion: feedback ? feedbackCount + 1 : null,
    })

    return NextResponse.json({
      finalPostText: updatedSubmission.finalPostText,
    })
  } catch (error) {
    console.error('Error regenerating post:', error)
    await logError('Error regenerating post', {
      component: 'submission',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    return NextResponse.json({ error: 'Failed to regenerate post' }, { status: 500 })
  }
}

