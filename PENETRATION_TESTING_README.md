# Penetration Testing System

A comprehensive HackerOne-style penetration testing framework for the DMRT Post application.

## 🎯 Overview

This penetration testing system provides:

1. **HackerOne-Style Prompt** (`HACKERONE_PENETRATION_TESTER_PROMPT.md`) - Complete testing methodology and persona
2. **Bash Testing Script** (`scripts/penetration-test-production.sh`) - Automated bash-based testing
3. **Node.js Testing Framework** (`scripts/penetration-test-framework.js`) - Advanced JavaScript-based testing

## 🚀 Quick Start

### Option 1: Bash Script (Simple)

```bash
bash scripts/penetration-test-production.sh
```

### Option 2: Node.js Framework (Advanced)

```bash
node scripts/penetration-test-framework.js
```

### Option 3: AI-Assisted Testing

Copy the prompt from `HACKERONE_PENETRATION_TESTER_PROMPT.md` into your AI assistant (Claude, ChatGPT, etc.) and have it conduct the assessment.

## 📋 What Gets Tested

### Phase 1: Authentication & Authorization
- ✅ Authentication requirements on all endpoints
- ✅ Authorization checks (role-based access control)
- ✅ Session management security

### Phase 2: Rate Limiting
- ✅ Rate limiting on sensitive endpoints
- ✅ Brute force protection
- ✅ Distributed attack protection

### Phase 3: IDOR (Insecure Direct Object Reference)
- ✅ Access control on user resources
- ✅ Horizontal privilege escalation
- ✅ Vertical privilege escalation

### Phase 4: Information Disclosure
- ✅ Error message security
- ✅ Stack trace exposure
- ✅ Sensitive data leakage

### Phase 5: Security Headers
- ✅ X-Content-Type-Options
- ✅ X-Frame-Options
- ✅ X-XSS-Protection
- ✅ Content-Security-Policy
- ✅ Strict-Transport-Security

### Phase 6: Input Validation
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Command injection protection
- ✅ Path traversal protection

### Phase 7: Error Handling
- ✅ Proper error responses
- ✅ No information disclosure
- ✅ Graceful error handling

## 📊 Test Results

Both scripts generate detailed test reports:

- **Passed Tests** ✓ - Security controls working correctly
- **Failed Tests** ✗ - Security controls not working
- **Warnings** ⚠ - Potential issues that need review
- **Critical** 🔴 - Critical vulnerabilities requiring immediate action

Results are logged to:
- Console output (colored)
- Log file: `penetration-test-results-YYYYMMDD-HHMMSS.log`

## 🎯 Using the HackerOne Prompt

The `HACKERONE_PENETRATION_TESTER_PROMPT.md` file contains a complete penetration testing persona and methodology. To use it:

1. **Copy the entire prompt** from the file
2. **Paste it into your AI assistant** (Claude, ChatGPT, etc.)
3. **The AI will act as "ZeroDayHunter"** and conduct the assessment
4. **Review the findings** and implement fixes

The prompt includes:
- Complete testing methodology
- Vulnerability classification system
- Report format
- Testing checklist
- Priority testing order

## 🔍 Manual Testing Guide

For manual testing, follow the checklist in `HACKERONE_PENETRATION_TESTER_PROMPT.md`:

### Critical Areas to Test

1. **Magic Link Authentication**
   ```bash
   # Test code generation security
   curl -X POST https://post.dmrt.ie/api/auth/send-link \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","role":"team_member"}'
   
   # Test rate limiting
   for i in {1..10}; do
     curl -X POST https://post.dmrt.ie/api/auth/send-link \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","role":"team_member"}'
     sleep 0.5
   done
   ```

2. **IDOR Testing**
   ```bash
   # Should return 401 without auth
   curl https://post.dmrt.ie/api/submissions/list
   
   # Should return 401 without auth
   curl https://post.dmrt.ie/api/submissions/12345
   ```

3. **Input Validation**
   ```bash
   # SQL injection test
   curl -X POST https://post.dmrt.ie/api/auth/send-link \
     -H "Content-Type: application/json" \
     -d '{"email":"'\'' OR '\''1'\''='\''1","role":"team_member"}'
   
   # XSS test
   curl -X POST https://post.dmrt.ie/api/auth/send-link \
     -H "Content-Type: application/json" \
     -d '{"email":"<script>alert(1)</script>@example.com","role":"team_member"}'
   ```

## 📝 Interpreting Results

### Critical Vulnerabilities 🔴
- **Immediate action required**
- Examples: Authentication bypass, IDOR, SQL injection
- Fix before deployment

### High Severity 🟠
- **Fix soon**
- Examples: Business logic bypass, stored XSS
- Fix in next release

### Medium Severity 🟡
- **Fix when possible**
- Examples: Reflected XSS, missing headers
- Fix in planned release

### Low Severity 🟢
- **Best practices**
- Examples: Minor information disclosure
- Fix as time permits

## 🔧 Customization

### Modify Test Targets

Edit the scripts to add/remove endpoints:

**Bash Script** (`scripts/penetration-test-production.sh`):
```bash
# Add endpoint to test
test_auth_required "/your/endpoint" "GET" "GET /api/your/endpoint"
```

**Node.js Framework** (`scripts/penetration-test-framework.js`):
```javascript
const authEndpoints = [
    { endpoint: '/your/endpoint', method: 'GET' },
    // ... add more
];
```

### Change Production URL

Edit the `BASE_URL` variable:

**Bash Script**:
```bash
BASE_URL="https://your-production-url.com"
```

**Node.js Framework**:
```javascript
const CONFIG = {
    BASE_URL: 'https://your-production-url.com',
    // ...
};
```

## 🛡️ Security Considerations

⚠️ **Important**: These scripts test the **live production site**. 

- Use responsibly
- Don't run excessive tests that could cause DoS
- Respect rate limits
- Only test endpoints you have permission to test
- Report vulnerabilities responsibly

## 📚 Additional Resources

- **API Endpoints**: See `API_ENDPOINTS_AUDIT.md`
- **Security Status**: See `FINAL_SECURITY_STATUS.md`
- **Security Checklist**: See `SECURITY_CHECKLIST.md`

## 🎓 Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [HackerOne Methodology](https://www.hackerone.com/bug-bounty-program)
- [CWE Top 25](https://cwe.mitre.org/top25/)

## 🤝 Contributing

To add new tests:

1. Add test function to script
2. Add test call to main function
3. Document the test in this README
4. Update the prompt if needed

## 📞 Support

For questions or issues:
1. Review the test output/logs
2. Check the HackerOne prompt for methodology
3. Review security documentation files

---

**Remember**: Security testing is an ongoing process. Run these tests regularly, especially after:
- New feature deployments
- Security updates
- Configuration changes
- Dependency updates

