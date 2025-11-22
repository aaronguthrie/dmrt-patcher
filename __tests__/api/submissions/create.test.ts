import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { checkBotId } from '@/lib/botid'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/session')
jest.mock('@/lib/botid')
jest.mock('@/lib/db', () => ({
  prisma: {
    submission: {
      create: jest.fn(),
    },
  },
}))
jest.mock('@/lib/blob')
jest.mock('@/lib/gemini')
jest.mock('@/lib/validation')
jest.mock('@/lib/auth-middleware')

// Import route AFTER mocks
const { POST } = require('@/app/api/submissions/create/route')

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>

describe('POST /api/submissions/create', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCheckBotId.mockResolvedValue({ isBot: false })
  })

  function createRequest(notes: string, files: File[] = []): NextRequest {
    const formData = new FormData()
    formData.append('notes', notes)
    files.forEach(file => formData.append('photos', file))
    
    return new NextRequest('http://localhost:3000/api/submissions/create', {
      method: 'POST',
      body: formData,
    })
  }

  it('should require authentication', async () => {
    const { requireAuth } = require('@/lib/auth-middleware')
    const { NextResponse } = require('next/server')
    requireAuth.mockResolvedValue(NextResponse.json({ error: 'Authentication required' }, { status: 401 }))

    const request = createRequest('Test notes')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('Test notes')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should require notes', async () => {
    const { requireAuth } = require('@/lib/auth-middleware')
    requireAuth.mockResolvedValue({
      email: 'test@example.com',
      role: 'team_member',
    })

    const request = createRequest('')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Notes required')
  })
})
