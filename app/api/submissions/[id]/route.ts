import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkBotId } from '@/lib/botid'
import { checkSubmissionAccess } from '@/lib/auth-middleware'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'

export async function GET(
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

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        feedback: {
          orderBy: { createdAt: 'asc' },
        },
        leaderApprovals: {
          orderBy: { createdAt: 'desc' },
        },
      },
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

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error fetching submission:', error)
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
  }
}

export async function PATCH(
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
    const ipRateLimit = await rateLimitByIP(ip, 20, 15 * 60 * 1000) // 20 requests per 15 minutes
    
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

    // First check if submission exists and get owner
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: params.id },
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check authorization - only owner, PRO, or leader can modify
    const authCheck = await checkSubmissionAccess(
      request,
      existingSubmission.submittedByEmail,
      true, // Allow PRO
      true  // Allow leader
    )
    
    if (authCheck instanceof NextResponse) {
      return authCheck
    }

    const session = authCheck

    // Rate limiting by user
    const userRateLimit = await rateLimitByIdentifier(session.email, 15, 15 * 60 * 1000) // 15 requests per 15 minutes
    
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

    const data = await request.json()

    // Prevent direct status manipulation - status should only change via workflow endpoints
    // Allow PRO/leader to modify status, but restrict team members
    if (session.role === 'team_member' && 'status' in data) {
      return NextResponse.json(
        { error: 'Status can only be changed through workflow endpoints' },
        { status: 403 }
      )
    }

    // Whitelist allowed fields to prevent IDOR and SSRF attacks
    // Only allow modification of specific fields
    const allowedFields = ['finalPostText', 'editedByPro']
    // PRO and leader can also modify status (for workflow purposes)
    if (session.role === 'pro' || session.role === 'leader') {
      allowedFields.push('status')
    }
    
    const updateData: any = {}

    // Build update data from whitelisted fields only
    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field]
      }
    }

    // Prevent modification of sensitive fields (that should never be modified)
    const sensitiveFields = ['submittedByEmail', 'photoPaths', 'id', 'createdAt', 'updatedAt']
    for (const field of sensitiveFields) {
      if (field in data) {
        return NextResponse.json(
          { error: `Cannot modify field: ${field}` },
          { status: 403 }
        )
      }
    }

    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}
