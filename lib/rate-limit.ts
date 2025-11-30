// Rate limiting utility - supports multiple backends
// Priority: Neon PostgreSQL > Upstash Redis > In-memory (dev only)
// Note: Vercel KV was replaced with Marketplace Storage integrations (June 2025)
import { logError, logWarning } from './logtail'

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimiter {
  limit(identifier: string): Promise<RateLimitResult>
}

// In-memory rate limiter (development only - doesn't work in serverless)
class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const record = this.store.get(identifier)

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key)
        }
      }
    }

    if (!record || now > record.resetAt) {
      const resetAt = now + this.windowMs
      this.store.set(identifier, { count: 1, resetAt })
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: resetAt,
      }
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: record.resetAt,
      }
    }

    record.count++
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      reset: record.resetAt,
    }
  }
}

// Vercel KV rate limiter
class VercelKVRateLimiter implements RateLimiter {
  private kv: any
  private maxRequests: number
  private windowMs: number

  constructor(kv: any, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.kv = kv
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()

    try {
      const existing = await this.kv.get(key)
      
      if (!existing) {
        const resetAt = now + this.windowMs
        await this.kv.set(key, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: Math.ceil(this.windowMs / 1000),
        })
        return {
          success: true,
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          reset: resetAt,
        }
      }

      const data = JSON.parse(existing)
      
      if (now > data.resetAt) {
        const resetAt = now + this.windowMs
        await this.kv.set(key, JSON.stringify({ count: 1, resetAt }), {
          expirationTtl: Math.ceil(this.windowMs / 1000),
        })
        return {
          success: true,
          limit: this.maxRequests,
          remaining: this.maxRequests - 1,
          reset: resetAt,
        }
      }

      if (data.count >= this.maxRequests) {
        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: data.resetAt,
        }
      }

      data.count++
      await this.kv.set(key, JSON.stringify(data), {
        expirationTtl: Math.ceil((data.resetAt - now) / 1000),
      })

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - data.count,
        reset: data.resetAt,
      }
    } catch (error) {
      console.error('Rate limit error (Vercel KV):', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
      }
    }
  }
}

// Neon PostgreSQL rate limiter (uses existing database connection)
class NeonPostgreSQLRateLimiter implements RateLimiter {
  private prisma: any
  private maxRequests: number
  private windowMs: number

