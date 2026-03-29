# Module H — Report Generator · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<CASE_ID>`, `<REPORT_ID>`, `<COMMENT_ID>` with real IDs.
> Report workflow: `draft` → `submitted_for_review` → `approved` → `final`

---

## 1. Create Report (missing prerequisites — blocked)

Run this BEFORE analysis is complete or comparables attached:
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports
```
**Expected:** `400 VALIDATION_ERROR` — missing comparables / analysis not complete.

---

## 2. Attach Comparable (prerequisite)

Re-attach a comparable before creating the report:
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/comparables \
  -H "Content-Type: application/json" \
  -d '{"comparableId":"<COMP_ID>"}'
```

## 3. Create Report (all prerequisites met)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports
```
**Expected:** `201` with report object, `status: "draft"`, `version: 1`.

---

## 4. List Reports

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/reports
```
**Expected:** `200` — list with template + comments count.

## 5. Get Report by ID

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>
```
**Expected:** `200` with template + comments included.

---

## 6. Add Blocking Comment

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/comments \
  -H "Content-Type: application/json" \
  -d '{"type":"blocking","body":"Section 3 requires the full legal description of the property."}'
```
**Expected:** `201` — comment with `isResolved: false`.

## 7. Add Suggestion Comment

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/comments \
  -H "Content-Type: application/json" \
  -d '{"type":"suggestion","body":"Consider adding a neighbourhood description paragraph."}'
```
**Expected:** `201`.

## 8. List Comments

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/comments
```
**Expected:** `200` — 2 comments, newest first.

## 9. Resolve Blocking Comment

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/comments/<COMMENT_ID>
```
**Expected:** `200` — `isResolved: true`, `resolvedAt` set.

## 10. Resolve already-resolved comment (blocked)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/comments/<COMMENT_ID>
```
**Expected:** `409 CONFLICT — Comment already resolved`

---

## 11. Approve (wrong status — blocked)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/approve
```
**Expected:** `409 CONFLICT — Report must be in submitted_for_review status to approve`

## 12. Approve (after advancing to submitted_for_review)

Advance status via DB first, then approve.
**Expected:** `200` — `status: "approved"`, `approvedAt` set.

## 13. Reject (requires submitted_for_review — blocked from approved)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/reject
```
**Expected:** `409 CONFLICT`

## 14. Issue Final Report

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/reports/<REPORT_ID>/issue
```
**Expected:** `200` — `status: "final"`, case stage → `final_issued`.
