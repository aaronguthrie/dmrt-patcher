# Security Analysis: CVE-2025-64756 (glob Command Injection)

**Date:** 2025-11-30  
**CVE:** CVE-2025-64756  
**Severity:** High (CVSS 8.1)  
**Status:** ✅ **LOW RISK** (but should be fixed)

---

## Executive Summary

The project has a **transitive dependency** on `glob@10.3.10` which contains a command injection vulnerability. However, the **actual risk to this project is LOW** because:

1. ✅ The vulnerability only affects the **CLI tool** (`glob -c` / `glob --cmd`), not the library API
2. ✅ The project **does not use glob CLI directly** - no scripts or code call `glob -c`
3. ✅ The library functions (`glob()`, `globSync()`, etc.) are **NOT affected**
4. ⚠️ The vulnerable package is still present in the dependency tree and should be updated

---

## Vulnerability Details

### What is Affected?

- **Package:** `glob` (npm)
- **Affected Versions:** `>= 10.2.0, < 10.5.0` and `>= 11.0.0, < 11.1.0`
- **Current Version in Project:** `glob@10.3.10` (vulnerable)
- **Patched Versions:** `glob@10.5.0` or `glob@11.1.0+`

### How It Works

The vulnerability exists in the **command-line interface only**:
- When running `glob -c <command> <patterns>`, matched filenames are passed to a shell
- Malicious filenames containing shell metacharacters (`$()`, backticks, `;`, `&`, `|`, etc.) can execute arbitrary commands
- **The library API is completely safe** - only the CLI is affected

### Attack Vector

**For this vulnerability to be exploited:**
1. An attacker would need to create files with malicious names in the repository
2. Someone would need to run `glob -c <command>` on those files
3. The command would execute with the privileges of the user running glob

**In this project:**
- ❌ No scripts use `glob -c` or `glob --cmd`
- ❌ No direct glob CLI usage found
- ✅ Only library functions are used (which are safe)

---

## Dependency Tree Analysis

The vulnerable `glob@10.3.10` is pulled in by:

1. **eslint-config-next@14.2.33**
   - Via `@next/eslint-plugin-next@14.2.33`
   - Uses glob for file pattern matching

2. **jest@30.2.0**
   - Via multiple jest packages (`@jest/core`, `jest-config`, etc.)
   - Uses glob for test file discovery

### Current Dependency Paths:

```
dmrt-patcher
├── eslint-config-next@14.2.33
│   └── @next/eslint-plugin-next@14.2.33
│       └── glob@10.3.10 ⚠️ VULNERABLE
└── jest@30.2.0
    ├── @jest/core@30.2.0
    │   └── glob@10.3.10 ⚠️ VULNERABLE
    └── jest-config@30.2.0
        └── glob@10.3.10 ⚠️ VULNERABLE
```

---

## Risk Assessment

### Risk Level: **LOW** ⚠️

**Why Low Risk:**
- ✅ Project doesn't use glob CLI directly
- ✅ Only library API is used (which is safe)
- ✅ No user-controlled file processing via glob CLI
- ✅ No CI/CD scripts using `glob -c`

**Why Still Fix:**
- ⚠️ Best practice to keep dependencies patched
- ⚠️ Future code changes might use glob CLI
- ⚠️ Dependabot alerts create noise
- ⚠️ Supply chain security best practice

---

## Remediation Options

### Option 1: Use npm overrides (Recommended - Immediate Fix)

Force all glob dependencies to use the patched version:

```json
{
  "overrides": {
    "glob": "^10.5.0"
  }
}
```

**Pros:**
- ✅ Immediate fix
- ✅ Works regardless of dependency updates
- ✅ No breaking changes expected

**Cons:**
- ⚠️ May cause issues if dependencies require specific glob versions (unlikely)

### Option 2: Update Dependencies (Long-term Fix)

Update packages that depend on glob:
- Update `eslint-config-next` to latest (currently 14.2.33, latest is 16.0.5)
- Update `jest` to latest (currently 30.2.0)

**Pros:**
- ✅ Gets latest features and fixes
- ✅ More comprehensive update

**Cons:**
- ⚠️ May require code changes
- ⚠️ May introduce breaking changes
- ⚠️ Next.js 16 is a major version upgrade

### Option 3: Wait for Dependency Updates

Wait for `eslint-config-next` and `jest` to update their glob dependencies.

**Pros:**
- ✅ No action required

**Cons:**
- ❌ Leaves vulnerability in dependency tree
- ❌ Unknown timeline for updates

---

## Recommended Action

**Use Option 1 (npm overrides)** for immediate security fix, then plan Option 2 for long-term maintenance.

---

## Verification

After applying the fix, verify:

```bash
npm list glob
```

Should show `glob@10.5.0` or higher for all instances.

---

## References

- **CVE:** CVE-2025-64756
- **GHSA:** GHSA-5j98-mcp5-4vw2
- **Advisory:** https://github.com/advisories/GHSA-5j98-mcp5-4vw2
- **npm glob:** https://www.npmjs.com/package/glob

---

*Analysis performed on 2025-11-30*

