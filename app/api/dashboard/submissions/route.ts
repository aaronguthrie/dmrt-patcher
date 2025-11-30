import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkBotId } from '@/lib/botid'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    // Block bots using BotID (advanced ML-based detection)
    const { isBot } = await checkBotId()
    if (isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Require authentication (dashboard should be accessible to authenticated users)
    const authCheck = await requireAuth(request)
    if (authCheck instanceof NextResponse) {
      return authCheck
    }
    const session = authCheck

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { finalPostText: { contains: search, mode: 'insensitive' } },
        { submittedByEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Note: Dashboard shows all submissions (intended for transparency)
    // But requires authentication to access
    const submissions = await prisma.submission.findMany({
      where,
      include: {
        feedback: {
          orderBy: { versionNumber: 'desc' }, // Latest feedback first
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
    console.error('Error fetching dashboard submissions:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }
}
