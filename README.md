# DMRT Postal Service App

A Next.js application for Donegal Mountain Rescue Team (DMRT) that transforms raw team member notes into formatted social media posts for Facebook and Instagram.

## Features

- **Magic Link Authentication**: Passwordless authentication via email for team members, PRO, and team leaders
- **AI-Powered Post Generation**: Uses Google Gemini 2.0 Flash to transform notes into professional social media posts
- **Iterative Feedback Loop**: Team members can provide feedback and regenerate posts until satisfied
- **PRO Review & Editing**: PRO can review, edit, and either post directly or send for team leader approval
- **Team Leader Approval**: Optional approval workflow for sensitive posts
- **Social Media Integration**: Direct posting to Facebook and Instagram via Meta Graph API
- **Transparency Dashboard**: Password-protected dashboard for viewing all submissions and their status

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Vercel Postgres (Neon) with Prisma ORM
- **Photo Storage**: Vercel Blob
- **AI**: Google Gemini 2.0 Flash
- **Email**: Resend API
- **Social Media**: Meta Graph API
- **Hosting**: Vercel

## Workflow

### Team Member Submission

1. Team member visits `post.dmrt.ie`
2. Enters email (must be in `APPROVED_TEAM_EMAILS`)
3. Receives magic link via email
4. Clicks link to authenticate
5. Submits notes and photos
6. Reviews AI-generated post
7. Provides feedback and regenerates if needed
8. Clicks "Post is Ready" when satisfied

### PRO Review

1. PRO visits `/pro`
2. Authenticates via:
   - **Password login** (recommended for frequent access)
   - **Magic link** (sent via email)
3. Reviews submissions with status `awaiting_pro` or `awaiting_pro_to_post`
4. Can edit post text
5. Either:
   - Posts directly to Facebook/Instagram
   - Sends to team leader for approval

### Team Leader Approval

1. Team leader receives email with approval link
2. Clicks link (auto-authenticated)
3. Reviews PRO's edited post
4. Approves or rejects with comment
5. PRO receives notification

### Dashboard

1. Visit `/dashboard`
2. Enter password (`DASHBOARD_PASSWORD`)
3. View all submissions with search and filter
4. Export as CSV

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   ├── submissions/        # Submission CRUD endpoints
│   │   └── dashboard/         # Dashboard endpoints
│   ├── pro/                    # PRO dashboard page
│   ├── approve/[id]/          # Team leader approval page
│   ├── dashboard/             # Transparency dashboard
│   ├── layout.tsx
│   ├── page.tsx               # Team member submission page
│   └── globals.css
├── lib/
│   ├── auth.ts                # Authentication utilities
│   ├── blob.ts                # Vercel Blob integration
│   ├── db.ts                  # Prisma client
│   ├── gemini.ts              # Gemini API integration
│   ├── meta.ts                # Meta Graph API integration
│   └── resend.ts              # Resend email integration
├── prisma/
│   └── schema.prisma          # Database schema
└── types/
    └── index.ts               # TypeScript types
```

## Database Schema

- **auth_codes**: One-time authentication codes
- **submissions**: Post submissions with status tracking
- **feedback**: Feedback history for regenerations
- **leader_approvals**: Team leader approval records

## Environment Variables

### Required
- `PRO_EMAIL` - PRO email address
- `PRO_PASSWORD_HASH` - Bcrypt hash of PRO password (generate with `node scripts/generate-password-hash.js`)
- `TEAM_LEADER_EMAIL` - Team leader email(s), comma-separated
- `APPROVED_TEAM_EMAILS` - Approved team member emails, comma-separated
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - Email address for sending emails
- `POSTGRES_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for JWT session signing
- `GEMINI_API_KEY` - Google Gemini API key
- `META_ACCESS_TOKEN` - Meta Graph API access token
- `FACEBOOK_PAGE_ID` - Facebook page ID
- `INSTAGRAM_BUSINESS_ACCOUNT_ID` - Instagram business account ID
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `DASHBOARD_PASSWORD` - Password for transparency dashboard

### Generating PRO Password Hash

To set up password login for PRO:

```bash
node scripts/generate-password-hash.js "your-secure-password"
```

This will generate a bcrypt hash. Add it to your `.env` file and Vercel environment variables as `PRO_PASSWORD_HASH`.

## Security Notes

- All authentication codes expire after 4 hours
- Codes are single-use only
- Email whitelist validation for each role
- Password login uses bcrypt hashing (10 rounds)
- Rate limiting on password login attempts (5 attempts per 15 minutes)
- Dashboard password protection
- Environment variables for sensitive data

## Support

For issues or questions, contact the development team.