  constructor(prisma: any, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.prisma = prisma
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now()
    const resetAt = now + this.windowMs
    const windowSeconds = Math.ceil(this.windowMs / 1000)

    try {
      // Use raw SQL for atomic operations (faster than Prisma for this use case)
      // Clean up expired entries first
      await this.prisma.$executeRaw`
        DELETE FROM rate_limits 
        WHERE reset_at < ${now}
      `

      // Get or create rate limit record
      const result = await this.prisma.$queryRaw`
        INSERT INTO rate_limits (identifier, count, reset_at, created_at)
        VALUES (${identifier}, 1, ${resetAt}, ${now})
        ON CONFLICT (identifier) 
        DO UPDATE SET 
          count = CASE 
            WHEN reset_at < ${now} THEN 1
            WHEN count >= ${this.maxRequests} THEN count
            ELSE count + 1
          END,
          reset_at = CASE 
            WHEN reset_at < ${now} THEN ${resetAt}
            ELSE reset_at
          END
        RETURNING count, reset_at
      `

      const record = result[0]
      const count = Number(record.count)

      if (count > this.maxRequests) {
        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: Number(record.reset_at),
        }
      }

      return {
        success: true,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - count),
        reset: Number(record.reset_at),
      }
    } catch (error: any) {
      // If table doesn't exist, create it and retry once
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        try {
          await this.prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS rate_limits (
              identifier TEXT PRIMARY KEY,
              count INTEGER NOT NULL DEFAULT 1,
              reset_at BIGINT NOT NULL,
              created_at BIGINT NOT NULL
            )
          `
          // Retry the limit operation
          return this.limit(identifier)
        } catch (createError) {
          console.error('Rate limit error (Neon PostgreSQL - table creation):', createError)
        }
      } else {
        console.error('Rate limit error (Neon PostgreSQL):', error)
      }
      
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: resetAt,
      }
    }
  }
}

// Upstash Redis rate limiter
class UpstashRedisRateLimiter implements RateLimiter {
  private redis: any
  private maxRequests: number
  private windowMs: number

  constructor(redis: any, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.redis = redis
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowSeconds = Math.ceil(this.windowMs / 1000)

    try {
      // Use sliding window algorithm
      const pipeline = this.redis.pipeline()
      pipeline.zremrangebyscore(key, 0, now - this.windowMs)
      pipeline.zcard(key)
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
      pipeline.expire(key, windowSeconds)
      const results = await pipeline.exec()

      const count = results[1] as number

      if (count >= this.maxRequests) {
        // Get oldest entry to calculate reset time
        const oldest = await this.redis.zrange(key, 0, 0, { withScores: true })
        const resetAt = oldest.length > 0 ? oldest[0].score + this.windowMs : now + this.windowMs

        return {
          success: false,
          limit: this.maxRequests,
          remaining: 0,
          reset: resetAt,
        }
      }

      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - count - 1,
        reset: now + this.windowMs,
      }
    } catch (error) {
      console.error('Rate limit error (Upstash Redis):', error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: now + this.windowMs,
      }
    }
  }
}

// Factory function to create appropriate rate limiter
let rateLimiterInstance: RateLimiter | null = null

export function getRateLimiter(
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RateLimiter {
  if (rateLimiterInstance) {
    return rateLimiterInstance
  }

  // Try Neon PostgreSQL first (you already have it connected)
  if (process.env.POSTGRES_URL) {
    try {
      const { prisma } = require('./db')
      rateLimiterInstance = new NeonPostgreSQLRateLimiter(prisma, maxRequests, windowMs)
      console.log('✅ Using Neon PostgreSQL for rate limiting')
      return rateLimiterInstance
    } catch (error) {
      console.warn('Neon PostgreSQL not available for rate limiting, trying Upstash Redis...')
    }
  }

  // Try Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // Check if @upstash/redis is available (optional dependency)
      let Redis: any
      try {
        Redis = require('@upstash/redis').Redis
      } catch (requireError) {
        // Package not installed, skip Upstash Redis
        console.warn('@upstash/redis not installed, skipping Upstash Redis rate limiting')
        throw new Error('@upstash/redis not available')
      }
      
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      rateLimiterInstance = new UpstashRedisRateLimiter(redis, maxRequests, windowMs)
      console.log('✅ Using Upstash Redis for rate limiting')
      return rateLimiterInstance
    } catch (error) {
      console.warn('Upstash Redis not available, using in-memory (dev only)...')
    }
  }

  // Fallback to in-memory (development only - warns in production)
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using in-memory rate limiting in production. This will not work effectively in serverless. Please ensure POSTGRES_URL is set (Neon) or configure Upstash Redis.')
  } else {
    console.warn('⚠️  Using in-memory rate limiting (dev only - not suitable for production)')
  }
  
  rateLimiterInstance = new InMemoryRateLimiter(maxRequests, windowMs)
  return rateLimiterInstance
}

/**
 * Rate limit a request by IP address
 * Includes security monitoring and error handling
 */
export async function rateLimitByIP(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(maxRequests, windowMs)
  
  // Check if using in-memory fallback in production (security risk)
  if (process.env.NODE_ENV === 'production') {
    const hasPostgres = !!process.env.POSTGRES_URL
    const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    
    if (!hasPostgres && !hasRedis) {
      // Log critical security warning with monitoring details
      const timestamp = new Date().toISOString()
      console.error(`🚨 [${timestamp}] CRITICAL SECURITY WARNING: Rate limiting using in-memory fallback in production!`)
      console.error(`🚨 [${timestamp}] This will NOT work effectively in serverless environments!`)
      console.error(`🚨 [${timestamp}] Please configure POSTGRES_URL (Neon) or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (Upstash)`)
      console.error(`🚨 [${timestamp}] Environment check - POSTGRES_URL: ${hasPostgres ? 'SET' : 'MISSING'}, Redis: ${hasRedis ? 'SET' : 'MISSING'}`)
      
      // Send critical alert to Better Stack
      logError('Rate limiting backend not configured - using in-memory fallback', {
        severity: 'critical',
        component: 'rate-limiting',
        issue: 'backend-missing',
        hasPostgres,
        hasRedis,
        environment: process.env.NODE_ENV,
        timestamp,
      })
      
      // In production, fail closed - block requests if rate limiting backend is not configured
      // This prevents unlimited requests when rate limiting is broken
      // Note: This is a security measure - legitimate users may be affected until backend is configured
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: Date.now() + windowMs,
      }
    }
  }
  
  try {
    const result = await limiter.limit(`ip:${ip}`)
    
    // Log rate limit violations for security monitoring
    if (!result.success) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${ip} (limit: ${result.limit}, remaining: ${result.remaining})`)
      
      // Log to Better Stack for analysis (use warning level to avoid spam)
      const shouldMask = process.env.MASK_AUDIT_DATA !== 'false'
      await logWarning('Rate limit exceeded', {
        component: 'rate-limiting',
        type: 'ip-limit',
        ip: shouldMask ? ip.substring(0, 8) + '***' : ip,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: new Date(result.reset).toISOString(),
      })
    }
    
    return result
  } catch (error: any) {
    // Log rate limiting errors
    console.error('Rate limiting error:', error?.message || error)
    
    // Fail closed in production - block request if rate limiting fails
    // This prevents bypass when rate limiting backend is down
    if (process.env.NODE_ENV === 'production') {
      const timestamp = new Date().toISOString()
      const hasPostgres = !!process.env.POSTGRES_URL
      const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
      
      console.error(`🚨 [${timestamp}] Rate limiting backend error - blocking request for security`)
      console.error(`🚨 [${timestamp}] Error details: ${error?.message || 'Unknown error'}`)
      console.error(`🚨 [${timestamp}] IP: ${ip}`)
      
      // Send critical error to Better Stack (fire-and-forget)
      const shouldMask = process.env.MASK_AUDIT_DATA !== 'false'
      logError('Rate limiting backend error - blocking request for security', {
        severity: 'critical',
        component: 'rate-limiting',
        issue: 'backend-error',
        error: error,
        ip: shouldMask ? ip.substring(0, 8) + '***' : ip,
        backend: hasPostgres ? 'postgres' : hasRedis ? 'redis' : 'none',
        maxRequests,
        windowMs,
        timestamp,
      })
      
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: Date.now() + windowMs,
      }
    }
    
    // In development, fail open to allow testing
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Date.now() + windowMs,
    }
  }
}

