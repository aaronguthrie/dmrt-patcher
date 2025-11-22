import { NextRequest } from 'next/server'
import { checkBotId } from '@/lib/botid'
import { checkSubmissionAccess } from '@/lib/auth-middleware'

// Mock dependencies BEFORE importing the route
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
const { GET, PATCH } = require('@/app/api/submissions/[id]/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockCheckSubmissionAccess = checkSubmissionAccess as jest.MockedFunction<typeof checkSubmissionAccess>

describe('GET /api/submissions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
  })

  function createRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/submissions/${id}`, {
      method: 'GET',
    })
  }

  it('should return submission for owner', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
      notes: 'Test notes',
      finalPostText: 'Test post',
      photoPaths: [],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.submission).toEqual(mockSubmission)
    expect(mockCheckSubmissionAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      'owner@example.com',
      true,
      true
    )
  })

  it('should allow PRO to access any submission', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'other@example.com',
      notes: 'Test notes',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })

    expect(response.status).toBe(200)
    expect(mockCheckSubmissionAccess).toHaveBeenCalled()
  })

  it('should allow leader to access any submission', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'other@example.com',
      notes: 'Test notes',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'leader@example.com',
      role: 'leader',
    })

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })

    expect(response.status).toBe(200)
  })

  it('should block team member from accessing other users submissions', async () => {
    const { prisma } = require('@/lib/db')
    const { NextResponse } = require('next/server')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'other@example.com',
      notes: 'Test notes',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue(
      NextResponse.json({ error: 'Access denied' }, { status: 403 })
    )

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should return 404 for non-existent submission', async () => {
    const { prisma } = require('@/lib/db')
    prisma.submission.findUnique.mockResolvedValue(null)

    const request = createRequest('non-existent')
    const response = await GET(request, { params: { id: 'non-existent' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Submission not found')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should require authentication', async () => {
    const { prisma } = require('@/lib/db')
    const { NextResponse } = require('next/server')
    const mockSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    mockCheckSubmissionAccess.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )

    const request = createRequest('submission-123')
    const response = await GET(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})

describe('PATCH /api/submissions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
  })

  function createRequest(id: string, body: any): NextRequest {
    return new NextRequest(`http://localhost:3000/api/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should allow owner to update submission', async () => {
    const { prisma } = require('@/lib/db')
    const existingSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }
    const updatedSubmission = {
      ...existingSubmission,
      notes: 'Updated notes',
    }

    prisma.submission.findUnique.mockResolvedValue(existingSubmission)
    prisma.submission.update.mockResolvedValue(updatedSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })

    const request = createRequest('submission-123', { notes: 'Updated notes' })
    const response = await PATCH(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.submission).toEqual(updatedSubmission)
  })

  it('should prevent team member from changing status', async () => {
    const { prisma } = require('@/lib/db')
    const existingSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }

    prisma.submission.findUnique.mockResolvedValue(existingSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'owner@example.com',
      role: 'team_member',
    })

    const request = createRequest('submission-123', { status: 'awaiting_pro' })
    const response = await PATCH(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Status can only be changed through workflow endpoints')
  })

  it('should allow PRO to change status', async () => {
    const { prisma } = require('@/lib/db')
    const existingSubmission = {
      id: 'submission-123',
      submittedByEmail: 'owner@example.com',
    }
    const updatedSubmission = {
      ...existingSubmission,
      status: 'awaiting_pro',
    }

    prisma.submission.findUnique.mockResolvedValue(existingSubmission)
    prisma.submission.update.mockResolvedValue(updatedSubmission)
    mockCheckSubmissionAccess.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })

    const request = createRequest('submission-123', { status: 'awaiting_pro' })
    const response = await PATCH(request, { params: { id: 'submission-123' } })

    expect(response.status).toBe(200)
  })

  it('should return 404 for non-existent submission', async () => {
    const { prisma } = require('@/lib/db')
    prisma.submission.findUnique.mockResolvedValue(null)

    const request = createRequest('non-existent', { notes: 'test' })
    const response = await PATCH(request, { params: { id: 'non-existent' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Submission not found')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123', { notes: 'test' })
    const response = await PATCH(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })
})

