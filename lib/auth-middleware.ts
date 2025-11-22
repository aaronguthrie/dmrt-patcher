// Authentication and authorization middleware
import { NextRequest, NextResponse } from 'next/server'
import { getSession, hasRole, Session } from './session'
import { Role } from '@prisma/client'

export interface AuthContext {
  session: Session
  request: NextRequest
}

/**
 * Requires authentication - returns session or error response
 */
export async function requireAuth(
  request: NextRequest
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    // Log authentication failures for security monitoring
    if (process.env.NODE_ENV === 'production') {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      console.warn(`🚫 Authentication required but not provided - IP: ${ip} - Path: ${request.nextUrl.pathname}`)
    }
    
    return NextResponse.json(
      { error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'X-Auth-Required': 'true', // Helps differentiate from bot blocking
        },
      }
    )
  }
  
  return session
}

/**
 * Requires specific role - returns session or error response
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: Role
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    // Log authentication failures for security monitoring
    if (process.env.NODE_ENV === 'production') {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      console.warn(`🚫 Authentication required but not provided - IP: ${ip} - Path: ${request.nextUrl.pathname}`)
    }
    
    return NextResponse.json(
      { error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
        },
      }
    )
  }
  
  if (!hasRole(session, requiredRole)) {
    // Log authorization failures for security monitoring
    if (process.env.NODE_ENV === 'production') {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      console.warn(`🚫 Authorization failed - User: ${session.email} - Required role: ${requiredRole} - IP: ${ip} - Path: ${request.nextUrl.pathname}`)
    }
    
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { 
        status: 403,
        headers: {
          'X-Authorization-Failed': 'true',
        },
      }
    )
  }
  
  return session
}

/**
 * Checks if user owns a submission or has appropriate role
 */
export async function checkSubmissionAccess(
  request: NextRequest,
  submissionEmail: string,
  allowPro: boolean = true,
  allowLeader: boolean = true
): Promise<Session | NextResponse> {
  const session = await getSession()
  
  if (!session) {
    // Log authentication failures for security monitoring
    if (process.env.NODE_ENV === 'production') {
      const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      console.warn(`🚫 Authentication required but not provided - IP: ${ip} - Path: ${request.nextUrl.pathname}`)
    }
    
    return NextResponse.json(
      { error: 'Authentication required' },
      { 
        status: 401,
        headers: {
          'X-Auth-Required': 'true',
        },
      }
    )
  }
  
  // Owner can always access
  if (session.email === submissionEmail) {
    return session
  }
  
  // PRO can access if allowed
  if (allowPro && session.role === 'pro') {
    return session
  }
  
  // Leader can access if allowed
  if (allowLeader && session.role === 'leader') {
    return session
  }
  
  // Log IDOR attempt for security monitoring
  if (process.env.NODE_ENV === 'production') {
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    console.warn(`🚫 IDOR attempt blocked - User: ${session.email} - Attempted access to: ${submissionEmail} - IP: ${ip} - Path: ${request.nextUrl.pathname}`)
  }
  
  return NextResponse.json(
    { error: 'Access denied' },
    { 
      status: 403,
      headers: {
        'X-Access-Denied': 'true',
      },
    }
  )
}

