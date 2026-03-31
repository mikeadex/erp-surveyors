# Module J — Billing and Finance

## Manual Verification

1. Create an invoice for a case that does not already have one.
Expected:
- invoice is created successfully
- total amount equals `amount + taxAmount`
- audit log records `INVOICE_CREATED`

2. Try creating a second invoice for the same case.
Expected:
- action fails with a conflict message
- only one invoice exists for that case

3. Try creating an invoice where the selected client does not match the case client.
Expected:
- action fails with validation feedback on `clientId`

4. Open a draft invoice and edit:
- amount
- tax rate
- due date
- notes
Expected:
- draft invoice updates successfully
- totals are recalculated
- audit log records `INVOICE_UPDATED`

5. Issue a draft invoice.
Expected:
- invoice status becomes `sent`
- if the case stage was `final_issued`, it becomes `invoice_sent`
- audit log records `INVOICE_ISSUED`

6. Mark a sent invoice as paid.
Expected:
- invoice status becomes `paid`
- `paidAt` is recorded
- if the case stage was `invoice_sent`, it becomes `payment_received`
- audit log records `INVOICE_MARKED_PAID`

7. Void a draft invoice and a sent invoice.
Expected:
- only `draft` and `sent` can be voided
- if a sent invoice is voided while the case is `invoice_sent`, case returns to `final_issued`
- audit log records `INVOICE_VOIDED`

8. Visit the invoices list and detail pages with:
- `managing_partner`
- `finance`
- `admin`
Expected:
- managing partner and finance can access
- admin is redirected away from list/detail views

9. Visit the revenue endpoint or dashboard finance cards with branch filtering.
Expected:
- only finance or managing partner can access
- results narrow correctly by branch when selected
