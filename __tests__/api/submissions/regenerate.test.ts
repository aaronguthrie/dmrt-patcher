import { NextRequest } from 'next/server'
import { generatePost } from '@/lib/gemini'
import { checkBotId } from '@/lib/botid'
import { checkSubmissionAccess } from '@/lib/auth-middleware'
import { validateFeedbackLength } from '@/lib/validation'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/gemini')
jest.mock('@/lib/botid')
jest.mock('@/lib/auth-middleware')
jest.mock('@/lib/validation')
jest.mock('@/lib/db', () => ({
  prisma: {
    submission: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    feedback: {
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Import route AFTER mocks
const { POST } = require('@/app/api/submissions/regenerate/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockCheckSubmissionAccess = checkSubmissionAccess as jest.MockedFunction<typeof checkSubmissionAccess>
const mockGeneratePost = generatePost as jest.MockedFunction<typeof generatePost>
const mockValidateFeedbackLength = validateFeedbackLength as jest.MockedFunction<typeof validateFeedbackLength>

describe('POST /api/submissions/regenerate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockValidateFeedbackLength.mockReturnValue({ valid: true })
  })

  function createRequest(submissionId: string, feedback?: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/submissions/regenerate', {
      method: 'POST',
      body: JSON.stringify({ submissionId, feedback }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should regenerate post successfully', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      notes: 'Test notes',
      finalPostText: 'Original post',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.feedback.count.mockResolvedValue(0)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      finalPostText: 'Regenerated post',
    })
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    mockGeneratePost.mockResolvedValue('Regenerated post')

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.finalPostText).toBe('Regenerated post')
    expect(mockGeneratePost).toHaveBeenCalledWith('Test notes', 'Original post', null)
  })

  it('should regenerate with feedback', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      notes: 'Test notes',
      finalPostText: 'Original post',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.feedback.count.mockResolvedValue(1)
    prisma.feedback.create.mockResolvedValue({})
    prisma.submission.update.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    mockGeneratePost.mockResolvedValue('Regenerated with feedback')

    const request = createRequest('submission-123', 'Make it shorter')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockGeneratePost).toHaveBeenCalledWith('Test notes', 'Original post', 'Make it shorter')
    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        submissionId: 'submission-123',
        feedbackText: 'Make it shorter',
        versionNumber: 2,
      },
    })
  })

  it('should validate feedback length', async () => {
    mockValidateFeedbackLength.mockReturnValue({
      valid: false,
      error: 'Feedback too long',
    })

    const request = createRequest('submission-123', 'x'.repeat(10000))
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Feedback too long')
  })

  it('should require submissionId', async () => {
    const request = new NextRequest('http://localhost:3000/api/submissions/regenerate', {
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

  it('should require authorization', async () => {
    const { prisma } = require('@/lib/db')
    const { NextResponse } = require('next/server')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'other@example.com',
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

  it('should allow PRO to regenerate', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      notes: 'Test notes',
      finalPostText: 'Original post',
      submittedByEmail: 'other@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.feedback.count.mockResolvedValue(0)
    prisma.submission.update.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })
    mockGeneratePost.mockResolvedValue('Regenerated post')

    const request = createRequest('submission-123')
    const response = await POST(request)

    expect(response.status).toBe(200)
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
      notes: 'Test notes',
      finalPostText: 'Original post',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.feedback.count.mockResolvedValue(0)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    mockGeneratePost.mockResolvedValue('New post')
    prisma.submission.update.mockRejectedValue(new Error('Database error'))

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to regenerate post')
  })

  it('should handle Gemini API errors', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      notes: 'Test notes',
      finalPostText: 'Original post',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.feedback.count.mockResolvedValue(0)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })
    mockGeneratePost.mockRejectedValue(new Error('Gemini API error'))

    const request = createRequest('submission-123')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to regenerate post')
  })
})

