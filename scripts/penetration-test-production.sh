#!/bin/bash

# HackerOne-Style Production Penetration Testing Script
# Tests the live production application at https://post.dmrt.ie
# Run with: bash scripts/penetration-test-production.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production URL
BASE_URL="https://post.dmrt.ie"
API_BASE="${BASE_URL}/api"

# Test results
PASSED=0
FAILED=0
WARNINGS=0
CRITICAL=0

# Log file
LOG_FILE="penetration-test-results-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

log_test() {
    local status=$1
    local message=$2
    if [ "$status" = "PASS" ]; then
        log "${GREEN}✓${NC} ${message}"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        log "${RED}✗${NC} ${message}"
        ((FAILED++))
    elif [ "$status" = "WARN" ]; then
        log "${YELLOW}⚠${NC} ${message}"
        ((WARNINGS++))
    elif [ "$status" = "CRITICAL" ]; then
        log "${RED}🔴 CRITICAL${NC} ${message}"
        ((CRITICAL++))
        ((FAILED++))
    fi
}

log_section() {
    log "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "${BLUE}${1}${NC}"
    log "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Test HTTP response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local headers="${5:-}"
    local data="${6:-}"
    
    local url="${API_BASE}${endpoint}"
    local cmd="curl -s -o /dev/null -w '%{http_code}'"
    
    if [ -n "$headers" ]; then
        cmd="${cmd} -H '${headers}'"
    fi
    
    if [ "$method" = "POST" ] || [ "$method" = "PATCH" ] || [ "$method" = "PUT" ]; then
        if [ -n "$data" ]; then
            cmd="${cmd} -X ${method} -d '${data}' -H 'Content-Type: application/json'"
        else
            cmd="${cmd} -X ${method}"
        fi
    else
        cmd="${cmd} -X ${method}"
    fi
    
    cmd="${cmd} '${url}'"
    
    local status_code=$(eval "$cmd")
    
    if [ "$status_code" = "$expected_status" ]; then
        log_test "PASS" "${description} (Expected ${expected_status}, Got ${status_code})"
        return 0
    else
        log_test "FAIL" "${description} (Expected ${expected_status}, Got ${status_code})"
        log "  URL: ${url}"
        return 1
    fi
}

# Test for information disclosure
test_info_disclosure() {
    local endpoint=$1
    local description=$2
    
    local response=$(curl -s "${API_BASE}${endpoint}")
    
    # Check for common information disclosure patterns
    if echo "$response" | grep -qiE "(error|exception|stack trace|database|sql|password|secret|key|token)" 2>/dev/null; then
        log_test "WARN" "${description} - Possible information disclosure"
        log "  Response snippet: $(echo "$response" | head -c 200)"
        return 1
    else
        log_test "PASS" "${description} - No obvious information disclosure"
        return 0
    fi
}

# Test rate limiting
test_rate_limit() {
    local endpoint=$1
    local description=$2
    
    log "  Testing rate limiting on ${endpoint}..."
    local rate_limited=0
    
    for i in {1..10}; do
        local status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${API_BASE}${endpoint}" \
            -H 'Content-Type: application/json' \
            -d '{"email":"test@example.com"}' 2>/dev/null)
        
        if [ "$status" = "429" ]; then
            rate_limited=1
            break
        fi
        
        sleep 0.5
    done
    
    if [ $rate_limited -eq 1 ]; then
        log_test "PASS" "${description} - Rate limiting active"
        return 0
    else
        log_test "WARN" "${description} - Rate limiting may not be working"
        return 1
    fi
}

# Test security headers
test_security_headers() {
    local endpoint=$1
    
    local headers=$(curl -s -I "${BASE_URL}${endpoint}" | grep -iE "(x-content-type-options|x-frame-options|x-xss-protection|content-security-policy|strict-transport-security)" || true)
    
    if [ -z "$headers" ]; then
        log_test "WARN" "Security headers missing on ${endpoint}"
        return 1
    else
        log_test "PASS" "Security headers present on ${endpoint}"
        return 0
    fi
}

# Test authentication requirement
test_auth_required() {
    local endpoint=$1
    local method=${2:-GET}
    local description=$3
    
    local status=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "${API_BASE}${endpoint}")
    
    if [ "$status" = "401" ]; then
        log_test "PASS" "${description} - Authentication required"
        return 0
    elif [ "$status" = "403" ]; then
        log_test "PASS" "${description} - Access denied (auth check working)"
        return 0
    elif [ "$status" = "200" ]; then
        log_test "CRITICAL" "${description} - NO AUTHENTICATION REQUIRED (CRITICAL VULNERABILITY)"
        return 1
    else
        log_test "WARN" "${description} - Unexpected status: ${status}"
        return 1
    fi
}

# Test IDOR (Insecure Direct Object Reference)
test_idor() {
    local endpoint=$1
    local description=$2
    
    # Try to access with invalid/missing ID
    local status=$(curl -s -o /dev/null -w '%{http_code}' "${API_BASE}${endpoint}")
    
    if [ "$status" = "401" ] || [ "$status" = "403" ] || [ "$status" = "404" ]; then
        log_test "PASS" "${description} - IDOR protection appears active"
        return 0
    elif [ "$status" = "200" ]; then
        log_test "CRITICAL" "${description} - Possible IDOR vulnerability (returns 200 without auth)"
        return 1
    else
        log_test "WARN" "${description} - Status ${status}, needs manual verification"
        return 1
    fi
}

