# Tests

This project uses [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/react) for testing.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests for CI/CD (with coverage)
npm run test:ci

# Run tests before deployment (tests + build)
npm run predeploy
```

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── auth/              # Authentication endpoints
│   └── submissions/       # Submission endpoints
└── lib/                    # Library function tests
```

## Test Types

### Unit Tests
Test individual functions and utilities in isolation.

**Examples:**
- `__tests__/lib/auth.test.ts` - Email validation
- `__tests__/lib/auth-middleware.test.ts` - Authorization logic
- `__tests__/lib/rate-limit.test.ts` - Rate limiting logic

**Run specific test:**
```bash
npm test -- lib/auth.test.ts
```

### Integration Tests
Test API endpoints with mocked dependencies.

**Examples:**
- `__tests__/api/auth/password-login.test.ts` - Password authentication
- `__tests__/api/submissions/create.test.ts` - Submission creation
- `__tests__/api/submissions/[id]/post.test.ts` - Social media posting

**Run specific test:**
```bash
npm test -- api/submissions/create.test.ts
```

## Test Coverage

Current coverage: **34.43%** statements, **26.97%** branches

**Coverage by component:**
- Authentication: ✅ 86-100%
- Authorization: ✅ 85-100%
- Submission workflow: ✅ 48-100%
- Security features: ✅ Comprehensive

## Running Specific Tests

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="should require authentication"

# Run tests in a specific file
npm test -- __tests__/api/auth/password-login.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode for a specific file
npm run test:watch -- __tests__/api/submissions/create.test.ts
```

## Test Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `npm test` | Run all tests once |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:ci` | `npm run test:ci` | Run tests for CI/CD |
| `predeploy` | `npm run predeploy` | Run tests + build (before deploy) |

## What's Tested

### ✅ Critical Functionality
- Authentication (password + magic link)
- Authorization (roles, IDOR protection)
- Submission workflow (create → ready → approve → post)
- Rate limiting
- Bot detection
- Error handling
- Partial failures (e.g., Facebook succeeds, Instagram fails)

### ⚠️ Areas Needing More Tests
- Photo upload validation
- Dashboard endpoints (non-critical)
- Some utility functions

## Writing New Tests

1. Create test file in appropriate `__tests__` directory
2. Follow existing test patterns
3. Mock external dependencies (databases, APIs)
4. Test both success and error cases
5. Run tests: `npm test`

**Example test structure:**
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should do something', async () => {
    // Arrange
    // Act
    // Assert
  })
})
```

## CI/CD Integration

Tests run automatically before deployment via `predeploy` script:

```bash
npm run predeploy
# Runs: npm run test:ci && npm run build
```

If tests fail, deployment is blocked.

## Troubleshooting

**Tests failing?**
- Check that all dependencies are installed: `npm install`
- Clear Jest cache: `npm test -- --clearCache`
- Check test output for specific errors

**Coverage not updating?**
- Run with coverage flag: `npm test -- --coverage`
- Check that files are being imported correctly

**Watch mode not working?**
- Ensure you're using `npm run test:watch`
- Check file paths are correct

