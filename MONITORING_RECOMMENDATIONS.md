# Monitoring Service Recommendations

**For:** Rate limiting backend failures, security events, and application monitoring  
**Deployment:** Vercel (Next.js)  
**Budget:** Cost-effective options prioritized

---

## Top Recommendations

### 1. **Sentry** ⭐ (Recommended)

**Best for:** Error tracking, security alerts, rate limiting failures

**Pros:**
- ✅ Excellent free tier (5,000 events/month)
- ✅ Great Vercel integration
- ✅ Real-time alerts via email/Slack/Discord
- ✅ Error grouping and context
- ✅ Source maps support
- ✅ Security event tracking

**Cons:**
- ⚠️ Free tier limited to 5K events/month
- ⚠️ Can get expensive at scale

**Pricing:** Free tier available, then $26/month+

**Integration Example:**
```typescript
// Install: npm install @sentry/nextjs
// Then run: npx @sentry/wizard@latest -i nextjs

// In lib/rate-limit.ts
import * as Sentry from '@sentry/nextjs'

// Replace console.error with Sentry
if (process.env.NODE_ENV === 'production') {
  const timestamp = new Date().toISOString()
  Sentry.captureException(new Error('Rate limiting backend error'), {
    level: 'error',
    tags: {
      component: 'rate-limiting',
      severity: 'critical',
    },
    extra: {
      timestamp,
      error: error?.message || 'Unknown error',
      ip: ip,
      backend: hasPostgres ? 'postgres' : hasRedis ? 'redis' : 'none',
    },
    contexts: {
      rateLimit: {
        maxRequests,
        windowMs,
      },
    },
  })
}
```

---

### 2. **Better Stack** ⭐ (Best Value)

**Best for:** Logs, uptime monitoring, simple alerts

**Pros:**
- ✅ Generous free tier (1M logs/month, 3 monitors)
- ✅ Simple integration
- ✅ Real-time log streaming
- ✅ Uptime monitoring included
- ✅ Email/Slack/PagerDuty alerts
- ✅ Great for non-profits

**Cons:**
- ⚠️ Less feature-rich than Sentry
- ⚠️ Newer service (less mature)

**Pricing:** Free tier (1M logs/month), then $25/month

**Integration Example:**
```typescript
// Install: npm install @better-stack/logtail

// In lib/rate-limit.ts
import { Logtail } from '@better-stack/logtail'

const logtail = process.env.LOGTAIL_SOURCE_TOKEN
  ? new Logtail(process.env.LOGTAIL_SOURCE_TOKEN)
  : null

if (process.env.NODE_ENV === 'production' && logtail) {
  const timestamp = new Date().toISOString()
  logtail.error('Rate limiting backend error', {
    timestamp,
    error: error?.message || 'Unknown error',
    ip: ip,
    backend: hasPostgres ? 'postgres' : hasRedis ? 'redis' : 'none',
    severity: 'critical',
    component: 'rate-limiting',
  })
}
```

---

### 3. **Axiom** ⭐ (Best for Logs)

**Best for:** High-volume log ingestion, querying, analytics

**Pros:**
- ✅ Generous free tier (500GB ingestion/month)
- ✅ Fast log querying
- ✅ Great for security event analysis
- ✅ SQL-like query language
- ✅ Good Vercel integration

**Cons:**
- ⚠️ More complex setup
- ⚠️ Better for logs than real-time alerts

**Pricing:** Free tier (500GB/month), then usage-based

**Integration Example:**
```typescript
// Install: npm install @axiomhq/js

// In lib/rate-limit.ts
import { Axiom } from '@axiomhq/js'

const axiom = process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET
  ? new Axiom({
      token: process.env.AXIOM_TOKEN,
      orgId: process.env.AXIOM_ORG_ID,
    })
  : null

if (process.env.NODE_ENV === 'production' && axiom) {
  const timestamp = new Date().toISOString()
  axiom.ingest(process.env.AXIOM_DATASET!, [{
    _time: timestamp,
    level: 'error',
    message: 'Rate limiting backend error',
    error: error?.message || 'Unknown error',
    ip: ip,
    backend: hasPostgres ? 'postgres' : hasRedis ? 'redis' : 'none',
    severity: 'critical',
    component: 'rate-limiting',
  }])
}
```

---

### 4. **Vercel Logs** (Native Option)

**Best for:** Quick setup, basic monitoring

**Pros:**
- ✅ Built into Vercel (no extra setup)
- ✅ Free for all plans
- ✅ Real-time log streaming
- ✅ No additional cost

**Cons:**
- ⚠️ Limited retention (7 days on Pro)
- ⚠️ No alerting (must use external service)
- ⚠️ Basic querying capabilities
- ⚠️ Not ideal for security monitoring

**Pricing:** Included with Vercel

**Integration:** Already available - just view logs in Vercel dashboard

**Note:** Can combine with Vercel Logs + external alerting service

---

### 5. **Grafana Cloud** (Advanced)

**Best for:** Full observability stack, dashboards, metrics

