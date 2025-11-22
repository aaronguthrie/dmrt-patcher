#!/usr/bin/env node

/**
 * Generate a bcrypt hash for PRO password
 * 
 * Usage:
 *   node scripts/generate-password-hash.js "your-password-here"
 * 
 * Or run interactively:
 *   node scripts/generate-password-hash.js
 */

const { hash } = require('bcryptjs')
const readline = require('readline')

async function generateHash(password) {
  // Use 10 rounds (good balance of security and performance)
  const hashValue = await hash(password, 10)
  return hashValue
}

async function main() {
  let password

  // Check if password provided as command line argument
  if (process.argv[2]) {
    password = process.argv[2]
  } else {
    // Interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    password = await new Promise((resolve) => {
      rl.question('Enter PRO password: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })
  }

  if (!password) {
    console.error('Error: Password is required')
    process.exit(1)
  }

  try {
    const hashValue = await generateHash(password)
    console.log('\n✅ Password hash generated successfully!\n')
    console.log('Add this to your .env file and Vercel environment variables:')
    console.log(`PRO_PASSWORD_HASH=${hashValue}\n`)
    console.log('⚠️  Keep your password secure and never commit it to git!')
  } catch (error) {
    console.error('Error generating hash:', error)
    process.exit(1)
  }
}

main()

