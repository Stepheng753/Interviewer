# Secrets Management Guide

To protect API credentials and authentication tokens, all configurations must remain isolated within environment files.

---

## 1. Secrets Reference

| Secret Identifier | Location | Purpose | Required For |
| :--- | :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | `/aiu-backend/.env` | Auths the WebSocket proxy with Google's Gemini Live API. | Voice conversation features and audio transcription. |
| **`JWT_SECRET`** | `/aiu-backend/.env` | Cryptographic secret for signing and verifying client JWT tokens. | Backend API auth and socket handshake authentication. |

---

## 2. Rule: `.env` and `.env.template` Consistency

Every environment directory in the repository must maintain a matching pair of environment configuration files:
1. **`.env`**: Contains actual private credentials. **This must never be committed to source control.**
2. **`.env.template`**: Contains structural placeholders (empty values) demonstrating the exact keys needed. **This must be committed to source control.**

### Developer Guidelines:
- If a new environment variable is added to a `.env` file during development, the developer **MUST** immediately append it to the corresponding `.env.template` file with empty or mock values.
- Verify that both `.env` configurations are added to the root/package `.gitignore` files.
- Example structure of `aiu-backend/.env.template`:
  ```env
  PORT=3000
  JWT_SECRET=
  GEMINI_API_KEY=
  ```

---

## 3. Git Security Safeguards

A `.gitignore` file must be active in the root and in directories containing `.env` files to prevent leakages:
```gitignore
# Exclude environment configuration files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```
Never commit real API keys to repository history. If a key is accidentally committed:
1. Revoke the key immediately via the Google AI Studio console.
2. Clean the Git history using `git-filter-repo` or standard Git filters.
3. Update the key in `.env`.

---

## 4. Deep Dive: Why do we need a JWT Secret?

We use JWTs signed with a `JWT_SECRET` instead of passing usernames and passwords on every API request for the following reasons:

### 1. Performance and Hashing Load
- Hashing passwords via bcrypt is intentionally CPU-intensive (~80-100ms per check) to prevent brute-force attacks.
- If the client sent the raw username and password with every request, the server would have to query the database and hash the password on every API call.
- By issuing a signed JWT upon login, the server can verify subsequent requests mathematically using the `JWT_SECRET` in **less than 1ms** without querying the database or performing heavy hashes.

### 2. Client Security
- Storing raw user passwords in the browser's `localStorage` is insecure (exposed to Cross-Site Scripting or XSS attacks).
- The client only needs to transmit credentials once during login, receiving a temporary token in return. The password is never stored on the client.

### 3. Preventing Session Invalidations in Dev
- Having a static `JWT_SECRET` defined in the local `.env` file prevents developer logout loops.
- If the secret key was dynamically generated in-memory on backend startup, saving a file and triggering a hot-reload or server restart would immediately invalidate all issued tokens, forcing the developer to log in again.
- Placing a consistent key in `.env` keeps sessions valid across restarts.

### 4. Production Security & Generation
- In production, you must use a strong, cryptographically secure key.
- Generate one via terminal command:
  ```bash
  openssl rand -base64 32
  ```

