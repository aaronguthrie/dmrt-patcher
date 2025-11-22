# API Endpoints Audit Guide

## How to Find All API Endpoints in Next.js App Router

### Method 1: File System Search (Recommended)

Next.js App Router uses a convention-based routing system:
- API routes are in `app/api/**/route.ts` files
- Each `route.ts` file exports HTTP method functions (GET, POST, PATCH, etc.)

```bash
# Find all route files
find app/api -name "route.ts" -type f

# List with HTTP methods
find app/api -name "route.ts" -exec sh -c 'echo "$1: $(grep -E "^export.*function (GET|POST|PATCH|PUT|DELETE)" "$1" | sed "s/.*function //" | sed "s/(.*//")' _ {} \;
```

### Method 2: Use the Provided Script

```bash
bash scripts/list-api-endpoints.sh
```

### Method 3: Manual Code Review

1. Start at `app/api/`
2. Follow directory structure:
   - `app/api/auth/` → `/api/auth/*`
   - `app/api/submissions/[id]/` → `/api/submissions/:id/*`
   - `app/api/dashboard/` → `/api/dashboard/*`

---

## Complete API Endpoints List

### Authentication Endpoints

| Endpoint | Method | Auth Required | Rate Limited | Purpose |
|----------|--------|---------------|--------------|---------|
| `/api/auth/send-link` | POST | ❌ No | ✅ Yes (IP: 5/15min, Email: 3/hour) | Send magic link |
| `/api/auth/validate` | POST | ❌ No | ✅ Yes (IP: 10/15min) | Validate auth code |

### Submission Endpoints

| Endpoint | Method | Auth Required | IDOR Protection | Purpose |
|----------|--------|---------------|-----------------|---------|
| `/api/submissions/create` | POST | ❌ No (public) | N/A | Create submission |
| `/api/submissions/list` | GET | ✅ Yes | ✅ Yes (filters by email) | List submissions |
| `/api/submissions/[id]` | GET | ✅ Yes | ✅ Yes (owner/PRO/leader) | Get submission |
| `/api/submissions/[id]` | PATCH | ✅ Yes | ✅ Yes (owner/PRO/leader) | Update submission |
| `/api/submissions/[id]/post` | POST | ✅ Yes (PRO) | ✅ Yes | Post to social media |
| `/api/submissions/[id]/send-for-approval` | POST | ✅ Yes (PRO) | ✅ Yes | Send for approval |
| `/api/submissions/[id]/approve` | POST | ✅ Yes (Leader) | ✅ Yes | Approve/reject |
| `/api/submissions/regenerate` | POST | ✅ Yes | ✅ Yes | Regenerate post |
| `/api/submissions/ready` | POST | ✅ Yes | ✅ Yes (owner only) | Mark as ready |

### Dashboard Endpoints

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/api/dashboard/auth` | POST | ❌ No | Dashboard password auth |
| `/api/dashboard/submissions` | GET | ✅ Yes | Get dashboard data |
| `/api/dashboard/export` | GET | ✅ Yes | Export submissions |

---

## Security Checklist Per Endpoint

For each endpoint, verify:

- [ ] **Authentication**: Is `requireAuth()` or `requireRole()` called?
- [ ] **Authorization**: Are role checks in place?
- [ ] **IDOR Protection**: Can users access others' data?
- [ ] **Rate Limiting**: Is brute force protection enabled?
- [ ] **Input Validation**: Are inputs validated and sanitized?
- [ ] **Error Handling**: Do errors leak sensitive info?
- [ ] **Bot Protection**: Is `isBot()` check present?

---

## Dynamic Routes

Next.js uses `[id]` for dynamic segments:
- `app/api/submissions/[id]/route.ts` → `/api/submissions/:id`
- `app/api/submissions/[id]/post/route.ts` → `/api/submissions/:id/post`

**Important**: Always check IDOR protection on dynamic routes!

---

## Testing All Endpoints

```bash
# Test authentication requirement
for endpoint in $(bash scripts/list-api-endpoints.sh | grep "📍" | sed 's/📍 //'); do
  echo "Testing $endpoint..."
  curl -X GET "https://post.dmrt.ie$endpoint" -w "\nHTTP: %{http_code}\n"
done
```

---

## Common Patterns to Look For

### ✅ Secure Pattern
```typescript
export async function GET(request: NextRequest) {
  const authCheck = await requireAuth(request)
  if (authCheck instanceof NextResponse) {
    return authCheck // Returns 401 if not authenticated
  }
  const session = authCheck
  // ... rest of code
}
```

### ❌ Insecure Pattern
```typescript
export async function GET(request: NextRequest) {
  // No auth check!
  const data = await getData()
  return NextResponse.json({ data })
}
```

---

## Tools for API Discovery

1. **Static Analysis**: `find` + `grep` (what we're doing)
2. **Dynamic Testing**: Burp Suite, OWASP ZAP
3. **Documentation**: OpenAPI/Swagger (if generated)
4. **Network Monitoring**: Browser DevTools Network tab

---

## Next Steps

1. ✅ All endpoints identified
2. ✅ Security audit completed
3. ✅ Fixes applied
4. ⏳ Verify in production after deployment


