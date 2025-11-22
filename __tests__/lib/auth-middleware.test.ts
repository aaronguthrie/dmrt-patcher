import { NextRequest } from 'next/server'
import { getSession, hasRole } from '@/lib/session'
import { requireAuth, requireRole, checkSubmissionAccess } from '@/lib/auth-middleware'

// Mock dependencies
jest.mock('@/lib/session', () => ({
  ...jest.requireActual('@/lib/session'),
  getSession: jest.fn(),
  hasRole: jest.fn(),
}))

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockHasRole = hasRole as jest.MockedFunction<typeof hasRole>

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    })
  }

  it('should return session when authenticated', async () => {
    const mockSession = {
      email: 'test@example.com',
      role: 'team_member' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await requireAuth(request)

    expect(result).toEqual(mockSession)
  })

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = createRequest()
    const result = await requireAuth(request)

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Authentication required')
  })
})

describe('requireRole', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    })
  }

  it('should return session when user has required role', async () => {
    const mockSession = {
      email: 'pro@example.com',
      role: 'pro' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)
    mockHasRole.mockReturnValue(true)

    const request = createRequest()
    const result = await requireRole(request, 'pro')

    // Check if it's a session (not a Response)
    if (result instanceof Response) {
      throw new Error('Expected session but got Response')
    }
    expect(result).toEqual(mockSession)
    expect(mockHasRole).toHaveBeenCalledWith(mockSession, 'pro')
  })

  it('should return session when user has higher role', async () => {
    const mockSession = {
      email: 'leader@example.com',
      role: 'leader' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)
    mockHasRole.mockReturnValue(true) // Leader has higher role than pro

    const request = createRequest()
    const result = await requireRole(request, 'pro')

    // Check if it's a session (not a Response)
    if (result instanceof Response) {
      throw new Error('Expected session but got Response')
    }
    expect(result).toEqual(mockSession)
    expect(mockHasRole).toHaveBeenCalledWith(mockSession, 'pro')
  })

  it('should return 403 when user lacks required role', async () => {
    const mockSession = {
      email: 'member@example.com',
      role: 'team_member' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)
    mockHasRole.mockReturnValue(false) // Team member doesn't have pro role

    const request = createRequest()
    const result = await requireRole(request, 'pro')

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Insufficient permissions')
    expect(mockHasRole).toHaveBeenCalledWith(mockSession, 'pro')
  })

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = createRequest()
    const result = await requireRole(request, 'pro')

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(401)
  })
})

describe('checkSubmissionAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequest(): NextRequest {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    })
  }

  it('should allow owner to access their submission', async () => {
    const mockSession = {
      email: 'owner@example.com',
      role: 'team_member' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'owner@example.com',
      false, // PRO not allowed
      false  // Leader not allowed
    )

    // Check if it's a session (not a Response)
    if (result instanceof Response) {
      throw new Error('Expected session but got Response')
    }
    expect(result).toEqual(mockSession)
  })

  it('should allow PRO when allowPro is true', async () => {
    const mockSession = {
      email: 'pro@example.com',
      role: 'pro' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'other@example.com',
      true,  // PRO allowed
      false  // Leader not allowed
    )

    // Check if it's a session (not a Response)
    if (result instanceof Response) {
      throw new Error('Expected session but got Response')
    }
    expect(result).toEqual(mockSession)
  })

  it('should allow leader when allowLeader is true', async () => {
    const mockSession = {
      email: 'leader@example.com',
      role: 'leader' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'other@example.com',
      false, // PRO not allowed
      true   // Leader allowed
    )

    // Check if it's a session (not a Response)
    if (result instanceof Response) {
      throw new Error('Expected session but got Response')
    }
    expect(result).toEqual(mockSession)
  })

  it('should block team member from accessing other users submissions', async () => {
    const mockSession = {
      email: 'member@example.com',
      role: 'team_member' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'other@example.com',
      false, // PRO not allowed
      false  // Leader not allowed
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Access denied')
  })

  it('should block PRO when allowPro is false', async () => {
    const mockSession = {
      email: 'pro@example.com',
      role: 'pro' as const,
    }
    mockGetSession.mockResolvedValue(mockSession)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'other@example.com',
      false, // PRO not allowed
      false  // Leader not allowed
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(403)
  })

  it('should return 401 when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null)

    const request = createRequest()
    const result = await checkSubmissionAccess(
      request,
      'owner@example.com',
      true,
      true
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(401)
  })
})

