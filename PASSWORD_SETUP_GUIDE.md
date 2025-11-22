# PRO Password Setup Guide

## Issue: "Invalid password" Error

If you're getting "Invalid password" when trying to log in, it means the password hash in Vercel doesn't match the password you're typing.

## Steps to Fix

### 1. Generate a New Password Hash

Run this command locally:

```bash
node scripts/generate-password-hash.js "your-actual-password"
```

This will output something like:
```
PRO_PASSWORD_HASH=$2b$10$M6fYytWmSEGsUA2ubsWaheXyAUnR9XcnXSh3MbxgHTZqEU9eRGQsG
```

### 2. Copy the Hash (Without Quotes)

**Important:** Copy ONLY the hash part, not the `PRO_PASSWORD_HASH=` prefix.

For example, if the output is:
```
PRO_PASSWORD_HASH=$2b$10$M6fYytWmSEGsUA2ubsWaheXyAUnR9XcnXSh3MbxgHTZqEU9eRGQsG
```

Copy only:
```
$2b$10$M6fYytWmSEGsUA2ubsWaheXyAUnR9XcnXSh3MbxgHTZqEU9eRGQsG
```

### 3. Add to Vercel Environment Variables

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Find or create `PRO_PASSWORD_HASH`
4. Paste the hash value (without quotes, without `PRO_PASSWORD_HASH=`)
5. Make sure it's set for **Production** environment
6. **Redeploy** your application

### 4. Verify Hash Format

The hash should:
- Start with `$2a$`, `$2b$`, or `$2y$`
- Be exactly 60 characters long
- Have no spaces, quotes, or extra characters

**Correct format:**
```
$2b$10$M6fYytWmSEGsUA2ubsWaheXyAUnR9XcnXSh3MbxgHTZqEU9eRGQsG
```

**Incorrect formats:**
```
"$2b$10$..."  ❌ (has quotes)
PRO_PASSWORD_HASH=$2b$10$...  ❌ (has prefix)
$2b$10$... (with trailing space)  ❌ (has spaces)
```

### 5. Test Login

After redeploying, try logging in with the **exact password** you used to generate the hash.

## Common Issues

### Issue: Hash has quotes in Vercel
**Solution:** Remove quotes from the environment variable value

### Issue: Hash has extra whitespace
**Solution:** The code now trims whitespace automatically, but double-check in Vercel

### Issue: Wrong password
**Solution:** Make sure you're using the exact password you used to generate the hash

### Issue: Hash format is wrong
**Solution:** Regenerate the hash using the script - it will always produce the correct format

## Verification

After setting up, the hash should:
- ✅ Start with `$2a$`, `$2b$`, or `$2y$`
- ✅ Be 60 characters long
- ✅ Have no quotes or spaces
- ✅ Match the password you're typing exactly

