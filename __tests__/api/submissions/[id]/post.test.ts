import { NextRequest } from 'next/server'
import { postToFacebook, postToInstagram } from '@/lib/meta'
import { checkBotId } from '@/lib/botid'
import { requireRole } from '@/lib/auth-middleware'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/meta')
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
const { POST } = require('@/app/api/submissions/[id]/post/route')

const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>
const mockPostToFacebook = postToFacebook as jest.MockedFunction<typeof postToFacebook>
const mockPostToInstagram = postToInstagram as jest.MockedFunction<typeof postToInstagram>

describe('POST /api/submissions/[id]/post', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockRequireRole.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })
  })

  function createRequest(id: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/submissions/${id}/post`, {
      method: 'POST',
    })
  }

  it('should post to Facebook and Instagram successfully', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      finalPostText: 'Test post text',
      editedByPro: null,
      photoPaths: ['https://example.com/photo.jpg'],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'posted',
      postedToFacebook: true,
      postedToInstagram: true,
      facebookPostId: 'fb-123',
      instagramPostId: 'ig-123',
    })

    mockPostToFacebook.mockResolvedValue({ id: 'fb-123' })
    mockPostToInstagram.mockResolvedValue({ id: 'ig-123' })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.facebookPostId).toBe('fb-123')
    expect(data.instagramPostId).toBe('ig-123')
    expect(mockPostToFacebook).toHaveBeenCalledWith('Test post text', ['https://example.com/photo.jpg'])
    expect(mockPostToInstagram).toHaveBeenCalledWith('Test post text', 'https://example.com/photo.jpg')
  })

  it('should use editedByPro text if available', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      finalPostText: 'Original text',
      editedByPro: 'Edited text',
      photoPaths: [],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue(mockSubmission)
    mockPostToFacebook.mockResolvedValue({ id: 'fb-123' })

    const request = createRequest('submission-123')
    await POST(request, { params: { id: 'submission-123' } })

    expect(mockPostToFacebook).toHaveBeenCalledWith('Edited text', [])
  })

  it('should skip Instagram if no photos', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      finalPostText: 'Test post',
      editedByPro: null,
      photoPaths: [],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'posted',
      postedToFacebook: true,
      postedToInstagram: false,
    })
    mockPostToFacebook.mockResolvedValue({ id: 'fb-123' })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.facebookPostId).toBe('fb-123')
    expect(data.instagramPostId).toBeNull()
    expect(mockPostToInstagram).not.toHaveBeenCalled()
  })

  it('should handle Facebook posting failure gracefully', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      finalPostText: 'Test post',
      editedByPro: null,
      photoPaths: ['photo.jpg'],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)
    prisma.submission.update.mockResolvedValue({
      ...mockSubmission,
      status: 'posted',
      postedToFacebook: false,
      postedToInstagram: true,
    })
    mockPostToFacebook.mockRejectedValue(new Error('Facebook API error'))
    mockPostToInstagram.mockResolvedValue({ id: 'ig-123' })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.facebookPostId).toBeNull()
    expect(data.instagramPostId).toBe('ig-123')
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

  it('should return 400 if no post text available', async () => {
    const { prisma } = require('@/lib/db')
    const mockSubmission = {
      id: 'submission-123',
      finalPostText: null,
      editedByPro: null,
      photoPaths: [],
    }

    prisma.submission.findUnique.mockResolvedValue(mockSubmission)

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No post text available')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('submission-123')
    const response = await POST(request, { params: { id: 'submission-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })
})

