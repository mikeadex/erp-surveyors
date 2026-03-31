# Platform Hardening Checks

## Notifications

- create or reassign a case and confirm the assigned valuer/reviewer receives a notification
- submit a report for review and confirm the assigned reviewer receives `review_requested`
- approve or reject a report and confirm the assigned valuer receives the corresponding notification
- issue an invoice and confirm finance/managing partner receive a finance notification
- mark an invoice as paid and confirm finance/managing partner receive `payment_received`
- on mobile, tap a case-linked notification and confirm it deep-links into the case workspace

## Overdue Sync Job

- set `CRON_SECRET` in [apps/web/.env.local](/Users/michaeladeleye/Documents/product/ERP Surveyors/apps/web/.env.local)
- create a case with a past due date and `isOverdue = false`
- create a sent invoice with a past `dueDate`
- call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/internal/jobs/overdue-notifications
```

- confirm the response includes counts for:
  - `casesMarkedOverdue`
  - `casesCleared`
  - `invoicesMarkedOverdue`
- confirm the case becomes `isOverdue = true`
- confirm the invoice becomes `status = overdue`
- confirm overdue notifications appear for the case and invoice recipients

## Rate Limiting

- trigger repeated bad login attempts and confirm the API eventually returns `RATE_LIMITED`
- hit refresh repeatedly and confirm the same 429 guard appears
- upload-prepare a document repeatedly and confirm the request is capped
- try repeated comparable CSV imports and confirm the request is capped before heavy processing
