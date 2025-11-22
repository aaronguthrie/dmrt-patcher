import { NextRequest } from 'next/server'
import { createAuthCode } from '@/lib/auth'
import { notifyProPostApproved, notifyProPostRejected } from '@/lib/resend'
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
    leaderApproval: {
      create: jest.fn(),
    },
  },
}))

// Import route AFTER mocks
const { POST } = require('@/app/api/submissions/[id]/approve/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>
const mockCreateAuthCode = createAuthCode as jest.MockedFunction<typeof createAuthCode>
const mockNotifyProPostApproved = notifyProPostApproved as jest.MockedFunction<typeof notifyProPostApproved>
const mockNotifyProPostRejected = notifyProPostRejected as jest.MockedFunction<typeof notifyProPostRejected>

describe('POST /api/submissions/[id]/approve', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      PRO_EMAIL: 'pro@example.com',
    }
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockRequireRole.mockResolvedValue({
      email: 'leader@example.com',
      role: 'leader',
    })
    mockCreateAuthCode.mockResolvedValue('auth-code-123')
    mockNotifyProPostApproved.mockResolvedValue(undefined)
    mockNotifyProPostRejected.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createRequest(id: string, approved: boolean, comment?: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/submissions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, comment }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should approve submission and notify PRO', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_leader_approval',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'awaiting_pro_to_post',
    })
    prisma.leaderApproval.create.mockResolvedValue({})

    const request = createRequest('submission-123', true, 'Looks good!')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.submission.update).toHaveBeenCalledWith({
      where: { id: 'submission-123' },
      data: { status: 'awaiting_pro_to_post' },
    })
    expect(mockNotifyProPostApproved).toHaveBeenCalledWith('submission-123', 'auth-code-123')
  })

  it('should reject submission and notify PRO', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_leader_approval',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'rejected',
    })
    prisma.leaderApproval.create.mockResolvedValue({})

    const request = createRequest('submission-123', false, 'Needs revision')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.submission.update).toHaveBeenCalledWith({
      where: { id: 'submission-123' },
      data: { status: 'rejected' },
    })
    expect(mockNotifyProPostRejected).toHaveBeenCalledWith('submission-123', 'Needs revision', 'auth-code-123')
  })

  it('should require leader role', async () => {
    const { NextResponse } = require('next/server')
    mockRequireRole.mockResolvedValue(
      NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    )

    const request = createRequest('submission-123', true)
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Insufficient permissions')
  })

  it('should return 404 for non-existent submission', async () => {
    const { prisma } = require('@/lib/db')
    prisma.submission.findUnique.mockResolvedValue(null)

    const request = createRequest('non-existent', true)
    const response = await POST(request, { params: { id: 'non-existent' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Submission not found')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123', true)
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should handle missing comment', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      status: 'awaiting_leader_approval',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue(mockSubmission)
    prisma.leaderApproval.create.mockResolvedValue({})

    const request = createRequest('submission-123', false)
    const response = await POST(request, { params: { id: 'submission-123' } })

    expect(response.status).toBe(200)
    expect(prisma.leaderApproval.create).toHaveBeenCalledWith({
      data: {
        submissionId: 'submission-123',
        approved: false,
        comment: null,
      },
    })
  })
})

