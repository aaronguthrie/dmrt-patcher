// Utility to get the base URL for the application
// In production, prefers custom domain, falls back to VERCEL_URL

export function getBaseUrl(): string {
  // In production on Vercel
  if (process.env.VERCEL) {
    // Check for custom domain first
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL
    }
    
    // Fall back to VERCEL_URL (auto-provided by Vercel)
    if (process.env.VERCEL_URL) {
      // VERCEL_URL doesn't include protocol, add https
      return `https://${process.env.VERCEL_URL}`
    }
  }
  
  // Development fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

