# Module K — Dashboard and Analytics

## Manual Verification

1. Open the dashboard as a `managing_partner`.
Expected:
- hero and summary cards show operational metrics
- open cases, review load, library size, and revenue pipeline are populated
- lower snapshot shows open/review/overdue/avg turnaround

2. Open the dashboard as a `valuer`.
Expected:
- cards switch to personal delivery metrics
- assigned cases, inspections due, draft work, and overdue assigned are shown
- lower snapshot reflects the valuer’s stage mix, not firm-wide totals

3. Open the dashboard as `finance`.
Expected:
- cards switch to finance metrics
- unpaid invoices, paid this month, overdue invoices, and outstanding count are shown
- lower snapshot stays finance-focused

4. Call `GET /api/v1/dashboard/summary` as:
- managing partner
- valuer
- finance
Expected:
- payload shape changes by role
- metrics match the role-specific expectations above

5. Call `GET /api/v1/dashboard/cases-by-stage`.
Expected:
- returned stage counts are role-aware
- valuer sees own case stages only
- managing partner sees firm/branch scope

6. Call `GET /api/v1/dashboard/overdue-cases`.
Expected:
- overdue list is filtered to the current role scope
- branch filter narrows the results when selected

7. Call `GET /api/v1/dashboard/comparables`.
Expected:
- returns total, verified, added-this-month, and recent comparable library items

8. Call `GET /api/v1/dashboard/turnaround` as managing partner.
Expected:
- returns average days, completed count, and recent completed cases
- non-managing-partner roles are denied

9. Use the dashboard branch filter.
Expected:
- visible data changes with the selected branch for roles allowed to switch branches
