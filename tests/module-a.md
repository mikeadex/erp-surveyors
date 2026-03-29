# Module A — Authentication · Test Reference

> Base URL: `http://localhost:3000`  
> Replace `<ACCESS_TOKEN>` with the `access_token` cookie value from login/signup.  
> Replace `<ID>` placeholders with real UUIDs returned from previous calls.

---

## 1. Request Signup Verification Code

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"chidi@adeyemi.com"}'
```

**Expected:** `200` with generic success message and `debugToken` in development.

---

## 2. Firm Registration (Signup)

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firm": {
      "name": "Adeyemi Partners",
      "slug": "adeyemi-partners",
      "city": "Lagos",
      "state": "Lagos",
      "phone": "+2348012345678",
      "email": "info@adeyemi.com"
    },
    "user": {
      "firstName": "Chidi",
      "lastName": "Adeyemi",
      "email": "chidi@adeyemi.com",
      "password": "MySecurePass1!",
      "confirmPassword": "MySecurePass1!",
      "phone": "+2348012345678",
      "verificationCode": "<DEBUG_TOKEN_FROM_SEND_CODE>"
    }
  }'
```

**Expected:** `200` with `accessToken`, `firm`, `user`; sets `access_token` + `refresh_token` cookies.

**Conflict test (duplicate slug):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firm":{"name":"Rival Firm","slug":"adeyemi-partners"},"user":{"firstName":"A","lastName":"B","email":"other@x.com","password":"12345678910","confirmPassword":"12345678910"}}'
```
**Expected:** `409 CONFLICT`

---

## 3. Login

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chidi@adeyemi.com","password":"MySecurePass1!"}'
```

**Expected:** `200` with `accessToken` + user object; sets httpOnly cookies.

**Wrong password:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chidi@adeyemi.com","password":"wrongpassword"}'
```
**Expected:** `401 UNAUTHORIZED`

---

## 4. Get Current User (`/me`)

```bash
curl -b cookies.txt http://localhost:3000/api/v1/auth/me
```

**Expected:** `200` with full user + firm object.

**Without token:**
```bash
curl http://localhost:3000/api/v1/auth/me
```
**Expected:** `401 UNAUTHORIZED`

---

## 5. Refresh Token

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/refresh
```

**Expected:** `200` with new `accessToken`; rotates both cookies.

---

## 6. Invite User

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/users/invite \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ola",
    "lastName": "Bello",
    "email": "ola@adeyemi.com",
    "role": "valuer"
  }'
```

**Expected:** `201` with `user` and `invitationToken` (store this for accept-invite test).

**Non-admin attempt:**
```bash
curl -b valuer_cookies.txt -X POST http://localhost:3000/api/v1/users/invite \
  -H "Content-Type: application/json" \
  -d '{"firstName":"X","lastName":"Y","email":"x@x.com","role":"valuer"}'
```
**Expected:** `403 FORBIDDEN`

---

## 7. Accept Invitation

```bash
curl -c ola_cookies.txt -X POST http://localhost:3000/api/v1/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<INVITATION_TOKEN>",
    "password": "OlaSecure1234!",
    "confirmPassword": "OlaSecure1234!",
    "firstName": "Ola",
    "lastName": "Bello",
    "phone": "+2348098765432"
  }'
```

**Expected:** `200` — activates account, sets session cookies, redirects to dashboard.

**Expired/invalid token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token","password":"12345678910","confirmPassword":"12345678910"}'
```
**Expected:** `400 VALIDATION` — token error message.

---

## 8. Password Reset Request

```bash
curl -X POST http://localhost:3000/api/v1/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"chidi@adeyemi.com"}'
```

**Expected:** `200` with generic message (+ `debugToken` in dev mode — use this for confirm).

**Unknown email (no leak):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@nowhere.com"}'
```
**Expected:** `200` with same generic message (no information leak).

---

## 9. Password Reset Confirm

```bash
curl -X POST http://localhost:3000/api/v1/auth/password/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "email":"chidi@adeyemi.com",
    "token": "<DEBUG_TOKEN_FROM_RESET>",
    "newPassword": "NewSecurePass99!"
  }'
```

**Expected:** `200` — password updated, refresh tokens invalidated.

**Reuse same token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/password/confirm \
  -H "Content-Type: application/json" \
  -d '{"email":"chidi@adeyemi.com","token":"<SAME_TOKEN>","newPassword":"AnotherPass99!"}'
```
**Expected:** `400 VALIDATION` — token already consumed.

---

## 10. List Users

```bash
curl -b cookies.txt "http://localhost:3000/api/v1/users?page=1&pageSize=10"
```

**Expected:** `200` with paginated `items`, `total`, `page`, `pageSize`, `totalPages`.

**With search:**
```bash
curl -b cookies.txt "http://localhost:3000/api/v1/users?q=ola"
```

---

## 11. Get / Update User

```bash
# Get
curl -b cookies.txt http://localhost:3000/api/v1/users/<USER_ID>

# Update details
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/users/<USER_ID> \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348011111111"}'
```

---

## 12. Change User Role

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/users/<USER_ID>/role \
  -H "Content-Type: application/json" \
  -d '{"role":"reviewer"}'
```

**Expected:** `200` with updated user.

**Same role conflict:**
```bash
# (if user is already reviewer)
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/users/<USER_ID>/role \
  -H "Content-Type: application/json" \
  -d '{"role":"reviewer"}'
```
**Expected:** `409 CONFLICT`

---

## 13. Deactivate User

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/users/<USER_ID>
```

**Expected:** `200` — user deactivated, sessions invalidated.

**Self-deactivate:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/v1/users/<OWN_USER_ID>
```
**Expected:** `409 CONFLICT`

**Admin attempt:**
```bash
curl -b admin_cookies.txt -X DELETE http://localhost:3000/api/v1/users/<USER_ID>
```
**Expected:** `403 FORBIDDEN`

---

## 14. Reactivate User

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/users/<USER_ID>/reactivate
```

**Expected:** `200` — user reactivated.

**Already active:**
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/v1/users/<ACTIVE_USER_ID>/reactivate
```
**Expected:** `409 CONFLICT`

---

## 14. Firm Profile

```bash
# Get firm
curl -b cookies.txt http://localhost:3000/api/v1/firms/current

# Update firm
curl -b cookies.txt -X PATCH http://localhost:3000/api/v1/firms/current \
  -H "Content-Type: application/json" \
  -d '{"rcNumber":"RC123456","esvarNumber":"ESVAR001","address":"14 Ahmadu Bello Way"}'
```

**Expected (GET):** `200` with firm + branches + user/client/case counts.

---

## 15. Logout

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/v1/auth/logout
```

**Expected:** `200` — cookies cleared, refresh token nulled in DB.

**After logout, /me should fail:**
```bash
curl -b cookies.txt http://localhost:3000/api/v1/auth/me
```
**Expected:** `401 UNAUTHORIZED`
