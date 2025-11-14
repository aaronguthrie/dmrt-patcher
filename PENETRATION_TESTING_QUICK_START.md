# Penetration Testing Quick Start Guide

## 🚀 Run Tests in 30 Seconds

### Option 1: Bash Script (Recommended for Quick Tests)
```bash
bash scripts/penetration-test-production.sh
```

### Option 2: Node.js Framework (More Detailed)
```bash
node scripts/penetration-test-framework.js
```

### Option 3: AI-Assisted (Most Comprehensive)
1. Open `HACKERONE_PENETRATION_TESTER_PROMPT.md`
2. Copy the entire prompt
3. Paste into Claude/ChatGPT
4. Ask: "Begin security assessment of https://post.dmrt.ie"

## 📊 What You'll Get

- ✅ **Pass/Fail** status for each security test
- 🔴 **Critical vulnerabilities** flagged immediately
- ⚠️ **Warnings** for potential issues
- 📝 **Detailed log file** with all results

## 🎯 Quick Manual Tests

### Test Authentication (Should return 401)
```bash
curl https://post.dmrt.ie/api/submissions/list
```

### Test Rate Limiting (Should hit 429 after 5-6 requests)
```bash
for i in {1..10}; do
  curl -X POST https://post.dmrt.ie/api/auth/send-link \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","role":"team_member"}'
  sleep 0.5
done
```

### Test Security Headers
```bash
curl -I https://post.dmrt.ie | grep -iE "(x-content-type|x-frame|x-xss|content-security)"
```

## 📋 Test Coverage

✅ Authentication & Authorization  
✅ Rate Limiting  
✅ IDOR Protection  
✅ Information Disclosure  
✅ Security Headers  
✅ Input Validation  
✅ Error Handling  

## 🔍 Understanding Results

- **✓ Pass** = Security control working correctly
- **✗ Fail** = Security control not working
- **⚠ Warn** = Potential issue, needs review
- **🔴 Critical** = Immediate action required

## 📚 Full Documentation

- **Complete Guide**: `PENETRATION_TESTING_README.md`
- **HackerOne Prompt**: `HACKERONE_PENETRATION_TESTER_PROMPT.md`
- **API Endpoints**: `API_ENDPOINTS_AUDIT.md`

## ⚡ Pro Tips

1. **Run tests regularly** - Especially after deployments
2. **Review log files** - They contain detailed findings
3. **Use AI prompt** - Most comprehensive assessment
4. **Combine methods** - Use scripts + manual testing

---

**Target**: https://post.dmrt.ie  
**Last Updated**: $(date)

