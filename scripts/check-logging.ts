#!/usr/bin/env ts-node
/**
 * Diagnostic script to check if Better Stack logging is configured correctly
 * Run: npx ts-node scripts/check-logging.ts
 */

import { getLogtail } from '../lib/logtail'

console.log('🔍 Checking Better Stack Logging Configuration...\n')

// Check NODE_ENV
const nodeEnv = process.env.NODE_ENV
console.log(`NODE_ENV: ${nodeEnv || '(not set)'}`)
if (nodeEnv !== 'production') {
  console.warn('⚠️  NODE_ENV is not "production". Logging will be disabled.')
  console.warn('   Set NODE_ENV=production to enable logging.\n')
} else {
  console.log('✅ NODE_ENV is set to production\n')
}

// Check LOGTAIL_SOURCE_TOKEN
const token = process.env.LOGTAIL_SOURCE_TOKEN
if (!token) {
  console.error('❌ LOGTAIL_SOURCE_TOKEN is not set!')
  console.error('   Add it to your environment variables:')
  console.error('   - Vercel: Project Settings → Environment Variables')
  console.error('   - Local: .env.local file')
  console.error('\n   Get your token from: https://betterstack.com → Sources → Logs\n')
} else {
  console.log('✅ LOGTAIL_SOURCE_TOKEN is set')
  console.log(`   Token preview: ${token.substring(0, 8)}...${token.substring(token.length - 4)}\n`)
}

// Try to initialize Logtail
console.log('Testing Logtail initialization...')
const logtail = getLogtail()

if (logtail) {
  console.log('✅ Logtail initialized successfully!')
  console.log('\n📝 Testing log send...')
  
  // Test sending a log
  logtail.info('Test log from diagnostic script', {
    test: true,
    timestamp: new Date().toISOString(),
  }).then(() => {
    console.log('✅ Test log sent successfully!')
    console.log('   Check your Better Stack dashboard to see if it arrived.')
    process.exit(0)
  }).catch((err) => {
    console.error('❌ Failed to send test log:', err)
    process.exit(1)
  })
} else {
  console.error('❌ Logtail initialization failed!')
  console.error('\nPossible issues:')
  console.error('1. LOGTAIL_SOURCE_TOKEN not set or invalid')
  console.error('2. NODE_ENV not set to "production"')
  console.error('3. Network connectivity issues')
  console.error('4. Invalid token format')
  process.exit(1)
}

