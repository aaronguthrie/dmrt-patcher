import { NextRequest } from 'next/server'
import { createAuthCode } from '@/lib/auth'
import { notifyPRO } from '@/lib/resend'
import { checkBotId } from '@/lib/botid'
import { checkSubmissionAccess } from '@/lib/auth-middleware'

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
const { POST } = require('@/app/api/submissions/ready/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockCheckSubmissionAccess = checkSubmissionAccess as jest.MockedFunction<typeof checkSubmissionAccess>
const mockCreateAuthCode = createAuthCode as jest.MockedFunction<typeof createAuthCode>
const mockNotifyPRO = notifyPRO as jest.MockedFunction<typeof notifyPRO>

describe('POST /api/submissions/ready', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      PRO_EMAIL: 'pro@example.com',
    }
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockCreateAuthCode.mockResolvedValue('auth-code-123')
    mockNotifyPRO.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createRequest(submissionId: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/submissions/ready', {
      method: 'POST',
      body: JSON.stringify({ submissionId }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should mark submission as ready and notify PRO', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
      status: 'draft',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'awaiting_pro',
    })
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.submission.update).toHaveBeenCalledWith({
      where: { id: 'submission-123' },
      data: { status: 'awaiting_pro' },
    })
    expect(mockCreateAuthCode).toHaveBeenCalledWith('pro@example.com', 'pro')
    expect(mockNotifyPRO).toHaveBeenCalledWith('submission-123', 'auth-code-123')
  })

  it('should only allow owner to mark as ready', async () => {
    const { prisma } = require('@/lib/db')
    const { NextResponse } = require('next/server')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue(
      NextResponse.json({ error: 'Access denied' }, { status: 403 })
    )

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should block PRO from marking as ready', async () => {
    const { prisma } = require('@/lib/db')
    const { NextResponse } = require('next/server')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue(
      NextResponse.json({ error: 'Access denied' }, { status: 403 })
    )

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
  })

  it('should require submissionId', async () => {
    const request = new NextRequest('http://localhost:3000/api/submissions/ready', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Submission ID required')
  })

  it('should return 404 for non-existent submission', async () => {
    const { prisma } = require('@/lib/db')
    prisma.submission.findUnique.mockResolvedValue(null)

    const request = createRequest('non-existent')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Submission not found')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should handle database errors', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    prisma.submission.update.mockRejectedValue(new Error('Database error'))

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to mark submission as ready')
  })

  it('should handle email sending errors', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    mockNotifyPRO.mockRejectedValue(new Error('Email error'))

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to mark submission as ready')
  })
})

