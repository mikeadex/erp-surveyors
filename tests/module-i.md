# Module I — Review, QA and Compliance

## Manual Verification

1. Open a case report preview and add at least one `blocking` review comment.
2. Try `Approve`.
Expected:
- action fails with validation feedback
- response explains that blocking comments must be resolved
- the review panel shows blocker details instead of only a generic error

3. Resolve the blocking comment as:
- assigned valuer
- managing partner
Expected:
- both can resolve
- a different valuer cannot resolve and receives a permission error

4. Submit a draft report for review.
Expected:
- report status becomes `submitted_for_review`
- case stage becomes `review`
- audit log shows `REPORT_SUBMITTED_FOR_REVIEW`

5. Reject a submitted report.
Expected:
- report status becomes `rejected`
- case stage returns to `draft_report`
- audit log shows `REPORT_REJECTED`

6. Approve a submitted report after resolving blockers.
Expected:
- report status becomes `approved`
- audit log shows `REPORT_APPROVED`

7. Try issuing an approved report while any of these are missing:
- submitted inspection
- attached comparable
- analysis basis of value
- analysis concluded value
Expected:
- issue action fails with structured validation feedback

8. Issue the approved report after all readiness conditions are satisfied.
Expected:
- report status becomes `final`
- case stage becomes `final_issued`
- audit log shows `REPORT_ISSUED`

9. Open `/audit` and filter by:
- `entityType`
- `entityId`
- `userId`
Expected:
- results narrow correctly, including exact record filtering by `entityId`
