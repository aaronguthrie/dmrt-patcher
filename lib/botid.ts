// BotID integration - Advanced bot detection powered by Vercel/Kasada
// Much better than isBot() - uses ML and behavioral analysis
// See: https://vercel.com/blog/introducing-botid

/**
 * Check if request is from a bot using BotID
 * Returns { isBot: boolean } - unambiguous pass/fail
 * 
 * Setup required:
 * 1. npm install botid
 * 2. Add rewrites to next.config.js (see below)
 * 3. Mount BotID client in layout.tsx (see below)
 * 4. Use this function in API routes
 */
export async function checkBotId(): Promise<{ isBot: boolean }> {
  try {
    // Dynamic import to avoid errors if botid not installed
    const { checkBotId: checkBotIdFn } = await import('botid/server')
    return await checkBotIdFn()
  } catch (error) {
    // Fallback to isBot() if BotID not configured
    console.warn('BotID not available, falling back to isBot() check')
    return { isBot: false } // Fail open - don't block if BotID unavailable
  }
}

/**
 * Enhanced bot check - uses BotID if available, falls back to isBot()
 * Use this in API routes for best protection
 */
export async function checkBot(request: Request): Promise<boolean> {
  try {
    const botIdResult = await checkBotId()
    if (botIdResult.isBot) {
      return true
    }
  } catch (error) {
    // Fallback to user-agent check if BotID fails
  }
  
  // Fallback to basic isBot() check
  const userAgent = request.headers.get('user-agent')
  const { isBot } = await import('./security')
  return isBot(userAgent)
}

