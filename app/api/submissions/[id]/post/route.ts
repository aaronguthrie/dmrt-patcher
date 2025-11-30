import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { postToFacebook, postToInstagram } from '@/lib/meta'
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

    // Rate limiting by IP (stricter for expensive external API calls)
    const requestIp = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(requestIp, 10, 60 * 60 * 1000) // 10 requests per hour
    
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

    // Require PRO role to post
    const authCheck = await requireRole(request, 'pro')
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const session = authCheck

    // Rate limiting by user (stricter for expensive external API calls)
    const userRateLimit = await rateLimitByIdentifier(session.email, 10, 60 * 60 * 1000) // 10 requests per hour
    
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

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (!submission.finalPostText) {
      return NextResponse.json({ error: 'No post text available' }, { status: 400 })
    }

    const postText = submission.editedByPro || submission.finalPostText
    const photoUrls = submission.photoPaths

    // Post to Facebook
    let facebookPostId: string | null = null
    let facebookError: Error | null = null
    try {
      const facebookResult = await postToFacebook(postText, photoUrls)
      facebookPostId = facebookResult.id
    } catch (error) {
      facebookError = error instanceof Error ? error : new Error(String(error))
      console.error('Error posting to Facebook:', error)
        logError('Failed to post to Facebook', {
        component: 'social-media',
        error: facebookError,
        submissionId: params.id,
        userEmail: session.email,
      })
    }

    // Post to Instagram (requires at least one photo)
    let instagramPostId: string | null = null
    let instagramError: Error | null = null
    if (photoUrls.length > 0) {
      try {
        const instagramResult = await postToInstagram(postText, photoUrls[0])
        instagramPostId = instagramResult.id
      } catch (error) {
        instagramError = error instanceof Error ? error : new Error(String(error))
        console.error('Error posting to Instagram:', error)
        logError('Failed to post to Instagram', {
          component: 'social-media',
          error: instagramError,
          submissionId: params.id,
          userEmail: session.email,
        })
      }
    }

    // Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: 'posted',
        postedToFacebook: !!facebookPostId,
        postedToInstagram: !!instagramPostId,
        facebookPostId,
        instagramPostId,
        postedAt: new Date(),
      },
    })

    // Log successful posting (fire-and-forget)
    logAudit('Post published to social media', {
      component: 'social-media',
      actionType: 'post',
      userEmail: session.email,
      userRole: session.role,
      resourceId: params.id,
      resourceType: 'submission',
      success: !!(facebookPostId || instagramPostId),
      ip: requestIp,
      postedToFacebook: !!facebookPostId,
      postedToInstagram: !!instagramPostId,
      facebookPostId,
      instagramPostId,
      facebookError: facebookError?.message,
      instagramError: instagramError?.message,
    })

    return NextResponse.json({
      submission: updatedSubmission,
      facebookPostId,
      instagramPostId,
    })
  } catch (error) {
    console.error('Error posting to social media:', error)
    logError('Error posting to social media', {
      component: 'social-media',
      error: error instanceof Error ? error : new Error(String(error)),
      submissionId: params.id,
    })
    return NextResponse.json({ error: 'Failed to post to social media' }, { status: 500 })
  }
}