# Main testing function
main() {
    log "${BLUE}"
    log "╔══════════════════════════════════════════════════════════╗"
    log "║  HackerOne-Style Production Penetration Test           ║"
    log "║  Target: ${BASE_URL}"
    log "║  Date: $(date)"
    log "╚══════════════════════════════════════════════════════════╝"
    log "${NC}\n"
    
    log "Results will be saved to: ${LOG_FILE}\n"
    
    # Phase 1: Authentication Testing
    log_section "Phase 1: Authentication & Authorization Testing"
    
    log_test "INFO" "Testing authentication requirements..."
    
    # Test endpoints that should require authentication
    test_auth_required "/submissions/list" "GET" "GET /api/submissions/list"
    test_auth_required "/submissions/create" "POST" "POST /api/submissions/create (should validate email)"
    test_auth_required "/submissions/regenerate" "POST" "POST /api/submissions/regenerate"
    test_auth_required "/submissions/ready" "POST" "POST /api/submissions/ready"
    test_auth_required "/dashboard/submissions" "GET" "GET /api/dashboard/submissions"
    test_auth_required "/dashboard/export" "GET" "GET /api/dashboard/export"
    
    # Test public endpoints (should not require auth but should have rate limiting)
    log "\nTesting public endpoints..."
    test_endpoint "POST" "/auth/send-link" "200\|400\|429" "POST /api/auth/send-link (public endpoint)"
    test_endpoint "POST" "/auth/validate" "200\|400\|401\|429" "POST /api/auth/validate (public endpoint)"
    
    # Phase 2: Rate Limiting Testing
    log_section "Phase 2: Rate Limiting Testing"
    
    log_test "INFO" "Testing rate limiting on sensitive endpoints..."
    test_rate_limit "/auth/send-link" "POST /api/auth/send-link"
    
    # Phase 3: IDOR Testing
    log_section "Phase 3: IDOR (Insecure Direct Object Reference) Testing"
    
    log_test "INFO" "Testing IDOR protection..."
    test_idor "/submissions/list" "GET /api/submissions/list"
    test_idor "/submissions/12345" "GET /api/submissions/[id]"
    test_idor "/submissions/12345/post" "POST /api/submissions/[id]/post"
    test_idor "/submissions/12345/approve" "POST /api/submissions/[id]/approve"
    
    # Phase 4: Information Disclosure Testing
    log_section "Phase 4: Information Disclosure Testing"
    
    log_test "INFO" "Testing for information disclosure..."
    test_info_disclosure "/submissions/list" "GET /api/submissions/list"
    test_info_disclosure "/auth/send-link" "POST /api/auth/send-link"
    
    # Phase 5: Security Headers Testing
    log_section "Phase 5: Security Headers Testing"
    
    log_test "INFO" "Testing security headers..."
    test_security_headers ""
    test_security_headers "/api/auth/send-link"
    
    # Phase 6: Input Validation Testing
    log_section "Phase 6: Input Validation Testing"
    
    log_test "INFO" "Testing SQL injection protection..."
    test_endpoint "POST" "/auth/send-link" "400\|429" "SQL injection test (email: ' OR '1'='1)" \
        "" "{\"email\":\"' OR '1'='1\",\"role\":\"team_member\"}"
    
    log_test "INFO" "Testing XSS protection..."
    test_endpoint "POST" "/auth/send-link" "400\|429" "XSS test (email: <script>alert(1)</script>)" \
        "" "{\"email\":\"<script>alert(1)</script>@example.com\",\"role\":\"team_member\"}"
    
    # Phase 7: Error Handling Testing
    log_section "Phase 7: Error Handling Testing"
    
    log_test "INFO" "Testing error handling..."
    test_endpoint "GET" "/nonexistent-endpoint" "404" "Non-existent endpoint"
    test_endpoint "POST" "/auth/send-link" "400\|429" "Invalid request (missing email)" "" "{}"
    
    # Summary
    log_section "Test Summary"
    
    log "Total Tests: $((PASSED + FAILED + WARNINGS))"
    log "${GREEN}Passed: ${PASSED}${NC}"
    log "${RED}Failed: ${FAILED}${NC}"
    log "${YELLOW}Warnings: ${WARNINGS}${NC}"
    
    if [ $CRITICAL -gt 0 ]; then
        log "\n${RED}🔴 CRITICAL VULNERABILITIES FOUND: ${CRITICAL}${NC}"
        log "${RED}Immediate action required!${NC}\n"
        exit 1
    elif [ $FAILED -gt 0 ]; then
        log "\n${YELLOW}⚠ Some tests failed. Review the results above.${NC}\n"
        exit 1
    else
        log "\n${GREEN}✓ All critical tests passed!${NC}\n"
        exit 0
    fi
}

# Run main function
main

