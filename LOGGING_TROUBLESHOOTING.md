# Logging Troubleshooting Guide

## Issue: Logs Not Appearing in Better Stack

If your production app is not logging to Better Stack, follow these steps:

## Quick Checklist

1. ✅ **Is `LOGTAIL_SOURCE_TOKEN` set in Vercel?**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Check if `LOGTAIL_SOURCE_TOKEN` exists
   - Verify it's set for **Production** environment

2. ✅ **Is `NODE_ENV=production`?**
   - Vercel automatically sets this, but verify in your deployment logs
   - Check Vercel deployment logs for: `✅ Logtail initialized successfully`

3. ✅ **Is the token valid?**
   - Get your token from: https://betterstack.com → Sources → Logs
   - Make sure you chose **HTTP** as the source type
   - Copy the **Source Token** (not the API key)

4. ✅ **Check Vercel deployment logs**
   - Look for these messages:
     - `✅ Logtail initialized successfully` = Working!
     - `⚠️ Logtail: LOGTAIL_SOURCE_TOKEN not set` = Token missing
     - `⚠️ Logtail: NODE_ENV is not "production"` = Wrong environment

## Diagnostic Steps

### Step 1: Check Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Look for `LOGTAIL_SOURCE_TOKEN`
5. Verify it's set for **Production** (not just Preview/Development)

### Step 2: Check Deployment Logs

1. Go to your latest deployment in Vercel
2. Click on **Build Logs** or **Function Logs**
3. Search for "Logtail" or "Better Stack"
4. Look for initialization messages

**Expected messages:**
- `✅ Logtail initialized successfully` = Good!
- `⚠️ Logtail: LOGTAIL_SOURCE_TOKEN not set` = Need to add token
- `❌ Failed to initialize Logtail` = Token might be invalid

### Step 3: Test Logging Manually

Add this to any API route temporarily to test:

```typescript
import { logAudit } from '@/lib/logtail'

// In your route handler
logAudit('Test log', {
  component: 'test',
  actionType: 'read',
  test: true,
})
```

Then trigger that endpoint and check Better Stack.

### Step 4: Check Better Stack Dashboard

1. Go to [Better Stack Dashboard](https://betterstack.com)
2. Navigate to **Logs**
3. Check if any logs are arriving
4. Look at the **Sources** tab to see connection status

## Common Issues

### Issue 1: Token Not Set

**Symptoms:**
- No logs in Better Stack
- Console shows: `⚠️ Logtail: LOGTAIL_SOURCE_TOKEN not set`

**Solution:**
1. Get token from Better Stack → Sources → Logs → HTTP source
2. Add to Vercel: Settings → Environment Variables
3. Set for **Production** environment
4. Redeploy

### Issue 2: Wrong Environment

**Symptoms:**
- Console shows: `⚠️ Logtail: NODE_ENV is not "production"`
- Logging disabled

**Solution:**
- Vercel should set this automatically
- If not, add `NODE_ENV=production` to Vercel environment variables

### Issue 3: Token Invalid or Wrong Type

**Symptoms:**
- Console shows: `❌ Failed to initialize Logtail`
- Error in initialization

**Solution:**
1. Verify you're using the **Source Token** (not API key)
2. Make sure you created an **HTTP** source (not other types)
3. Regenerate token if needed
4. Update in Vercel and redeploy

### Issue 4: Logs Not Sending (Silent Failure)

**Symptoms:**
- Logtail initializes successfully
- But no logs appear in Better Stack

**Solution:**
1. Check network connectivity (Vercel → Better Stack)
2. Verify Better Stack source is active
3. Check Better Stack dashboard for connection errors
4. Look for `Failed to send log to Better Stack` in console

## Debug Mode

The code now includes diagnostic logging:

- **Console warnings** when token is missing
- **Console errors** when initialization fails
- **Console logs** when successfully initialized
- **Fallback console logging** when Logtail is disabled (in production)

Check your Vercel function logs to see these messages.

## Testing Locally

To test logging locally (it won't send, but you can verify config):

```bash
# Set environment variables
export NODE_ENV=production
export LOGTAIL_SOURCE_TOKEN=your_token_here

# Run diagnostic script
npx ts-node scripts/check-logging.ts
```

## Still Not Working?

1. **Check Vercel Function Logs** for any error messages
2. **Verify Better Stack source** is active and receiving logs
3. **Test with a simple log** in a test endpoint
4. **Check network** - Vercel might be blocking outbound requests (unlikely)
5. **Verify token format** - should be a long string, not empty

## Quick Fix: Add Console Fallback

If Better Stack isn't working, the code now logs to console in production when Logtail is disabled. Check your Vercel function logs for:
- `[Logtail Disabled] AUDIT: ...` messages
- `[Logtail Disabled] ERROR: ...` messages

This helps verify the logging code is running even if Better Stack isn't configured.

