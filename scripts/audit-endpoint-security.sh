#!/bin/bash
# Security audit script for API endpoints
# Checks each endpoint for common security issues

echo "🔒 API Endpoint Security Audit"
echo "================================"
echo ""

BASE_DIR="app/api"
ISSUES_FOUND=0

find "$BASE_DIR" -name "route.ts" -type f | sort | while read -r file; do
    endpoint=$(echo "$file" | sed "s|$BASE_DIR/||" | sed "s|/route\.ts$||")
    
    if [ "$endpoint" = "route.ts" ]; then
        endpoint="/"
    else
        endpoint="/api/$endpoint"
    fi
    
    echo "📋 Checking: $endpoint"
    echo "   File: $file"
    
    # Check for authentication
    if grep -q "requireAuth\|requireRole\|checkSubmissionAccess" "$file"; then
        echo "   ✅ Authentication check found"
    else
        echo "   ⚠️  WARNING: No authentication check found!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    # Check for rate limiting
    if grep -q "rateLimit" "$file"; then
        echo "   ✅ Rate limiting found"
    else
        echo "   ⚠️  INFO: No rate limiting (may be intentional)"
    fi
    
    # Check for input validation
    if grep -q "validate\|sanitize" "$file"; then
        echo "   ✅ Input validation found"
    else
        # Check if endpoint accepts input
        if grep -q "request\.json\|request\.formData\|request\.body" "$file"; then
            echo "   ⚠️  WARNING: Accepts input but no validation found!"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
    
    # Check for bot protection
    if grep -q "isBot" "$file"; then
        echo "   ✅ Bot protection found"
    else
        echo "   ⚠️  INFO: No bot protection"
    fi
    
    # Check for error handling
    if grep -q "try\|catch" "$file"; then
        echo "   ✅ Error handling found"
    else
        echo "   ⚠️  WARNING: No error handling!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    echo ""
done

echo "================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No critical issues found!"
else
    echo "⚠️  Found $ISSUES_FOUND potential security issues"
fi
echo ""



