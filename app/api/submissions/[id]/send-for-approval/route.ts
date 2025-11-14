import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuthCode } from '@/lib/auth'
import { notifyTeamLeader } from '@/lib/resend'
import { SubmissionStatus } from '@prisma/client'
import { checkBotId } from '@/lib/botid'
import { requireRole } from '@/lib/auth-middleware'

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

    // Require PRO role to send for approval
    const authCheck = await requireRole(request, 'pro')
    if (authCheck instanceof NextResponse) {
      return authCheck
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending for approval:', error)
    return NextResponse.json({ error: 'Failed to send for approval' }, { status: 500 })
  }
}

