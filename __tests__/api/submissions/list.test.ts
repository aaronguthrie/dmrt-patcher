import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { checkBotId } from '@/lib/botid'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/session')
jest.mock('@/lib/botid')
jest.mock('@/lib/db', () => ({
  prisma: {
    submission: {
      findMany: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth-middleware')

// Import route AFTER mocks
const { GET } = require('@/app/api/submissions/list/route')

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>

describe('GET /api/submissions/list', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
  })

  function createRequest(status?: string): NextRequest {
    const url = status
      ? `http://localhost:3000/api/submissions/list?status=${status}`
      : 'http://localhost:3000/api/submissions/list'
    return new NextRequest(url, {
      method: 'GET',
    })
  }

  it('should require authentication', async () => {
    const { requireAuth } = require('@/lib/auth-middleware')
    const { NextResponse } = require('next/server')
    requireAuth.mockResolvedValue(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should allow PRO to access submissions', async () => {
    const { requireAuth } = require('@/lib/auth-middleware')
    requireAuth.mockResolvedValue({
      email: 'pro@example.com',
      role: 'pro',
    })

    const { prisma } = require('@/lib/db')
    prisma.submission.findMany.mockResolvedValue([])

    const request = createRequest('awaiting_pro')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(prisma.submission.findMany).toHaveBeenCalled()
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })
})

