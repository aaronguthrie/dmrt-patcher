import { NextRequest } from 'next/server'
import { createAuthCode, validateEmailForRole } from '@/lib/auth'
import { sendMagicLink } from '@/lib/resend'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/auth')
jest.mock('@/lib/resend')
jest.mock('@/lib/rate-limit')

// Import route AFTER mocks
const { POST } = require('@/app/api/auth/send-link/route')

const mockCreateAuthCode = createAuthCode as jest.MockedFunction<typeof createAuthCode>
const mockValidateEmailForRole = validateEmailForRole as jest.MockedFunction<typeof validateEmailForRole>
const mockSendMagicLink = sendMagicLink as jest.MockedFunction<typeof sendMagicLink>
const mockRateLimitByIP = rateLimitByIP as jest.MockedFunction<typeof rateLimitByIP>
const mockRateLimitByIdentifier = rateLimitByIdentifier as jest.MockedFunction<typeof rateLimitByIdentifier>

describe('POST /api/auth/send-link', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 'test-resend-key',
      RESEND_FROM_EMAIL: 'test@example.com',
      PRO_EMAIL: 'pro@example.com',
      APPROVED_TEAM_EMAILS: 'member@example.com',
      TEAM_LEADER_EMAIL: 'leader@example.com',
    }

    // Default mocks
    mockRateLimitByIP.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 900000,
    })
    mockRateLimitByIdentifier.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: Date.now() + 3600000,
    })
    mockValidateEmailForRole.mockReturnValue(true)
    mockCreateAuthCode.mockResolvedValue('test-auth-code-123')
    mockSendMagicLink.mockResolvedValue(undefined)
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function createRequest(email: string, role: string): NextRequest {
    return new NextRequest('http://localhost:3000/api/auth/send-link', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('should send magic link for valid PRO email', async () => {
    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockValidateEmailForRole).toHaveBeenCalledWith('pro@example.com', 'pro')
    expect(mockCreateAuthCode).toHaveBeenCalledWith('pro@example.com', 'pro')
    expect(mockSendMagicLink).toHaveBeenCalledWith('pro@example.com', 'pro', 'test-auth-code-123')
  })

  it('should send magic link for valid team member email', async () => {
    const request = createRequest('member@example.com', 'team_member')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockValidateEmailForRole).toHaveBeenCalledWith('member@example.com', 'team_member')
  })

  it('should reject unauthorized email', async () => {
    mockValidateEmailForRole.mockReturnValue(false)

    const request = createRequest('unauthorized@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Email not authorised')
    expect(data.code).toBe('UNAUTHORIZED_EMAIL')
    expect(mockCreateAuthCode).not.toHaveBeenCalled()
    expect(mockSendMagicLink).not.toHaveBeenCalled()
  })

  it('should require email and role', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/send-link', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Email and role required')
    expect(data.code).toBe('MISSING_FIELDS')
  })

  it('should validate email format', async () => {
    const request = createRequest('invalid-email', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
    expect(data.code).toBe('INVALID_EMAIL')
  })

  it('should validate role', async () => {
    const request = createRequest('pro@example.com', 'invalid_role')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid role')
    expect(data.code).toBe('INVALID_ROLE')
  })

  it('should enforce IP rate limiting', async () => {
    mockRateLimitByIP.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 900000,
    })

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Too many requests')
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('should enforce email rate limiting', async () => {
    mockRateLimitByIdentifier.mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: Date.now() + 3600000,
    })

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Too many requests for this email')
    expect(data.code).toBe('EMAIL_RATE_LIMIT_EXCEEDED')
  })

  it('should handle missing RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('RESEND_API_KEY is missing')
    expect(data.code).toBe('MISSING_RESEND_API_KEY')
  })

  it('should handle missing RESEND_FROM_EMAIL', async () => {
    delete process.env.RESEND_FROM_EMAIL

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('RESEND_FROM_EMAIL is missing')
    expect(data.code).toBe('MISSING_RESEND_FROM_EMAIL')
  })

  it('should handle database errors', async () => {
    mockCreateAuthCode.mockRejectedValue(new Error('Database connection failed'))

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create authentication code')
    expect(data.code).toBe('DATABASE_ERROR')
  })

  it('should handle email sending errors', async () => {
    mockSendMagicLink.mockRejectedValue(new Error('Email service unavailable'))

    const request = createRequest('pro@example.com', 'pro')
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send email')
    expect(data.code).toBe('EMAIL_ERROR')
  })

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/send-link', {
      method: 'POST',
      body: 'invalid json{',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid request body')
    expect(data.code).toBe('INVALID_JSON')
  })
})