/**
 * Rate limit a request by identifier (email, user ID, etc.)
 * Includes security monitoring and error handling
 */
export async function rateLimitByIdentifier(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(maxRequests, windowMs)
  
  // Check if using in-memory fallback in production (security risk)
  if (process.env.NODE_ENV === 'production') {
    const hasPostgres = !!process.env.POSTGRES_URL
    const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    
    if (!hasPostgres && !hasRedis) {
      // Log critical security warning
      console.error('🚨 CRITICAL SECURITY WARNING: Rate limiting using in-memory fallback in production!')
      console.error('🚨 This will NOT work effectively in serverless environments!')
      
      // In production, fail closed - block requests if rate limiting backend is not configured
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: Date.now() + windowMs,
      }
    }
  }
  
  try {
    const result = await limiter.limit(`id:${identifier}`)
    
    // Log rate limit violations for security monitoring
    if (!result.success) {
      // Don't log full identifier to avoid logging sensitive data
      const maskedId = identifier.length > 4 
        ? `${identifier.substring(0, 2)}***${identifier.substring(identifier.length - 2)}`
        : '***'
      console.warn(`⚠️ Rate limit exceeded for identifier: ${maskedId} (limit: ${result.limit}, remaining: ${result.remaining})`)
      
      // Log to Better Stack for analysis (use warning level to avoid spam)
      const shouldMask = process.env.MASK_AUDIT_DATA !== 'false'
      const loggedId = shouldMask ? maskedId : identifier
      await logWarning('Rate limit exceeded', {
        component: 'rate-limiting',
        type: 'identifier-limit',
        identifier: loggedId,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: new Date(result.reset).toISOString(),
      })
    }
    
    return result
  } catch (error: any) {
    // Log rate limiting errors
    console.error('Rate limiting error:', error?.message || error)
    
    // Fail closed in production - block request if rate limiting fails
    if (process.env.NODE_ENV === 'production') {
      const timestamp = new Date().toISOString()
      const hasPostgres = !!process.env.POSTGRES_URL
      const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
      
      console.error(`🚨 [${timestamp}] Rate limiting backend error - blocking request for security`)
      console.error(`🚨 [${timestamp}] Error details: ${error?.message || 'Unknown error'}`)
      
      // Send critical error to Better Stack
      // Note: No IP/identifier in this context, so no masking needed
      await logError('Rate limiting backend error - blocking request for security', {
        severity: 'critical',
        component: 'rate-limiting',
        issue: 'backend-error',
        error: error,
        backend: hasPostgres ? 'postgres' : hasRedis ? 'redis' : 'none',
        maxRequests,
        windowMs,
        timestamp,
      })
      
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: Date.now() + windowMs,
      }
    }
    
    // In development, fail open to allow testing
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Date.now() + windowMs,
    }
  }
}

