# Security Analysis: `/api/submissions/create`

## Current Status: Public Endpoint

**Endpoint**: `POST /api/submissions/create`  
**Authentication**: ❌ **None**  
**Status**: ⚠️ **Intentionally Public (with risks)**

---

## Why It's Currently Public

Based on the code analysis:

1. **Public Submission Form**: The frontend (`app/page.tsx`) shows this is a public-facing form where anyone can submit content
2. **Email-Based Authorization**: Uses `validateEmailForRole()` to check if the email is authorized for the role
3. **Workflow Design**: The flow appears to be:
   - Public user submits → Email validated → Submission created → Later authenticated users review

---

## Current Protections

✅ **What's Protected**:
- Email validation (`validateEmail()`)
- Email authorization check (`validateEmailForRole()`)
- Bot protection (`isBot()` check)
- Input validation (notes length, file types, file sizes)
- Prompt injection sanitization
- File upload validation

❌ **What's Missing**:
- **No rate limiting** (can be spammed)
- **No authentication** (anyone can submit)
- **No CAPTCHA** (bots can bypass `isBot()` check)
- **Cost risk** (generates AI content and uploads files for every submission)

---

## Security Risks

### 🔴 Critical Risks

1. **Spam/Abuse**
   - Anyone can create unlimited submissions
   - No rate limiting = unlimited API calls
   - Can exhaust AI API quota (costs money)
   - Can fill storage with uploaded files

2. **Email Enumeration**
   - Attackers can test which emails are authorized
   - `validateEmailForRole()` reveals if email exists in system
   - Can build a list of authorized team members

3. **Resource Exhaustion**
   - Each submission:
     - Calls Gemini API (costs money)
     - Uploads files to Vercel Blob (costs storage)
     - Creates database records
   - No limits = potential DoS

4. **Cost Attack**
   - Malicious actor can rack up API/storage costs
   - No authentication = no accountability

### ⚠️ Medium Risks

5. **Data Quality**
   - No verification that submitter is legitimate
   - Could receive malicious/spam submissions

---

## Is This Intentional?

**Likely YES** - This appears to be a public submission form where:
- Team members submit incident reports
- Public can submit content
- Email validation ensures only authorized emails can create submissions

**BUT** - This design has security trade-offs that should be addressed.

---

## Recommended Improvements

### Option 1: Add Rate Limiting (Minimum)

```typescript
// Add to app/api/submissions/create/route.ts
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const ipRateLimit = await rateLimitByIP(ip, 5, 60 * 60 * 1000) // 5 per hour
  
  if (!ipRateLimit.success) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 }
    )
  }
  
  // Rate limit by email (after validation)
  const emailRateLimit = await rateLimitByIdentifier(email.toLowerCase(), 3, 24 * 60 * 60 * 1000) // 3 per day
  // ... rest of code
}
```

### Option 2: Require Authentication (More Secure)

If this should only be for authenticated team members:

```typescript
import { requireAuth } from '@/lib/auth-middleware'

export async function POST(request: NextRequest) {
  const authCheck = await requireAuth(request)
  if (authCheck instanceof NextResponse) {
    return authCheck // Returns 401 if not authenticated
  }
  const session = authCheck
  
  // Use session.email instead of form email
  // ... rest of code
}
```

### Option 3: Hybrid Approach (Best for Public Form)

1. **Rate limit aggressively** (3 submissions per hour per IP)
2. **Add CAPTCHA** (hCaptcha or reCAPTCHA)
3. **Email verification** (send confirmation email before creating submission)
4. **Monitor for abuse** (alert on unusual patterns)

---

## Decision Matrix

| Approach | Security | User Experience | Cost Protection |
|----------|----------|-----------------|-----------------|
| **Current** (Public + Email Check) | ⚠️ Low | ✅ Easy | ❌ None |
| **Rate Limited** | ✅ Medium | ✅ Easy | ✅ Good |
| **Require Auth** | ✅ High | ⚠️ Requires login | ✅ Excellent |
| **Hybrid** (Rate + CAPTCHA) | ✅ High | ✅ Easy | ✅ Excellent |

---

## Recommendation

**For a public submission form**, implement **Option 3 (Hybrid)**:

1. ✅ Add rate limiting (5 submissions/hour per IP, 3/day per email)
2. ✅ Add CAPTCHA (prevents automated abuse)
3. ✅ Keep email validation (ensures only authorized emails)
4. ✅ Add monitoring/alerts for abuse patterns

This maintains the public nature while protecting against abuse and cost attacks.

---

## Current Risk Level

**Risk**: 🟡 **MEDIUM-HIGH**

**Reason**: 
- Public access is intentional
- But lacks rate limiting = vulnerable to abuse
- No cost protection = financial risk

**Priority**: ⚠️ **Should be addressed** (add rate limiting at minimum)

