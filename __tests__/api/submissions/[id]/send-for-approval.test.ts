import { NextRequest } from 'next/server'
import { createAuthCode } from '@/lib/auth'
import { notifyTeamLeader } from '@/lib/resend'
import { checkBotId } from '@/lib/botid'
import { requireRole } from '@/lib/auth-middleware'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/auth')
jest.mock('@/lib/resend')
jest.mock('@/lib/botid')
jest.mock('@/lib/auth-middleware')
jest.mock('@/lib/db', () => ({
  prisma: {
    submission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

// Import route AFTER mocks
const { POST } = require('@/app/api/submissions/[id]/send-for-approval/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>
const mockCreateAuthCode = createAuthCode as jest.MockedFunction<typeof createAuthCode>
const mockNotifyTeamLeader = notifyTeamLeader as jest.MockedFunction<typeof notifyTeamLeader>

describe('POST /api/submissions/[id]/send-for-approval', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      TEAM_LEADER_EMAIL: 'leader1@example.com,leader2@example.com',
    }
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockRequireRole.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })
    mockCreateAuthCode.mockResolvedValue('auth-code-123')
    mockNotifyTeamLeader.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createRequest(id: string, editedPostText?: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/submissions/${id}/send-for-approval`, {
      method: 'POST',
      body: JSON.stringify({ editedPostText }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should send submission for approval', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'awaiting_leader',
    })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.submission.update).toHaveBeenCalledWith({
      where: { id: 'submission-123' },
      data: { status: 'awaiting_leader' },
    })
    expect(mockCreateAuthCode).toHaveBeenCalledWith('leader1@example.com', 'leader', 'submission-123')
    expect(mockNotifyTeamLeader).toHaveBeenCalledWith('submission-123', 'auth-code-123')
  })

  it('should update editedPostText if provided', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue(mockSubmission)

    const request = createRequest('submission-123', 'Edited post text')
    const response = await POST(request, { params: { id: 'submission-123' } })

    expect(response.status).toBe(200)
    expect(prisma.submission.update).toHaveBeenCalledWith({
      where: { id: 'submission-123' },
      data: {
        status: 'awaiting_leader',
        editedByPro: 'Edited post text',
      },
    })
  })

  it('should require PRO role', async () => {
    const { NextResponse } = require('next/server')
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    )

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions')
  })

  it('should return 404 for non-existent submission', async () => {
    const { prisma } = require('@/lib/db')
    prisma.submission.findUnique.mockResolvedValue(null)

    const request = createRequest('non-existent')
    const response = await POST(request, { params: { id: 'non-existent' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Submission not found')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should handle missing TEAM_LEADER_EMAIL', async () => {
    delete process.env.TEAM_LEADER_EMAIL

    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send for approval')
  })

  it('should handle database errors', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockRejectedValue(new Error('Database error'))

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send for approval')
  })

  it('should handle email sending errors', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue(mockSubmission)
    mockNotifyTeamLeader.mockRejectedValue(new Error('Email error'))

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send for approval')
  })
})

