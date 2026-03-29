# Module B — CRM & Contact Management · Test Reference

> Base URL: `http://localhost:3000`
> Save `cookies.txt` from login. Replace `<CLIENT_ID>`, `<CONTACT_ID>` with real IDs.

---

## 1. Create Client (individual)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "<BRANCH_ID>",
    "type": "individual",
    "name": "Emeka Okafor",
    "email": "emeka@example.com",
    "phone": "+2348011111111",
    "city": "Abuja",
    "state": "FCT",
    "notes": "Repeat private client. Prefers WhatsApp updates."
  }'
```
**Expected:** `201` with client object.

If a likely duplicate exists, the API now returns `409` with duplicate suggestions first; the web form requires an explicit "Create Anyway" confirmation before a second submission is allowed.

## 2. Create Client (corporate)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "<BRANCH_ID>",
    "type": "corporate",
    "name": "Zenith Properties Ltd",
    "email": "info@zenith.com",
    "phone": "+2348022222222",
    "city": "Lagos",
    "state": "Lagos",
    "rcNumber": "RC987654",
    "notes": "Panel valuation work. Central billing contact required."
  }'
```
**Expected:** `201` with client object.

---

## 3. List Clients (paginated)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?page=1&pageSize=10"
```
**Expected:** `200` with `items`, `total`, pagination meta.

## 4. List Clients — search

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?q=emeka"
```
**Expected:** `200` — filtered results matching name/email/phone/RC/address/notes/tags.

## 5. List Clients — filter by type

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?type=corporate"
```
**Expected:** `200` — only corporate clients.

## 5b. List Clients — filter by tag

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?tag=priority"
```
**Expected:** `200` — only clients tagged `priority`.

## 5c. List Clients — filter by branch

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?branchId=<BRANCH_ID>"
```
**Expected:** `200` — only clients assigned to the selected branch.

On the web clients page, saved views now provide quick access to common slices like active, corporate, priority, archived, and `Needs Branch` for unassigned legacy clients.
The clients table also surfaces branch ownership, archived status, RC number, and a short relationship-notes preview for faster review.

---

## 6. Get Client by ID

```bash
curl -b cookies.txt http://localhost:3000/api/v1/clients/<CLIENT_ID>
```
**Expected:** `200` with client + `contacts` array + recent `cases` + `_count`.

## 7. Get Client — not found

```bash
curl -b cookies.txt http://localhost:3000/api/v1/clients/00000000-0000-0000-0000-000000000000
```
**Expected:** `404 NOT_FOUND`

---

## 8. Update Client

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/clients/<CLIENT_ID> \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348099999999","city":"Port Harcourt","state":"Rivers","notes":"Priority turnaround for quarterly reviews."}'
```
**Expected:** `200` with updated fields.

---

## 9. Add Contact (primary)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chukwudi Okafor",
    "role": "Director",
    "email": "chukwudi@example.com",
    "phone": "+2348033333333",
    "isPrimary": true
  }'
```
**Expected:** `201` — contact created, previous primary demoted.

## 10. Add Second Contact (non-primary)

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Okafor",
    "role": "Secretary",
    "email": "ada@example.com",
    "isPrimary": false
  }'
```
**Expected:** `201` — second contact added without affecting primary.

You can also perform these add/edit/remove flows directly from the client detail screen in the web app, now through modal dialogs for create, edit, and remove actions.

---

## 11. List Contacts

```bash
curl -b cookies.txt http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts
```
**Expected:** `200` — array ordered primary first.

---

## 12. Update Contact

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts/<CONTACT_ID> \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348044444444","role":"CEO"}'
```
**Expected:** `200` with updated contact.

## 13. Promote contact to primary

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts/<CONTACT_ID> \
  -H "Content-Type: application/json" \
  -d '{"isPrimary":true}'
```
**Expected:** `200` — previous primary demoted, this contact is now primary.

## 14. Update Contact — not found

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{"role":"X"}'
```
**Expected:** `404 NOT_FOUND`

---

## 15. Delete Contact

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/clients/<CLIENT_ID>/contacts/<CONTACT_ID>
```
**Expected:** `200` — contact removed.

---

## 16. Get Client Cases (sub-route)

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients/<CLIENT_ID>/cases?page=1&pageSize=10"
```
**Expected:** `200` — paginated cases for client (empty if no cases yet).

---

## 17. Delete Client (no cases)

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/clients/<CLIENT_ID>
```
**Expected:** `200` — client archived and removed from active client lists.

## 17b. List Archived Clients

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/clients?status=archived"
```
**Expected:** `200` — archived clients only.

## 18. Delete Client with cases (blocked)

```bash
# Create a case for the client first, then try to delete
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/clients/<CLIENT_WITH_CASES_ID>
```
**Expected:** `409 CONFLICT — Cannot delete a client with active cases`

## 19. Restore Archived Client

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/clients/<CLIENT_ID>/restore
```
**Expected:** `200` — archived client becomes active again.
