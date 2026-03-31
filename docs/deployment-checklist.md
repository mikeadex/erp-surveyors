# ValuCore Africa — Deployment Checklist

This runbook is the final pre-launch and launch checklist for deploying ValuCore Africa.

Use it together with:

- [README.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/README.md)
- [docs/current-functionality-bible.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/docs/current-functionality-bible.md)
- [tests/platform-hardening.md](/Users/michaeladeleye/Documents/product/ERP Surveyors/tests/platform-hardening.md)

The goal is simple:

- set the right production configuration
- prove the highest-risk workflows before launch
- deploy safely
- verify the live environment immediately after deployment

## 1. Launch Owner Checklist

Before deployment day, confirm:

- one person owns the deploy window
- one person owns production environment variables
- one person owns smoke testing
- one person owns mobile real-device verification
- one person owns rollback decision-making

For a small team, one person may hold multiple roles, but each responsibility should still be named explicitly.

## 2. Production Infrastructure Checklist

Confirm these are ready:

- production PostgreSQL database
- production S3 or Cloudflare R2 bucket
- Vercel project linked to this repository
- Redis or Upstash Redis for distributed rate limiting
- Expo project credentials if mobile push delivery is required
- monitoring target for the health endpoint

## 3. Required Production Environment Variables

Set these in the deployment platform before release:

- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_REGION`
- `S3_ENDPOINT` when using R2 or another S3-compatible provider
- `S3_PUBLIC_URL` if using public asset reads
- `CLOUDFLARE_R2_PUBLIC_URL` if using R2 public asset reads
- `EXPO_ACCESS_TOKEN` if push delivery should work from the backend
- `EXPO_PUBLIC_EAS_PROJECT_ID` for device build and push-token alignment

Use [/.env.example](/Users/michaeladeleye/Documents/product/ERP Surveyors/.env.example) as the source of truth for naming.

## 4. Pre-Deploy Commands

Run these from the repo root:

```bash
pnpm install
pnpm typecheck
pnpm -C apps/web test
```

If Prisma or schema changes happened since the last verified state, also run:

```bash
pnpm db:generate
pnpm db:push
```

## 5. Local Smoke Test Before Deploy

Run the highest-value workflow chain locally:

1. Login as a seeded or real admin user.
2. Create or edit a client.
3. Create or edit a property linked to that client.
4. Create a case and confirm property options narrow correctly after client selection.
5. Draft and submit an inspection with at least one photo.
6. Attach comparables and save analysis.
7. Generate a report, submit for review, approve, and issue it.
8. Download both HTML and PDF report outputs.
9. Create an invoice, issue it, and mark it paid.
10. Upload and open a document on web.
11. Verify dashboard metrics and notifications update.

## 6. Mobile Smoke Test Before Deploy

Test on a real iPhone if possible:

1. Login.
2. Open a case.
3. Open an inspection.
4. Save a draft.
5. Upload a photo.
6. Turn connectivity off and confirm queued sync behavior is visible.
7. Restore connectivity and confirm draft, photo, and submit retries work.
8. Open case-linked documents.
9. Verify notifications open the right destination.

## 7. Vercel Deployment Checklist

Confirm these platform items:

- the project root is configured correctly for the web app
- [vercel.json](/Users/michaeladeleye/Documents/product/ERP Surveyors/vercel.json) is present in the repo root
- the overdue cron path is live:
  - `/api/v1/internal/jobs/overdue-notifications`
- the production environment has all required variables
- the latest branch and commit are the intended release candidate

## 8. Deploy Sequence

Use this order:

1. Confirm `main` or the release branch contains the intended final commit.
2. Confirm production env vars are present in Vercel.
3. Trigger the deployment.
4. Wait for deployment completion.
5. Open the live app and verify login.
6. Check the health endpoint immediately.

## 9. Immediate Post-Deploy Verification

Run these checks in production as soon as the deploy is live:

- open `/api/health`
- open the Settings page and inspect the readiness panel
- verify database connectivity is healthy
- verify storage readiness shows correctly
- run the manual overdue sync once from the admin readiness panel
- create one low-risk document upload and confirm download/open works
- generate one report and confirm PDF export works
- confirm at least one notification is created and visible

## 10. Highest-Risk Production Paths

Give extra attention to these:

- inspection photo upload
- document upload and signed download
- report PDF generation
- report review transitions
- invoice issue and mark-paid transitions
- overdue notification sync
- mobile deep links from notifications

## 11. Rollback Rules

Rollback or pause launch if any of these happen:

- login is broken
- database reads or writes fail
- uploads fail across the board
- report generation or PDF export is broken
- invoice lifecycle actions fail
- the app boots but core pages return authorization or tenant-scope errors unexpectedly

If rollback is needed:

1. stop additional smoke testing that mutates production data
2. capture the failing route and user role involved
3. roll back to the previous healthy deployment
4. confirm `/api/health` and login recover
5. document the failure before retrying release

## 12. Launch Signoff

Only mark the deployment complete when all are true:

- health endpoint is healthy
- login works
- one full web workflow has passed
- one mobile workflow has passed
- uploads work
- PDF export works
- notifications are visible
- overdue sync can be triggered safely
- the team knows who owns first-day monitoring

## 13. First-Day Monitoring

During the first 24 hours after launch, monitor:

- health endpoint availability
- upload failures
- report generation failures
- invoice action failures
- notification delivery quality
- user login problems
- mobile sync complaints from field users

If any of those spike, pause rollout expansion until the issue is understood.
