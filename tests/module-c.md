# Module C — Property Registry · Test Reference

> Base URL: `http://localhost:3000`
> Replace `<PROPERTY_ID>` with real IDs from create responses.
> `tenureType`: `statutory_right_of_occupancy` | `customary_right_of_occupancy` | `leasehold` | `freehold` | `government_allocation` | `other`
> `propertyUse`: `residential` | `commercial` | `industrial` | `agricultural` | `mixed_use` | `land`

---

## 1. Create Property (residential)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/properties \
  -H "Content-Type: application/json" \
  -d '{
    "address": "14 Adeola Odeku Street",
    "city": "Lagos",
    "state": "Lagos",
    "localGovernment": "Victoria Island",
    "propertyUse": "residential",
    "tenureType": "leasehold",
    "plotSize": 450,
    "plotSizeUnit": "sqm",
    "latitude": 6.4281,
    "longitude": 3.4219,
    "description": "Corner plot with direct arterial road access."
  }'
```
**Expected:** `201` with property object.

If a likely duplicate exists by address + city + state, the API now returns `409` with duplicate suggestions and the web form requires an explicit "Create Anyway" confirmation.

## 2. Create Property (commercial)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/properties \
  -H "Content-Type: application/json" \
  -d '{
    "address": "22 Broad Street",
    "city": "Lagos",
    "state": "Lagos",
    "propertyUse": "commercial",
    "tenureType": "freehold"
  }'
```
**Expected:** `201` with property object.

---

## 3. List Properties (paginated)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties?page=1&pageSize=10"
```
**Expected:** `200` with `items`, `total`, pagination meta.

## 4. List Properties — search by address

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties?q=adeola"
```
**Expected:** `200` — matching properties by address/city/state/LGA/description.

## 5. List Properties — filter by state

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties?state=Lagos"
```
**Expected:** `200` — all Lagos properties.

## 6. List Properties — filter by propertyUse

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties?propertyUse=commercial"
```
**Expected:** `200` — only commercial properties.

---

## 7. Get Property by ID

```bash
curl -b cookies.txt http://localhost:3000/api/v1/properties/<PROPERTY_ID>
```
**Expected:** `200` with full property + `cases` array + `_count`.

## 8. Get Property — not found

```bash
curl -b cookies.txt http://localhost:3000/api/v1/properties/00000000-0000-0000-0000-000000000000
```
**Expected:** `404 NOT_FOUND`

---

## 9. Update Property

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/properties/<PROPERTY_ID> \
  -H "Content-Type: application/json" \
  -d '{"localGovernment":"Eti-Osa","plotSize":5382,"plotSizeUnit":"sqft"}'
```
**Expected:** `200` with updated property, with size normalized and stored in canonical `sqm`.

---

## 10. Get Property Cases (sub-route)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties/<PROPERTY_ID>/cases"
```
**Expected:** `200` — paginated cases list (empty initially).

## 10b. Get Nearby Comparables

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/properties/<PROPERTY_ID>/comparables"
```
**Expected:** `200` — ranked comparable suggestions based on state, city, property use, and tenure.

The web property detail page now also supports modal edit/archive actions directly from the record itself.

---

## 11. Delete Property (no cases)

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/properties/<PROPERTY_ID>
```
**Expected:** `200` — property archived and removed from active property lists.

## 12. Delete Property with cases (blocked)

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/properties/<PROPERTY_WITH_CASES_ID>
```
**Expected:** `409 CONFLICT — Cannot delete a property with active cases`

---

## 13. Create Comparable

Use the web flow at `/comparables/new` to create a comparable with type, pricing, size, and source details.
Expected:
- comparable list filters/search work from `/comparables`
- non-sqm size units are normalized into canonical `sqm`
- the comparable can be opened from `/comparables/[id]`
