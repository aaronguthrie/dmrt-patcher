// Better Stack Logtail integration for monitoring
import { Logtail } from '@logtail/node'

let logtailInstance: Logtail | null = null

/**
 * Get or create Logtail instance
 * Only initializes in production if LOGTAIL_SOURCE_TOKEN is set
 */
export function getLogtail(): Logtail | null {
  // Only use in production
  if (process.env.NODE_ENV !== 'production') {
    // Log once in production to help debug
    if (!logtailInstance && process.env.VERCEL) {
      console.warn('⚠️ Logtail: NODE_ENV is not "production". Logging disabled.')
    }
    return null
  }

  // Return existing instance if already created
  if (logtailInstance) {
    return logtailInstance
  }

  // Create new instance if token is provided
  const token = process.env.LOGTAIL_SOURCE_TOKEN
  if (!token) {
    // Log once to help debug missing token
    console.warn('⚠️ Logtail: LOGTAIL_SOURCE_TOKEN not set. Logging disabled.')
    console.warn('⚠️ To enable logging, add LOGTAIL_SOURCE_TOKEN to your environment variables.')
    return null
  }

  try {
    logtailInstance = new Logtail(token)
    console.log('✅ Logtail initialized successfully')
    return logtailInstance
  } catch (error) {
    console.error('❌ Failed to initialize Logtail:', error)
    return null
  }
}

/**
 * Log an error to Better Stack
 */
export async function logError(
  message: string,
  context: {
    error?: string | Error
    severity?: 'critical' | 'error' | 'warning' | 'info'
    component?: string
    [key: string]: any
  } = {}
) {
  const logtail = getLogtail()
  if (!logtail) {
    // In production, also log to console for debugging
    if (process.env.NODE_ENV === 'production') {
      console.error(`[Logtail Disabled] ${message}`, context)
    }
    return
  }

  const { error, severity = 'error', component, ...extra } = context

  // Fire-and-forget: don't block the request on logging
  // Logtail batches logs internally, so this is safe
  logtail.error(message, {
    severity,
    component: component || 'unknown',
    error: error instanceof Error ? error.message : error,
    errorStack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    ...extra,
  }).catch((err) => {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to send log to Better Stack:', err)
  })
}

/**
 * Log a warning to Better Stack
 */
export async function logWarning(
  message: string,
  context: {
    component?: string
    [key: string]: any
  } = {}
) {
  const logtail = getLogtail()
  if (!logtail) {
    return
  }

  const { component, ...extra } = context

  // Fire-and-forget: don't block the request on logging
  logtail.warn(message, {
    severity: 'warning',
    component: component || 'unknown',
    timestamp: new Date().toISOString(),
    ...extra,
  }).catch((err) => {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to send log to Better Stack:', err)
  })
}

/**
 * Log an info message to Better Stack
 */
export async function logInfo(
  message: string,
  context: {
    component?: string
    [key: string]: any
  } = {}
) {
  const logtail = getLogtail()
  if (!logtail) {
    return
  }

  const { component, ...extra } = context

  // Fire-and-forget: don't block the request on logging
  logtail.info(message, {
    severity: 'info',
    component: component || 'unknown',
    timestamp: new Date().toISOString(),
    ...extra,
  }).catch((err) => {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to send log to Better Stack:', err)
  })
}

/**
 * Log audit trail events (user actions, important operations)
 * This creates a comprehensive audit trail for security and compliance
 */
export async function logAudit(
  action: string,
  context: {
    userEmail?: string
    userRole?: string
    component?: string
    resourceId?: string
    resourceType?: string
    actionType?: 'create' | 'update' | 'delete' | 'read' | 'approve' | 'reject' | 'post' | 'export' | 'authenticate'
    ip?: string
    success?: boolean
    [key: string]: any
  } = {}
) {
  const logtail = getLogtail()
  if (!logtail) {
    // In production, also log to console for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Logtail Disabled] AUDIT: ${action}`, context)
    }
    return
  }

  const {
    userEmail,
    userRole,
    component,
    resourceId,
    resourceType,
    actionType,
    ip,
    success = true,
    ...extra
  } = context

  // Masking is configurable via environment variable
  // For internal audit trails, you may want full emails/IPs to see who did what
  // Set MASK_AUDIT_DATA=false to log full emails and IPs
  const shouldMask = process.env.MASK_AUDIT_DATA !== 'false'
  
  const loggedEmail = userEmail
    ? (shouldMask 
        ? userEmail.split('@')[0].substring(0, 2) + '***@' + userEmail.split('@')[1]
        : userEmail)
    : undefined

  const loggedIp = ip 
    ? (shouldMask 
        ? ip.substring(0, 8) + '***'
        : ip)
    : undefined

  // Fire-and-forget: don't block the request on logging
  // This is critical for performance - audit logs should not slow down requests
  logtail.info(`AUDIT: ${action}`, {
    severity: 'info',
    component: component || 'audit',
    audit: true,
    action,
    actionType,
    userEmail: loggedEmail,
    userRole,
    resourceId,
    resourceType,
    ip: loggedIp,
    success,
    timestamp: new Date().toISOString(),
    ...extra,
  }).catch((err) => {
    // Fail silently - don't break the app if logging fails
    console.error('Failed to send audit log to Better Stack:', err)
  })
}

