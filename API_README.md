# User Management Service — API Documentation

Base URL: `http://localhost:3001/api/auth`

## Authentication
- Uses JWT access tokens (15m) and refresh tokens (7d)
- Tokens are set as HttpOnly cookies by default
- Alternatively, you can send the access token via `Authorization: Bearer <token>` header

## Conventions
- All request/response bodies are JSON
- Timestamps are ISO 8601 strings
- Error shape: `{ "error": string }` or `{ "message": string }`

---

## Auth

### 1) Register
- **POST** `/register`
- **Body**:
```json
{
  "email": "jane.doe@example.com",
  "password": "Str0ngP@ssw0rd",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone_number": "+1-555-1234"
}
```
- **Validations**:
  - `email` required and must be valid
  - `password` minimum 8 characters
  - All fields above are required
  - Fails if email already registered
- **Responses**:
  - 201
    ```json
    { "message": "Registration successful, verification email sent." }
    ```
  - 400 `{ "message": "Required fields missing" | "Invalid email format" | "Password must be at least 8 characters long" | "Email already registered" }`
  - 500 `{ "message": "Internal server error" }`

- **Notes**:
  - A verification token is generated and stored temporarily in Redis, and a verification email is published to the message broker.

---

### 2) Verify Email
- **GET** `/verify/:token`
- **Path Params**: `token` — email verification token
- **Responses**:
  - 200 `{ "message": "Email verified successfully." }`
  - 400 `{ "message": "Invalid or expired token" }`

---

### 3) Login
- **POST** `/login`
- **Body**:
```json
{ "email": "jane.doe@example.com", "password": "Str0ngP@ssw0rd" }
```
- **Behavior**:
  - Rate limited: max 5 attempts in 10 minutes per email
  - On success, sets `accessToken` and `refreshToken` cookies
- **Responses**:
  - 200 `{ "message": "Login successful" }` (cookies set)
  - 400 `{ "error": "Email and password are required" }`
  - 401 `{ "error": "Invalid email or password" }`
  - 429 `{ "error": "Too many login attempts. Please try again later." }`
  - 500 `{ "error": "Internal server error" }`

---

### 4) Refresh Access Token
- **POST** `/refresh-token`
- **Body** (optional if cookie present):
```json
{ "refreshToken": "<refresh_jwt>" }
```
- **Behavior**:
  - Verifies provided refresh token (cookie or body)
  - Issues new 15m `accessToken` cookie
- **Responses**:
  - 200 `{ "message": "Access token refreshed" }` (cookie set)
  - 400 `{ "error": "Refresh token required" }`
  - 401 `{ "error": "Invalid or expired refresh token" | "Invalid refresh token" }`

---

### 5) Logout
- **POST** `/logout`
- **Behavior**:
  - Clears `accessToken` and `refreshToken` cookies
  - Removes stored refresh token from Redis (best effort)
- **Responses**:
  - 200 `{ "message": "Logged out successfully" }`
  - 500 `{ "error": "Internal server error" }`

---

## Users (Protected — requires valid access token)

### 6) List Users
- **GET** `/users`
- **Responses**:
  - 200 `Array<User>`

### 7) Get User by ID
- **GET** `/users/:id`
- **Path Params**: `id` — user UUID
- **Responses**:
  - 200 `User`
  - 404 `{ "error": "User not found" }`

### 8) Update User by ID
- **PUT** `/users/:id`
- **Path Params**: `id` — user UUID
- **Body** (allowed fields only):
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone_number": "+1-555-1234"
}
```
- **Notes**:
  - `email` cannot be updated and will return 400 if provided
- **Responses**:
  - 200 `User` (updated)
  - 400 `{ "error": "Email cannot be updated. Please contact administrator for email changes." }`
  - 404 `{ "error": "User not found" }`
  - 500 `{ "error": "Internal server error" }`

### 9) Delete User by ID
- **DELETE** `/users/:id`
- **Responses**:
  - 204 (no body)
  - 404 `{ "error": "User not found" }`
  - 500 `{ "error": "Internal server error" }`

---

## Data Models

### User
```json
{
  "id": "uuid",
  "email": "string",
  "first_name": "string|null",
  "last_name": "string|null",
  "phone_number": "string|null",
  "is_verified": true,
  "is_active": true,
  "last_login_at": "2025-01-01T00:00:00.000Z",
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

---

## Auth Details
- Access token: 15 minutes
- Refresh token: 7 days
- Cookies are `httpOnly` and `sameSite=strict`; `secure` is enabled in production
- Protected routes accept token from:
  - Cookie: `accessToken`
  - Header: `Authorization: Bearer <access_token>`

---

## Example cURL

### Register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.doe@example.com",
    "password": "Str0ngP@ssw0rd",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone_number": "+1-555-1234"
  }'
```

### Login (stores cookies)
```bash
curl -i -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"jane.doe@example.com","password":"Str0ngP@ssw0rd"}'
```

### List Users (with stored cookies)
```bash
curl -X GET http://localhost:3001/api/auth/users \
  -b cookies.txt
```

### Get User by ID (Bearer token)
```bash
curl -X GET http://localhost:3001/api/auth/users/<user_id> \
  -H "Authorization: Bearer <access_token>"
```

### Update User
```bash
curl -X PUT http://localhost:3001/api/auth/users/<user_id> \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"first_name":"Janet"}'
```

### Delete User
```bash
curl -X DELETE http://localhost:3001/api/auth/users/<user_id> \
  -b cookies.txt
```

---

## Environment Requirements
- `JWT_SECRET`, `REFRESH_JWT_SECRET` must be set (see `.env.sample`)
- PostgreSQL configured via Prisma (`DATABASE_URL`, `DIRECT_URL`)
- Redis required for email verification tokens and refresh tokens
- Optional: RabbitMQ (via publisher) for verification email dispatch

---

## Notes
- Rate limiting currently applies to login attempts: 5 attempts per 10 minutes per email.
- Email verification endpoint expects the exact token sent via email.