# Module F — Comparable Evidence Engine · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<COMP_ID>`, `<CASE_ID>`, `<CASE_COMP_ID>` with real IDs.
> `comparableType`: `sales` | `rental` | `land`

---

## 1. Create Comparable (sales)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/comparables \
  -H "Content-Type: application/json" \
  -d '{
    "comparableType": "sales",
    "address": "5 Kofo Abayomi Street",
    "city": "Lagos",
    "state": "Lagos",
    "propertyUse": "residential",
    "tenureType": "leasehold",
    "transactionDate": "2025-11-01T00:00:00.000Z",
    "salePrice": 85000000,
    "plotSize": 400,
    "plotSizeUnit": "sqm",
    "buildingSize": 250,
    "buildingSizeUnit": "sqm",
    "source": "Field survey",
    "notes": "Verified by firm agent"
  }'
```
**Expected:** `201` with comparable object.

## 2. Create Comparable (rental)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/comparables \
  -H "Content-Type: application/json" \
  -d '{
    "comparableType": "rental",
    "address": "12 Ozumba Mbadiwe Avenue",
    "city": "Lagos",
    "state": "Lagos",
    "propertyUse": "commercial",
    "rentalValue": 4500000,
    "source": "Agent referral"
  }'
```
**Expected:** `201` with comparable object.

---

## 3. List Comparables (paginated)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/comparables?page=1&pageSize=10"
```
**Expected:** `200` with items + pagination meta.

## 4. List Comparables — filter by type

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/comparables?comparableType=sales"
```
**Expected:** `200` — only sales comparables.

## 5. List Comparables — search by address

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/comparables?q=kofo"
```
**Expected:** `200` — 1 result.

---

## 6. Attach Comparable to Case

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/comparables \
  -H "Content-Type: application/json" \
  -d '{"comparableId":"<COMP_ID>","weight":80}'
```
**Expected:** `201` with `caseComparable` + embedded `comparable`.

## 7. Attach same comparable again (blocked)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/cases/<CASE_ID>/comparables \
  -H "Content-Type: application/json" \
  -d '{"comparableId":"<COMP_ID>"}'
```
**Expected:** `409 CONFLICT — Comparable already attached to this case`

## 8. List Case Comparables

```bash
curl -b cookies.txt http://localhost:3000/api/v1/cases/<CASE_ID>/comparables
```
**Expected:** `200` — list with embedded comparable data.

## 9. Update Case Comparable weight

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/cases/<CASE_ID>/comparables/<CASE_COMP_ID> \
  -H "Content-Type: application/json" \
  -d '{"weight":90}'
```
**Expected:** `200` with updated weight.

## 10. Detach Comparable from Case

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/cases/<CASE_ID>/comparables/<CASE_COMP_ID>
```
**Expected:** `200` — comparable detached.

---

## 11. Import Comparables CSV

Create a file named `comparables-import.csv`:

```csv
comparableType,address,city,state,propertyUse,tenureType,transactionDate,salePrice,rentalValue,plotSize,plotSizeUnit,buildingSize,buildingSizeUnit,source,sourceContact,notes,isVerified
sales,"5 Kofo Abayomi Street",Lagos,Lagos,residential,leasehold,2025-11-01,85000000,,400,sqm,250,sqm,Field survey,Agent A,"Verified by firm agent",true
rental,"12 Ozumba Mbadiwe Avenue",Lagos,Lagos,commercial,,2025-10-14,,4500000,,,180,sqm,Agent referral,Source desk,"Annual rental evidence",false
```

Then import it:

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/comparables/import \
  -F "file=@comparables-import.csv"
```

**Expected:** `201` with a `job` payload including `status`, `importedCount`, `failedCount`, and row errors if any rows failed.

## 12. Fetch Import Job Status

```bash
curl -b cookies.txt http://localhost:3000/api/v1/comparables/import/<JOB_ID>
```

**Expected:** `200` with the saved import job result for that firm.
