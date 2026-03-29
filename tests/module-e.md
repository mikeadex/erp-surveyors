# Module E — Inspection Workflow · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<CASE_ID>`, `<INSPECTION_ID>` with real IDs.

---

## 1. Create Inspection (schedule)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/inspections \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionDate": "2026-04-15T09:00:00.000Z"
  }'
```
**Expected:** `201` with inspection object, `status: "pending"`.

---

## 2. Get Inspection (via case sub-route)

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/inspections
```
**Expected:** `200` with inspection + inspector + media.

---

## 3. Get Inspection by ID

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/<INSPECTION_ID>
```
**Expected:** `200` with full inspection detail.

## 4. Get Inspection — not found

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/00000000-0000-0000-0000-000000000000
```
**Expected:** `404 NOT_FOUND`

---

## 5. Update Inspection (fill in field notes)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/<INSPECTION_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "externalCondition": "Good — no visible structural defects",
    "internalCondition": "Well finished, plastered walls",
    "conditionSummary": "Property is in good condition overall",
    "locationDescription": "Situated on a quiet residential street",
    "occupancy": "owner-occupied",
    "notes": "Access granted by owner. Photos taken."
  }'
```
**Expected:** `200` with updated fields.

---

## 6. Submit Inspection

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/<INSPECTION_ID>/submit
```
**Expected:** `200` — `status: "submitted"`, `submittedAt` populated. Case stage advances to `inspection_completed` if it was `inspection_scheduled`.

---

## 7. Edit submitted inspection (blocked)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/<INSPECTION_ID> \
  -H "Content-Type: application/json" \
  -d '{"notes":"Trying to edit after submit"}'
```
**Expected:** `409 CONFLICT — Submitted inspections cannot be edited`

---

## 8. Submit already-submitted inspection (blocked)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/inspections/<INSPECTION_ID>/submit
```
**Expected:** `409 CONFLICT — Inspection already submitted`
