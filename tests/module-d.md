# Module D — Cases & Instructions · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<CASE_ID>`, `<ITEM_ID>` with real IDs.
> `stage`: `enquiry_received` | `quote_issued` | `instruction_accepted` | `case_opened` | `inspection_scheduled` | `inspection_completed` | `comparable_analysis` | `draft_report` | `review` | `final_issued` | `invoice_sent` | `payment_received` | `archived`
> `valuationType`: `market` | `rental` | `mortgage` | `insurance` | `probate` | `commercial` | `land`

---

## 1. Create Case

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<CLIENT_ID>",
    "propertyId": "<PROPERTY_ID>",
    "valuationType": "market",
    "stage": "enquiry_received",
    "dueDate": "2026-06-30T00:00:00.000Z",
    "assignedValuerId": "<VALUER_USER_ID>"
  }'
```
**Expected:** `201` with `reference`, `stage`, `client`.

---

## 2. List Cases (paginated)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases?page=1&pageSize=10"
```
**Expected:** `200` with items ordered overdue-first, then newest.

## 3. List Cases — filter by stage

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases?stage=enquiry_received"
```

## 4. List Cases — search by reference/client name

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases?q=okafor"
```

## 5. List Cases — assigned to me

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases?assignedToMe=true"
```

---

## 6. Get Case by ID

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>
```
**Expected:** `200` with client, property, inspection, invoice, documents.

## 7. Get Case — not found

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/00000000-0000-0000-0000-000000000000
```
**Expected:** `404 NOT_FOUND`

---

## 8. Update Case (assign reviewer, advance stage)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID> \
  -H "Content-Type: application/json" \
  -d '{"stage":"instruction_accepted","assignedReviewerId":"<REVIEWER_USER_ID>"}'
```
**Expected:** `200` with updated stage.

---

## 9. Add Note

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/notes \
  -H "Content-Type: application/json" \
  -d '{"note":"Client confirmed property access for next week."}'
```
**Expected:** `200` — note appended to `internalNotes` with timestamp.

## 10. Add Second Note (appends)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/notes \
  -H "Content-Type: application/json" \
  -d '{"note":"Inspection booked for Monday."}'
```
**Expected:** `200` — both notes visible, separated by newline.

---

## 11. Get Checklist (empty)

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/checklist
```
**Expected:** `200` — empty array initially.

## 12. Add Checklist Items

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/checklist \
  -H "Content-Type: application/json" \
  -d '{"label":"Obtain title document"}'

curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/checklist \
  -H "Content-Type: application/json" \
  -d '{"label":"Confirm plot size from survey plan"}'
```
**Expected:** `201` for each item.

## 13. Toggle Checklist Item (check)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/checklist/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -d '{"isChecked":true}'
```
**Expected:** `200` — `isChecked:true`, `checkedAt` and `checkedById` populated.

## 14. Toggle Checklist Item (uncheck)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/checklist/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -d '{"isChecked":false}'
```
**Expected:** `200` — `isChecked:false`, `checkedAt` and `checkedById` null.

## 15. Delete Checklist Item

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/cases/<CASE_ID>/checklist/<ITEM_ID>
```
**Expected:** `200` — item removed.

## 16. Get Case Activity

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases/<CASE_ID>/activity?page=1&pageSize=20"
```
**Expected:** `200` — recent case activity including stage changes, notes, and checklist actions.

## 17. Overdue Cases

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/cases/overdue?page=1&pageSize=20"
```
**Expected:** `200` for `managing_partner` / `admin` — only overdue cases returned.

## 18. Dashboard Cases By Stage

```bash
curl -b cookies.txt http://localhost:3000/api/v1/dashboard/cases-by-stage
```
**Expected:** `200` — array of `{ stage, count }`.

---

## 19. Delete Client with Cases (blocked — deferred from Module B)

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/clients/<CLIENT_ID>
```
**Expected:** `409 CONFLICT — Cannot delete a client with active cases`

## 20. Delete Property with Cases (blocked — deferred from Module C)

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/properties/<PROPERTY_ID>
```
**Expected:** `409 CONFLICT — Cannot delete a property with active cases`
