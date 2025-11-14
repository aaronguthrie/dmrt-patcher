# BotID Setup Guide

## What is BotID?

BotID is Vercel's advanced bot detection system powered by Kasada. It's **much better** than `isBot()` because:

- ✅ Uses ML and behavioral analysis (not just user-agent strings)
- ✅ Detects sophisticated bots that mimic real users
- ✅ Resists replay attacks and tampering
- ✅ No CAPTCHAs - invisible to real users
- ✅ Enterprise-grade protection (used by v0.dev)

**vs. `isBot()`:**
- ❌ Only checks user-agent strings (easily bypassed)
- ❌ Can't detect advanced bots (Playwright, Puppeteer, etc.)
- ❌ Simple pattern matching

## Setup Instructions

### 1. Install BotID Package

```bash
npm install botid
```

### 2. Add Rewrites to `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/botid/:path*',
        destination: 'https://botid.vercel.app/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```

### 3. Mount BotID Client in `app/layout.tsx`

Add this to your root layout:

```tsx
import { BotId } from 'botid/client'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <BotId />
        {children}
      </body>
    </html>
  )
}
```

### 4. Use BotID in API Routes

Replace `isBot()` checks with BotID:

**Before (isBot):**
```typescript
import { isBot } from '@/lib/security'

if (isBot(userAgent)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

**After (BotID):**
```typescript
import { checkBotId } from '@/lib/botid'

const { isBot } = await checkBotId()
if (isBot) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

### 5. Update Critical Endpoints

Update these endpoints to use BotID:
- `/api/auth/send-link` - Prevent bot signups
- `/api/auth/validate` - Prevent bot authentication
- `/api/submissions/create` - Prevent bot submissions
- `/api/dashboard/auth` - Prevent bot dashboard access

## Pricing

- **Basic**: Free for all teams
- **Deep Analysis** (powered by Kasada): Available for Pro and Enterprise teams

## Migration Strategy

1. **Phase 1**: Install BotID alongside `isBot()` (both run)
2. **Phase 2**: Replace `isBot()` checks with BotID in critical endpoints
3. **Phase 3**: Remove `isBot()` checks entirely (optional - can keep as fallback)

## Benefits

- ✅ **Better Detection**: Catches sophisticated bots that `isBot()` misses
- ✅ **No User Friction**: Invisible to real users (no CAPTCHAs)
- ✅ **Enterprise-Grade**: Used by Vercel's own high-value apps
- ✅ **Easy Setup**: Just install, configure, and use

## References

- [Vercel BotID Blog Post](https://vercel.com/blog/introducing-botid)
- [BotID Documentation](https://vercel.com/docs/security/botid)

