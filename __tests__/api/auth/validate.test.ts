import { NextRequest } from 'next/server'
import { validateAuthCode } from '@/lib/auth'
import { createSession } from '@/lib/session'
import { rateLimitByIP } from '@/lib/rate-limit'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/auth')
jest.mock('@/lib/session')
jest.mock('@/lib/rate-limit')

// Import route AFTER mocks
const { POST } = require('@/app/api/auth/validate/route')

const mockValidateAuthCode = validateAuthCode as jest.MockedFunction<typeof validateAuthCode>
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>
const mockRateLimitByIP = rateLimitByIP as jest.MockedFunction<typeof rateLimitByIP>

describe('POST /api/auth/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimitByIP.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 900000,
    })
    mockCreateSession.mockResolvedValue(undefined)
  })

  function createRequest(code: string, role?: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ code, role }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should validate valid code and create session', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: true,
      email: 'test@example.com',
      role: 'pro',
    })

    const request = createRequest('valid-code-123', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.email).toBe('test@example.com')
    expect(data.role).toBe('pro')
    expect(mockValidateAuthCode).toHaveBeenCalledWith('valid-code-123', 'pro')
    expect(mockCreateSession).toHaveBeenCalledWith({
      email: 'test@example.com',
      role: 'pro',
      submissionId: undefined,
    })
  })

  it('should reject invalid code', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: false,
    })

    const request = createRequest('invalid-code')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid or expired code')
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('should reject expired code', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: false,
    })

    const request = createRequest('expired-code')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid or expired code')
  })

  it('should reject used code', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: false,
    })

    const request = createRequest('used-code')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid or expired code')
  })

  it('should require code', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/validate', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Code required')
  })

  it('should validate role if provided', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: true,
      email: 'test@example.com',
      role: 'pro',
    })

    const request = createRequest('valid-code', 'pro')
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockValidateAuthCode).toHaveBeenCalledWith('valid-code', 'pro')
  })

  it('should handle submissionId in response', async () => {
    mockValidateAuthCode.mockResolvedValue({
      valid: true,
      email: 'test@example.com',
      role: 'leader',
      submissionId: 'submission-123',
    })

    const request = createRequest('valid-code', 'leader')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.submissionId).toBe('submission-123')
    expect(mockCreateSession).toHaveBeenCalledWith({
      email: 'test@example.com',
      role: 'leader',
      submissionId: 'submission-123',
    })
  })

  it('should enforce rate limiting', async () => {
    mockRateLimitByIP.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 900000,
    })

    const request = createRequest('any-code')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Too many requests')
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('should handle validation errors', async () => {
    mockValidateAuthCode.mockRejectedValue(new Error('Database error'))

    const request = createRequest('any-code')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to validate code')
  })
})

