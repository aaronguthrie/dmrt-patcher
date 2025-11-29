#!/usr/bin/env node

/**
 * Advanced Penetration Testing Framework
 * HackerOne-style automated security testing for production
 * 
 * Usage: node scripts/penetration-test-framework.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG = {
    BASE_URL: 'https://patcher.dmrt.ie',
    API_BASE: 'https://patcher.dmrt.ie/api',
    TIMEOUT: 10000,
    RATE_LIMIT_TEST_COUNT: 10,
    RATE_LIMIT_DELAY: 500, // ms
};

// Test Results
const results = {
    passed: [],
    failed: [],
    warnings: [],
    critical: [],
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(status, message, details = '') {
    const icon = {
        PASS: '✓',
        FAIL: '✗',
        WARN: '⚠',
        CRITICAL: '🔴',
    }[status] || '•';
    
    const color = {
        PASS: 'green',
        FAIL: 'red',
        WARN: 'yellow',
        CRITICAL: 'red',
    }[status] || 'reset';
    
    log(`${icon} ${message}`, color);
    if (details) {
        log(`  ${details}`, 'cyan');
    }
    
    results[status.toLowerCase()].push({ message, details });
}

function logSection(title) {
    log('\n' + '━'.repeat(60), 'blue');
    log(title, 'blue');
    log('━'.repeat(60) + '\n', 'blue');
}

// HTTP Request Helper
function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const url = new URL(options.url);
        const protocol = url.protocol === 'https:' ? https : http;
        
        const reqOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
                ...options.headers,
            },
            timeout: CONFIG.TIMEOUT,
        };
        
        const req = protocol.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                });
            });
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Test Functions
async function testAuthentication(endpoint, method = 'GET') {
    try {
        const response = await makeRequest({
            url: `${CONFIG.API_BASE}${endpoint}`,
            method,
        });
        
        if (response.status === 401 || response.status === 403) {
            logTest('PASS', `${method} ${endpoint} - Authentication required`);
            return true;
        } else if (response.status === 200) {
            logTest('CRITICAL', `${method} ${endpoint} - NO AUTHENTICATION REQUIRED`, 
                `Status: ${response.status}, Response: ${response.body.substring(0, 200)}`);
            return false;
        } else {
            logTest('WARN', `${method} ${endpoint} - Unexpected status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('WARN', `${method} ${endpoint} - Request failed: ${error.message}`);
        return false;
    }
}

async function testRateLimiting(endpoint, method = 'POST', body = {}) {
    log(`  Testing rate limiting on ${endpoint}...`);
    let rateLimited = false;
    let successCount = 0;
    
    for (let i = 0; i < CONFIG.RATE_LIMIT_TEST_COUNT; i++) {
        try {
            const response = await makeRequest({
                url: `${CONFIG.API_BASE}${endpoint}`,
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            
            if (response.status === 429) {
                rateLimited = true;
                break;
            } else if (response.status < 400) {
                successCount++;
            }
            
            await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY));
        } catch (error) {
            // Ignore errors for rate limit testing
        }
    }
    
    if (rateLimited) {
        logTest('PASS', `${method} ${endpoint} - Rate limiting active`);
        return true;
    } else {
        logTest('WARN', `${method} ${endpoint} - Rate limiting may not be working`, 
            `Made ${successCount} successful requests without rate limit`);
        return false;
    }
}

async function testInformationDisclosure(endpoint, method = 'GET') {
    try {
        const response = await makeRequest({
            url: `${CONFIG.API_BASE}${endpoint}`,
            method,
        });
        
        const sensitivePatterns = [
            /error/i,
            /exception/i,
            /stack trace/i,
            /database/i,
            /sql/i,
            /password/i,
            /secret/i,
            /api[_-]?key/i,
            /token/i,
            /connection string/i,
            /credentials/i,
        ];
        
        const bodyLower = response.body.toLowerCase();
        const foundPatterns = sensitivePatterns.filter(pattern => pattern.test(bodyLower));
        
        if (foundPatterns.length > 0) {
            logTest('WARN', `${method} ${endpoint} - Possible information disclosure`, 
                `Found patterns: ${foundPatterns.map(p => p.source).join(', ')}`);
            return false;
        } else {
            logTest('PASS', `${method} ${endpoint} - No obvious information disclosure`);
            return true;
        }
    } catch (error) {
        logTest('WARN', `${method} ${endpoint} - Could not test: ${error.message}`);
        return false;
    }
}

async function testSecurityHeaders() {
    try {
        const response = await makeRequest({
            url: CONFIG.BASE_URL,
            method: 'GET',
        });
        
        const requiredHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
        ];
        
        const recommendedHeaders = [
            'content-security-policy',
            'strict-transport-security',
            'referrer-policy',
        ];
        
        const missing = [];
        const present = [];
        
        requiredHeaders.forEach(header => {
            if (response.headers[header]) {
                present.push(header);
            } else {
                missing.push(header);
            }
        });
        
        recommendedHeaders.forEach(header => {
            if (!response.headers[header]) {
                missing.push(`${header} (recommended)`);
            }
        });
        
        if (missing.length === 0) {
            logTest('PASS', 'Security headers - All required headers present');
            return true;
        } else {
            logTest('WARN', 'Security headers - Missing headers', 
                `Missing: ${missing.join(', ')}`);
            return false;
        }
    } catch (error) {
        logTest('WARN', 'Security headers - Could not test', error.message);
        return false;
    }
}

async function testInputValidation(endpoint, payloads, method = 'POST') {
    log(`  Testing input validation on ${endpoint}...`);
    let allSafe = true;
    
    for (const [name, payload] of Object.entries(payloads)) {
        try {
            const response = await makeRequest({
                url: `${CONFIG.API_BASE}${endpoint}`,
                method,
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            });
            
            // Should return 400 for invalid input
            if (response.status >= 400 && response.status < 500) {
                logTest('PASS', `Input validation - ${name} rejected`, 
                    `Status: ${response.status}`);
            } else {
                logTest('WARN', `Input validation - ${name} not properly rejected`, 
                    `Status: ${response.status}`);
                allSafe = false;
            }
        } catch (error) {
            logTest('WARN', `Input validation - ${name} test failed`, error.message);
        }
    }
    
    return allSafe;
}

async function testIDOR(endpoint) {
    try {
        const response = await makeRequest({
            url: `${CONFIG.API_BASE}${endpoint}`,
            method: 'GET',
        });
        
        if (response.status === 401 || response.status === 403 || response.status === 404) {
            logTest('PASS', `IDOR protection - ${endpoint}`, 
                `Status: ${response.status} (protected)`);
            return true;
        } else if (response.status === 200) {
            logTest('CRITICAL', `IDOR vulnerability - ${endpoint}`, 
                `Returns 200 without authentication`);
            return false;
        } else {
            logTest('WARN', `IDOR test - ${endpoint}`, 
                `Unexpected status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('WARN', `IDOR test - ${endpoint}`, error.message);
        return false;
    }
}

// Main Testing Function
async function runTests() {
    log('\n' + '═'.repeat(60), 'blue');
    log('  HackerOne-Style Production Penetration Test', 'blue');
    log(`  Target: ${CONFIG.BASE_URL}`, 'blue');
    log(`  Date: ${new Date().toISOString()}`, 'blue');
    log('═'.repeat(60) + '\n', 'blue');
    
    // Phase 1: Authentication Testing
    logSection('Phase 1: Authentication & Authorization Testing');
    
    const authEndpoints = [
        { endpoint: '/submissions/list', method: 'GET' },
        { endpoint: '/submissions/regenerate', method: 'POST' },
        { endpoint: '/submissions/ready', method: 'POST' },
        { endpoint: '/dashboard/submissions', method: 'GET' },
        { endpoint: '/dashboard/export', method: 'GET' },
        { endpoint: '/submissions/12345', method: 'GET' },
        { endpoint: '/submissions/12345/post', method: 'POST' },
        { endpoint: '/submissions/12345/approve', method: 'POST' },
    ];
    
    for (const { endpoint, method } of authEndpoints) {
        await testAuthentication(endpoint, method);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit ourselves
    }
    
    // Phase 2: Rate Limiting Testing
    logSection('Phase 2: Rate Limiting Testing');
    
    await testRateLimiting('/auth/send-link', 'POST', {
        email: 'test@example.com',
        role: 'team_member',
    });
    
    // Phase 3: IDOR Testing
    logSection('Phase 3: IDOR (Insecure Direct Object Reference) Testing');
    
    const idorEndpoints = [
        '/submissions/list',
        '/submissions/12345',
        '/submissions/99999',
        '/submissions/1',
    ];
    
    for (const endpoint of idorEndpoints) {
        await testIDOR(endpoint);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Phase 4: Information Disclosure Testing
    logSection('Phase 4: Information Disclosure Testing');
    
    await testInformationDisclosure('/auth/send-link', 'POST');
    await testInformationDisclosure('/submissions/list', 'GET');
    
    // Phase 5: Security Headers Testing
    logSection('Phase 5: Security Headers Testing');
    
    await testSecurityHeaders();
    
    // Phase 6: Input Validation Testing
    logSection('Phase 6: Input Validation Testing');
    
    const sqlInjectionPayloads = {
        'SQL Injection': { email: "' OR '1'='1", role: 'team_member' },
        'SQL Injection (Union)': { email: "' UNION SELECT * FROM users--", role: 'team_member' },
        'SQL Injection (Comment)': { email: "admin'--", role: 'team_member' },
    };
    
    await testInputValidation('/auth/send-link', sqlInjectionPayloads);
    
    const xssPayloads = {
        'XSS (Script)': { email: '<script>alert(1)</script>@example.com', role: 'team_member' },
        'XSS (Img)': { email: '<img src=x onerror=alert(1)>@example.com', role: 'team_member' },
        'XSS (Event)': { email: 'test@example.com" onmouseover="alert(1)"', role: 'team_member' },
    };
    
    await testInputValidation('/auth/send-link', xssPayloads);
    
    // Summary
    logSection('Test Summary');
    
    const total = results.passed.length + results.failed.length + results.warnings.length + results.critical.length;
    
    log(`Total Tests: ${total}`, 'cyan');
    log(`✓ Passed: ${results.passed.length}`, 'green');
    log(`✗ Failed: ${results.failed.length}`, 'red');
    log(`⚠ Warnings: ${results.warnings.length}`, 'yellow');
    log(`🔴 Critical: ${results.critical.length}`, 'red');
    
    if (results.critical.length > 0) {
        log('\n🔴 CRITICAL VULNERABILITIES FOUND:', 'red');
        results.critical.forEach(({ message, details }) => {
            log(`  - ${message}`, 'red');
            if (details) log(`    ${details}`, 'yellow');
        });
        process.exit(1);
    } else if (results.failed.length > 0) {
        log('\n⚠ Some tests failed. Review the results above.', 'yellow');
        process.exit(1);
    } else {
        log('\n✓ All critical tests passed!', 'green');
        process.exit(0);
    }
}

// Run tests
runTests().catch(error => {
    log(`\nFatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});

