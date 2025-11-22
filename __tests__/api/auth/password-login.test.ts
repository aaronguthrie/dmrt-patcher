import { NextRequest } from 'next/server'
import { compare } from 'bcryptjs'
import { createSession } from '@/lib/session'
import { rateLimitByIP } from '@/lib/rate-limit'
import { checkBotId } from '@/lib/botid'

// Mock dependencies BEFORE importing the route
jest.mock('bcryptjs')
jest.mock('@/lib/session')
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/botid')

// Import route AFTER mocks
const { POST } = require('@/app/api/auth/password-login/route')

const mockCompare = compare as jest.MockedFunction<typeof compare>
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>
const mockRateLimitByIP = rateLimitByIP as jest.MockedFunction<typeof rateLimitByIP>
const mockCheckBotId = checkBotId as jest.MockedFunction<typeof checkBotId>

describe('POST /api/auth/password-login', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      PRO_EMAIL: 'test-pro@example.com',
      PRO_PASSWORD_HASH: '$2a$10$test.hash.here',
    }

    // Default mocks
    mockCheckBotId.mockResolvedValue({ isBot: false })
    mockRateLimitByIP.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 900000,
    })
    mockCreateSession.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createRequest(password: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/auth/password-login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should login successfully with correct password', async () => {
    mockCompare.mockResolvedValue(true)

    const request = createRequest('correct-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.email).toBe('test-pro@example.com')
    expect(data.role).toBe('pro')
    expect(mockCreateSession).toHaveBeenCalledWith({
      email: 'test-pro@example.com',
      role: 'pro',
    })
  })

  it('should reject incorrect password', async () => {
    mockCompare.mockResolvedValue(false)

    const request = createRequest('wrong-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid password')
    expect(data.code).toBe('INVALID_PASSWORD')
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('should require password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/password-login', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Password required')
  })

  it('should block bots', async () => {
    mockCheckBotId.mockResolvedValue({ isBot: true })

    const request = createRequest('any-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('should enforce rate limiting', async () => {
    mockRateLimitByIP.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 900000,
    })

    const request = createRequest('any-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Too many login attempts')
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('should handle missing PRO_PASSWORD_HASH', async () => {
    delete process.env.PRO_PASSWORD_HASH

    const request = createRequest('any-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Server configuration error')
    expect(data.code).toBe('MISSING_PASSWORD_CONFIG')
  })

  it('should handle missing PRO_EMAIL', async () => {
    delete process.env.PRO_EMAIL

    const request = createRequest('any-password')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Server configuration error')
    expect(data.code).toBe('MISSING_PRO_EMAIL')
  })
})

