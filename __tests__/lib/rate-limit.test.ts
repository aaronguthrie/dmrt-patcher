import { rateLimitByIP, rateLimitByIdentifier, getRateLimiter } from '@/lib/rate-limit'

// Mock the database and Redis dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

describe('Rate Limiting', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the rate limiter instance
    jest.resetModules()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('InMemoryRateLimiter (via rateLimitByIP)', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        POSTGRES_URL: undefined,
        UPSTASH_REDIS_REST_URL: undefined,
      }
      // Reset module to get fresh instance
      jest.resetModules()
    })

    it('should allow requests within limit', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')
      
      const result1 = await rateLimitByIP('test-ip-1', 5, 15 * 60 * 1000)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)

      const result2 = await rateLimitByIP('test-ip-1', 5, 15 * 60 * 1000)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests exceeding limit', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')

      // Make 3 requests (within limit)
      await rateLimitByIP('test-ip-2', 3, 15 * 60 * 1000)
      await rateLimitByIP('test-ip-2', 3, 15 * 60 * 1000)
      await rateLimitByIP('test-ip-2', 3, 15 * 60 * 1000)

      // 4th request should be blocked
      const result = await rateLimitByIP('test-ip-2', 3, 15 * 60 * 1000)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset window after expiration', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')

      // Exhaust limit
      await rateLimitByIP('test-ip-3', 3, 100) // 100ms window
      await rateLimitByIP('test-ip-3', 3, 100)
      await rateLimitByIP('test-ip-3', 3, 100)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      const result = await rateLimitByIP('test-ip-3', 3, 100)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should track different identifiers separately', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')

      // Exhaust limit for ip1
      await rateLimitByIP('ip1', 2, 15 * 60 * 1000)
      await rateLimitByIP('ip1', 2, 15 * 60 * 1000)
      const result1 = await rateLimitByIP('ip1', 2, 15 * 60 * 1000)
      expect(result1.success).toBe(false)

      // ip2 should still have full limit
      const result2 = await rateLimitByIP('ip2', 2, 15 * 60 * 1000)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)
    })
  })

  describe('rateLimitByIP', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        POSTGRES_URL: undefined,
        UPSTASH_REDIS_REST_URL: undefined,
      }
      jest.resetModules() // Reset to get fresh rate limiter instance
    })

    it('should rate limit by IP address', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')
      const result1 = await rateLimitByIP('192.168.1.1', 3, 15 * 60 * 1000)
      expect(result1.success).toBe(true)

      const result2 = await rateLimitByIP('192.168.1.1', 3, 15 * 60 * 1000)
      expect(result2.success).toBe(true)

      const result3 = await rateLimitByIP('192.168.1.1', 3, 15 * 60 * 1000)
      expect(result3.success).toBe(true)

      // Should be blocked
      const result4 = await rateLimitByIP('192.168.1.1', 3, 15 * 60 * 1000)
      expect(result4.success).toBe(false)
    })

    it('should handle different IPs separately', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')
      const result1 = await rateLimitByIP('192.168.1.1', 2, 15 * 60 * 1000)
      expect(result1.success).toBe(true)

      await rateLimitByIP('192.168.1.1', 2, 15 * 60 * 1000)
      const result3 = await rateLimitByIP('192.168.1.1', 2, 15 * 60 * 1000)
      expect(result3.success).toBe(false) // IP1 blocked

      // Different IP should still work
      const result4 = await rateLimitByIP('192.168.1.2', 2, 15 * 60 * 1000)
      expect(result4.success).toBe(true)
    })

    it('should return correct limit and remaining values', async () => {
      const { rateLimitByIP } = require('@/lib/rate-limit')
      const result = await rateLimitByIP('192.168.1.1', 5, 15 * 60 * 1000)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(4)
      expect(result.reset).toBeGreaterThan(Date.now())
    })
  })

  describe('rateLimitByIdentifier', () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        POSTGRES_URL: undefined,
        UPSTASH_REDIS_REST_URL: undefined,
      }
      jest.resetModules() // Reset to get fresh rate limiter instance
    })

    it('should rate limit by identifier', async () => {
      const { rateLimitByIdentifier } = require('@/lib/rate-limit')
      const result1 = await rateLimitByIdentifier('user@example.com', 2, 15 * 60 * 1000)
      expect(result1.success).toBe(true)

      const result2 = await rateLimitByIdentifier('user@example.com', 2, 15 * 60 * 1000)
      expect(result2.success).toBe(true)

      // Should be blocked
      const result3 = await rateLimitByIdentifier('user@example.com', 2, 15 * 60 * 1000)
      expect(result3.success).toBe(false)
    })

    it('should handle different identifiers separately', async () => {
      const { rateLimitByIdentifier } = require('@/lib/rate-limit')
      await rateLimitByIdentifier('user1@example.com', 2, 15 * 60 * 1000)
      await rateLimitByIdentifier('user1@example.com', 2, 15 * 60 * 1000)
      const result1 = await rateLimitByIdentifier('user1@example.com', 2, 15 * 60 * 1000)
      expect(result1.success).toBe(false) // user1 blocked

      // user2 should still work
      const result2 = await rateLimitByIdentifier('user2@example.com', 2, 15 * 60 * 1000)
      expect(result2.success).toBe(true)
    })
  })

  describe('getRateLimiter', () => {
    beforeEach(() => {
      jest.resetModules()
    })

    it('should use in-memory limiter when no backend configured', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        POSTGRES_URL: undefined,
        UPSTASH_REDIS_REST_URL: undefined,
      }

      const { getRateLimiter } = require('@/lib/rate-limit')
      const limiter = getRateLimiter()
      expect(limiter).toBeDefined()
    })

    it('should prefer PostgreSQL when available', () => {
      process.env = {
        ...originalEnv,
        POSTGRES_URL: 'postgresql://test',
      }

      const { getRateLimiter } = require('@/lib/rate-limit')
      const limiter = getRateLimiter()
      expect(limiter).toBeDefined()
    })
  })
})

