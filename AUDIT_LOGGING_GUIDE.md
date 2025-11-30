# Audit Logging Guide

## Overview

Comprehensive audit trail logging has been implemented across all key functions of the application. All user actions, errors, and important operations are logged to Better Stack for security monitoring and compliance.

## What Gets Logged

### Authentication Events

1. **Magic Link Sent**
   - When: User requests authentication link
   - Logs: Email (masked), role, IP (masked), success status
   - Component: `authentication`

2. **Magic Link Authentication**
   - When: User validates authentication code
   - Logs: Email (masked), role, IP (masked), success/failure
   - Component: `authentication`

3. **Password Login**
   - When: PRO user logs in with password
   - Logs: Email, IP (masked), success/failure, reason if failed
   - Component: `authentication`

4. **Failed Authentication Attempts**
   - When: Invalid code, wrong password, unauthorized email
   - Logs: IP (masked), reason, role attempted
   - Component: `authentication`
   - Severity: `warning` (for security monitoring)

### Submission Events

5. **Submission Created**
   - When: User creates new submission
   - Logs: User email (masked), role, submission ID, photo count, notes length
   - Component: `submission`
   - Action Type: `create`

6. **Post Regenerated**
   - When: User regenerates AI post with/without feedback
   - Logs: User email (masked), role, submission ID, has feedback, feedback version
   - Component: `submission`
   - Action Type: `update`

7. **Submission Marked Ready**
   - When: Team member marks submission ready for PRO review
   - Logs: User email (masked), submission ID
   - Component: `submission`
   - Action Type: `update`

### Approval Events

8. **Submission Sent for Approval**
   - When: PRO sends submission to leader for approval
   - Logs: User email (masked), role, submission ID, has edits
   - Component: `approval`
   - Action Type: `update`

9. **Submission Approved**
   - When: Leader approves submission
   - Logs: User email (masked), role, submission ID, comment
   - Component: `approval`
   - Action Type: `approve`

10. **Submission Rejected**
    - When: Leader rejects submission
    - Logs: User email (masked), role, submission ID, comment
    - Component: `approval`
    - Action Type: `reject`

### Social Media Events

11. **Post Published**
    - When: PRO posts to Facebook/Instagram
    - Logs: User email (masked), role, submission ID, platforms posted to, post IDs, errors if any
    - Component: `social-media`
    - Action Type: `post`

### Dashboard Events

12. **Data Exported**
    - When: User exports submissions to CSV
    - Logs: User email (masked), role, submission count
    - Component: `dashboard`
    - Action Type: `export`

### Error Events

All errors are logged with:
- Error message and stack trace
- Component where error occurred
- Context (user, resource ID, etc.)
- Severity level

## Privacy & Security

### Data Masking (Configurable)

**Default Behavior (Masked):**
- **Email Addresses**: Masked as `ab***@example.com` (first 2 chars visible)
- **IP Addresses**: Masked as `192.168.1***` (first 8 chars visible)
- **Identifiers**: Masked as `ab***cd` (first 2 and last 2 chars visible)

**To Disable Masking:**
Set environment variable: `MASK_AUDIT_DATA=false`

This will log:
- ✅ Full email addresses (e.g., `john.doe@example.com`)
- ✅ Full IP addresses (e.g., `192.168.1.100`)

**Why Mask?**
- Privacy/GDPR compliance if logs shared externally
- Security if logs compromised
- Data minimization best practice

**Why NOT Mask? (For Internal Tools)**
- ✅ Better audit trail - see exactly who did what
- ✅ Easier to investigate issues ("Who approved this submission?")
- ✅ More useful for internal accountability
- ✅ You control access to logs anyway

**Recommendation:** For internal tools like DMRT Patcher, set `MASK_AUDIT_DATA=false` for better audit trail visibility.

### What's NOT Logged (Always)

- ❌ Passwords or password hashes
- ❌ Sensitive submission content (notes, post text)
- ❌ API keys or tokens
- ❌ Session tokens

## Viewing Audit Logs in Better Stack

### Filter by Component

```
component:authentication
component:submission
component:approval
component:social-media
component:dashboard
```

### Filter by Action Type

```
actionType:create
actionType:update
actionType:approve
actionType:reject
actionType:post
actionType:export
actionType:authenticate
```

### Filter by Audit Events

```
audit:true
```

### Filter by Success/Failure

```
success:true
success:false
```

### Filter by User Role

```
userRole:team_member
userRole:pro
userRole:leader
```

## Alert Configuration

### Critical Alerts

**Failed Authentication Attempts (Brute Force)**
```
level = "info" AND component = "authentication" AND success = false AND actionType = "authenticate"
Threshold: More than 10 in 5 minutes
Action: Email + Slack notification
```

**Rate Limiting Backend Failures**
```
level = "error" AND component = "rate-limiting" AND severity = "critical"
Action: Immediate email + Slack notification
```

**Social Media Posting Failures**
```
level = "error" AND component = "social-media"
Action: Email notification
```

### Warning Alerts

**High Rate Limit Violations**
```
level = "warning" AND component = "rate-limiting"
Threshold: More than 50 in 5 minutes
Action: Email notification
```

**Multiple Failed Logins**
```
level = "info" AND component = "authentication" AND success = false
Threshold: More than 5 in 15 minutes from same IP
Action: Email notification
```

## Audit Trail Queries

### Who approved/rejected submissions?

```
audit:true AND component:approval AND (actionType:approve OR actionType:reject)
```

### What did a specific user do?

```
audit:true AND userEmail:*@example.com
```

### When was a submission posted?

```
audit:true AND component:social-media AND resourceId:submission-id
```

### All errors in the last 24 hours

```
level:error AND timestamp:[now-24h TO now]
```

## Compliance

This audit trail supports:
- ✅ Security incident investigation
- ✅ Compliance requirements (GDPR audit logs)
- ✅ User activity tracking
- ✅ Error monitoring and debugging
- ✅ Security threat detection

## Retention

Better Stack Free Tier:
- 3 days log retention
- 1 million logs per month

For longer retention, consider upgrading or exporting logs periodically.

## Next Steps

1. ✅ Set up `LOGTAIL_SOURCE_TOKEN` environment variable
2. ✅ Configure alerts in Better Stack dashboard
3. ✅ Test by performing actions and checking logs
4. ✅ Set up dashboards for common queries
5. ✅ Review logs regularly for security issues

