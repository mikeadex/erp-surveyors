# Module G — Valuation Workbench · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<CASE_ID>` with real case ID.
> `method`: `sales_comparison` | `income_capitalisation` | `discounted_cash_flow` | `cost` | `profits` | `residual`
> `basisOfValue`: `market_value` | `fair_value` | `investment_value` | `liquidation_value`

---

## 1. Get Analysis (none yet)

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/analysis
```
**Expected:** `200` — `data: null`

---

## 2. Create Analysis

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "method": "sales_comparison",
    "basisOfValue": "market_value",
    "assumptions": [
      {"id": "a1", "text": "Property is free from encumbrances"},
      {"id": "a2", "text": "Title is good and marketable"}
    ],
    "valuationDate": "2026-04-20T00:00:00.000Z"
  }'
```
**Expected:** `201` with analysis object, `status: "draft"`.

---

## 3. Create Analysis again (blocked)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/analysis \
  -H "Content-Type: application/json" \
  -d '{"method":"cost","basisOfValue":"fair_value"}'
```
**Expected:** `409 CONFLICT — Analysis already exists for this case`

---

## 4. Get Analysis

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/analysis
```
**Expected:** `200` with full analysis, method and assumptions populated.

---

## 5. Update Analysis (add concluded value + comparable grid)

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "concludedValue": 95000000,
    "comparableGrid": {
      "comp1": {"address":"5 Kofo Abayomi","salePrice":85000000,"adjusted":90000000},
      "comp2": {"address":"12 Ozumba Mbadiwe","rentalValue":4500000,"adjusted":4200000}
    }
  }'
```
**Expected:** `200` with updated `concludedValue` and `comparableGrid`.

---

## 6. Complete Analysis (missing concludedValue — blocked)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/analysis/complete
```
_Run this BEFORE setting concludedValue to test validation._
**Expected:** `400 VALIDATION_ERROR` listing missing fields.

---

## 7. Complete Analysis (all fields set — success)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/analysis/complete
```
**Expected:** `200` — `status: "complete"`.
