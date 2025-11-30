# Better Stack Integration Setup

## Overview

Better Stack (Logtail) is now integrated for monitoring rate limiting backend failures and security events.

## Setup Instructions

### 1. Get Your Logtail Source Token

1. Go to [Better Stack Dashboard](https://betterstack.com)
2. Navigate to **Sources** → **Logs**
3. Click **Connect source**
4. **Choose "HTTP"** (since we're using the Logtail SDK)
   - The HTTP option allows you to send logs via API
   - This is the correct choice for application-level logging
5. Copy the **Source Token** from the source you created

### 2. Add Environment Variable

Add to your `.env.local` (for local development) and Vercel environment variables:

```bash
LOGTAIL_SOURCE_TOKEN=your_source_token_here
```

**For Vercel:**
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add `LOGTAIL_SOURCE_TOKEN` with your token
4. Deploy to apply changes

### 3. Verify Integration

The integration is already implemented in:
- `lib/logtail.ts` - Logtail utility functions
- `lib/rate-limit.ts` - Rate limiting with Better Stack logging

## What Gets Logged

### Critical Events (Error Level)

1. **Rate Limiting Backend Not Configured**
   - When: PostgreSQL and Redis both unavailable in production
   - Severity: `critical`
   - Component: `rate-limiting`
   - Issue: `backend-missing`

2. **Rate Limiting Backend Error**
   - When: Rate limiting backend fails (database/Redis error)
   - Severity: `critical`
   - Component: `rate-limiting`
   - Issue: `backend-error`
   - Includes: Error message, backend type, IP (masked)

### Warning Events

3. **Rate Limit Exceeded**
   - When: User/IP exceeds rate limit
   - Severity: `warning`
   - Component: `rate-limiting`
   - Type: `ip-limit` or `identifier-limit`
   - Includes: Masked IP/identifier, limit, remaining, reset time

## Setting Up Alerts in Better Stack

### Alert 1: Critical Rate Limiting Backend Failure

**Trigger:**
- Log level: `error`
- Component: `rate-limiting`
- Issue: `backend-missing` OR `backend-error`

**Action:**
- Send email notification immediately
- Optionally: Send Slack/Discord notification

**Steps:**
1. Go to Better Stack Dashboard → **Alerts**
2. Click **Create Alert**
3. Set condition:
   ```
   level = "error" AND component = "rate-limiting" AND (issue = "backend-missing" OR issue = "backend-error")
   ```
4. Set notification channels (email, Slack, etc.)
5. Save

### Alert 2: High Rate Limit Violations (Optional)

**Trigger:**
- More than 50 rate limit violations in 5 minutes

**Action:**
- Send email notification

**Steps:**
1. Go to Better Stack Dashboard → **Alerts**
2. Click **Create Alert**
3. Set condition:
   ```
   level = "warning" AND component = "rate-limiting" AND type = "ip-limit"
   ```
4. Set threshold: 50 events in 5 minutes
5. Set notification channels
6. Save

## Viewing Logs

1. Go to Better Stack Dashboard → **Logs**
2. Filter by:
   - `component:rate-limiting` - All rate limiting logs
   - `level:error` - Critical errors only
   - `issue:backend-error` - Backend failures
   - `issue:backend-missing` - Missing backend configuration

## Testing the Integration

### Test 1: Missing Backend Configuration

1. Temporarily remove `POSTGRES_URL` and `UPSTASH_REDIS_REST_URL` from environment
2. Make a request to any rate-limited endpoint
3. Check Better Stack logs for critical error

### Test 2: Rate Limit Violation

1. Make rapid requests to exceed rate limit
2. Check Better Stack logs for warning events

### Test 3: Backend Error

1. If using PostgreSQL, temporarily break connection
2. Make requests to rate-limited endpoints
3. Check Better Stack logs for critical error

## Privacy & Security

### Data Masking (Configurable)

By default, emails and IPs are masked for privacy:
- **Email Addresses**: Masked as `ab***@example.com` (first 2 chars visible)
- **IP Addresses**: Masked as `192.168.1***` (first 8 chars visible)

**To disable masking** (for full audit trail visibility):
- Set environment variable: `MASK_AUDIT_DATA=false`
- This will log full email addresses and IP addresses
- Useful for internal audit trails where you need to see exactly who did what

**Recommendation for Internal Tools:**
- Set `MASK_AUDIT_DATA=false` for better audit trail visibility
- Full emails/IPs make it easier to track "who approved this" or "who posted that"
- Only mask if logs might be shared externally or accessed by third parties

**What's NOT Logged (Always):**
- Passwords or password hashes
- Sensitive submission content (notes, post text)
- API keys or tokens
- Session tokens

**Production Only**: Logging only active in production environment

## Cost

Better Stack Free Tier includes:
- ✅ 1 million logs per month
- ✅ 3 days log retention
- ✅ Unlimited alerts

This should be more than sufficient for monitoring rate limiting events.

## Troubleshooting

### Logs Not Appearing

1. Check `LOGTAIL_SOURCE_TOKEN` is set in environment variables
2. Verify you're in production mode (`NODE_ENV=production`)
3. Check Better Stack dashboard for any connection errors
4. Review console logs for initialization errors

### Too Many Logs

If you're getting too many rate limit warning logs:
- Adjust the alert threshold
- Consider filtering out warning-level logs in Better Stack
- The code already uses warning level (not error) to reduce noise

## Next Steps

1. ✅ Add `LOGTAIL_SOURCE_TOKEN` to environment variables
2. ✅ Deploy to production
3. ✅ Set up alerts in Better Stack dashboard
4. ✅ Test by triggering a rate limit failure
5. ✅ Monitor logs for a few days to ensure everything works

## Support

- Better Stack Docs: https://betterstack.com/docs
- Logtail Node.js SDK: https://github.com/logtail/logtail-js

