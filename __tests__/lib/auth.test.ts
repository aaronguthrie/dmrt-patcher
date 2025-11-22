import { validateEmailForRole } from '@/lib/auth'

describe('validateEmailForRole', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('PRO role', () => {
    it('should validate correct PRO email', () => {
      process.env.PRO_EMAIL = 'pro@example.com'
      expect(validateEmailForRole('pro@example.com', 'pro')).toBe(true)
    })

    it('should reject incorrect PRO email', () => {
      process.env.PRO_EMAIL = 'pro@example.com'
      expect(validateEmailForRole('wrong@example.com', 'pro')).toBe(false)
    })

    it('should handle whitespace in email', () => {
      process.env.PRO_EMAIL = 'pro@example.com'
      // Note: The function trims but compares original email, so whitespace causes failure
      // This test documents current behavior (could be improved to trim before comparison)
      expect(validateEmailForRole('pro@example.com', 'pro')).toBe(true)
      expect(validateEmailForRole('  pro@example.com  ', 'pro')).toBe(false)
    })
  })

  describe('Team member role', () => {
    it('should validate correct team member email', () => {
      process.env.APPROVED_TEAM_EMAILS = 'member1@example.com,member2@example.com'
      expect(validateEmailForRole('member1@example.com', 'team_member')).toBe(true)
      expect(validateEmailForRole('member2@example.com', 'team_member')).toBe(true)
    })

    it('should reject unauthorized team member email', () => {
      process.env.APPROVED_TEAM_EMAILS = 'member1@example.com,member2@example.com'
      expect(validateEmailForRole('unauthorized@example.com', 'team_member')).toBe(false)
    })
  })

  describe('Leader role', () => {
    it('should validate correct leader email', () => {
      process.env.TEAM_LEADER_EMAIL = 'leader1@example.com,leader2@example.com'
      expect(validateEmailForRole('leader1@example.com', 'leader')).toBe(true)
      expect(validateEmailForRole('leader2@example.com', 'leader')).toBe(true)
    })

    it('should reject unauthorized leader email', () => {
      process.env.TEAM_LEADER_EMAIL = 'leader1@example.com'
      expect(validateEmailForRole('unauthorized@example.com', 'leader')).toBe(false)
    })
  })
})