**Pros:**
- ✅ Free tier (10K metrics, 50GB logs)
- ✅ Powerful dashboards
- ✅ Alerting included
- ✅ Metrics + logs + traces

**Cons:**
- ⚠️ More complex setup
- ⚠️ Steeper learning curve
- ⚠️ Overkill for simple use case

**Pricing:** Free tier, then $8/month+

**Integration:** Requires Prometheus or Loki setup

---

## Recommended Setup for DMRT Patcher

### **Option A: Budget-Conscious (Recommended for Non-Profit)**

**Stack:**
1. **Sentry** (Free tier) - Error tracking & alerts
2. **Vercel Logs** - Basic log viewing
3. **Uptime Robot** (Free) - Uptime monitoring

**Cost:** $0/month

**Setup:**
- Sentry for critical errors (rate limiting failures, auth failures)
- Vercel Logs for general debugging
- Uptime Robot for availability monitoring

---

### **Option B: Balanced (Best Value)**

**Stack:**
1. **Better Stack** (Free tier) - Logs + alerts
2. **Sentry** (Free tier) - Error tracking

**Cost:** $0/month (or $25/month if you exceed free tier)

**Setup:**
- Better Stack for log aggregation and alerting
- Sentry for error tracking and stack traces

---

### **Option C: Professional**

**Stack:**
1. **Sentry** (Team plan) - Error tracking
2. **Axiom** (Free tier) - Log analytics
3. **Better Stack** (Free tier) - Uptime monitoring

**Cost:** $26-50/month

---

## Implementation Guide

### Quick Start: Sentry (Recommended)

1. **Install Sentry:**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Add to `.env.local`:**
   ```
   SENTRY_DSN=your_sentry_dsn_here
   ```

3. **Update `lib/rate-limit.ts`** (see example above)

4. **Set up alerts in Sentry:**
   - Go to Alerts → Create Alert
   - Trigger: "Rate limiting backend error" events
   - Action: Email/Slack notification

---

### Quick Start: Better Stack

1. **Install:**
   ```bash
   npm install @better-stack/logtail
   ```

2. **Add to `.env.local`:**
   ```
   LOGTAIL_SOURCE_TOKEN=your_token_here
   ```

3. **Update `lib/rate-limit.ts`** (see example above)

4. **Set up alerts in Better Stack:**
   - Create alert rule for "error" level logs
   - Configure notification channels

---

## What to Monitor

### Critical Events (Alert Immediately)
- ✅ Rate limiting backend failures
- ✅ Database connection errors
- ✅ Authentication failures (brute force attempts)
- ✅ External API failures (Facebook/Instagram/Gemini)
- ✅ SSRF attempt detection (invalid photo URLs)

### Important Events (Daily Summary)
- ⚠️ Rate limit violations (429 responses)
- ⚠️ Bot detection events
- ⚠️ Unusual access patterns
- ⚠️ High error rates

### Metrics to Track
- 📊 Request volume per endpoint
- 📊 Rate limit hit rate
- 📊 Error rate by endpoint
- 📊 Response times
- 📊 External API call success rate

---

## Alert Configuration Examples

### Sentry Alert Rules

**Critical: Rate Limiting Backend Failure**
```
When: An event is seen
Where: tags.component = "rate-limiting" AND level = "error"
Action: Send email + Slack notification immediately
```

**Warning: High Rate Limit Violations**
```
When: More than 100 events in 5 minutes
Where: message contains "Rate limit exceeded"
Action: Send email notification
```

### Better Stack Alert Rules

**Critical: Rate Limiting Error**
```
When: Log level = "error" AND component = "rate-limiting"
Action: Send email + Slack immediately
```

**Warning: High Error Rate**
```
When: Error rate > 5% in 10 minutes
Action: Send email notification
```

---

## Cost Comparison

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| **Sentry** | 5K events/month | $26/month | Error tracking |
| **Better Stack** | 1M logs/month | $25/month | Logs + alerts |
| **Axiom** | 500GB/month | Usage-based | High-volume logs |
| **Vercel Logs** | Included | Included | Basic viewing |
| **Grafana Cloud** | 10K metrics | $8/month | Full observability |

---

## Recommendation

**For DMRT Patcher, I recommend:**

1. **Start with Sentry (Free tier)**
   - Easy setup
   - Great for critical errors
   - Free tier sufficient for monitoring rate limiting failures
   - Can upgrade later if needed

2. **Add Better Stack (Free tier) if needed**
   - If you need more log retention
   - Better alerting options
   - Still free for most use cases

3. **Use Vercel Logs for debugging**
   - Already available
   - Good for development/debugging
   - Not ideal for production monitoring

**Total Cost:** $0/month (free tiers should be sufficient)

---

## Next Steps

1. Choose a monitoring service (recommend Sentry)
2. Set up account and get API key
3. Install SDK
4. Update `lib/rate-limit.ts` with monitoring calls
5. Configure alerts
6. Test by triggering a rate limit failure
7. Monitor for a week and adjust

---

**Questions?** Consider:
- Expected log volume (free tiers usually sufficient)
- Alert preferences (email vs Slack vs PagerDuty)
- Budget constraints
- Team size (some services have team features)

