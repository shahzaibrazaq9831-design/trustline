# Trustline Bank — full-stack demo banking app

A working React + Node/Express + SQLite (MySQL-ready) banking app: login/register,
account dashboard, fund transfers, transaction history — built with real security
practices (encryption at rest, hashed passwords, short-lived rotating sessions,
ownership checks on every endpoint).

**This is a learning/demo-grade app, not a production bank.** A real bank also
needs PCI-DSS compliance, HSM-backed key management, regulatory audits, fraud
monitoring, and a lot more. Treat this as a strong, honest foundation to build
on and learn from.

## Project structure

```
trustline-bank/
  backend/    Express REST API, SQLite by default, MySQL schema included
  frontend/   React (Vite) app
```

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and replace the three secret placeholders with real random values:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"   # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"   # JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # FIELD_ENCRYPTION_KEY
```

Then start the API:

```bash
npm start          # http://localhost:4000
```

The SQLite database file (`trustline.db`) and schema are created automatically
on first run — nothing else to set up. Optionally seed a demo balance to try
transfers immediately:

```bash
npm run seed
```

### Switching to MySQL for production
Run `backend/mysql-schema.sql` against your MySQL instance, then replace
`backend/src/config/db.js` with a `mysql2` connection pool using the same
query shapes — the controllers don't need to change, since `better-sqlite3`
and `mysql2` both accept parameterized SQL. Store the MySQL credentials in
`.env`, never in code.

## 2. Run the frontend

```bash
cd frontend
npm install
cp .env.example .env      # points VITE_API_URL at the backend
npm run dev                # http://localhost:5173
```

Open http://localhost:5173, register an account, and log in.

## Security features included

- **Passwords**: hashed with bcrypt (12 rounds), never stored or logged in plaintext.
- **Sessions**: short-lived JWT access tokens (15 min, kept only in memory on the
  frontend — never localStorage) + rotating httpOnly refresh tokens (7 days, can't
  be read by JavaScript, so a page-level XSS bug can't steal them).
- **Data at rest**: account numbers and national ID fields are encrypted with
  AES-256-GCM before being written to the database. The encryption key lives only
  in the server's `.env` file — it's never sent to the client and never appears
  in any API response. Even a full copy of the database file is unreadable
  without that key.
- **Data in responses**: account numbers are always masked (`********2442`)
  in every API response; the full number is never returned to the client.
- **Ownership checks**: every account/transaction endpoint filters by the
  authenticated user's id — one user's token can never read or move another
  user's money via crafted requests (tested — see below).
- **Money math**: balances are stored as integer cents, never floating point,
  to avoid rounding bugs.
- **Atomicity**: transfers run inside a single DB transaction — a debit and its
  matching credit either both succeed or neither does, even on a crash.
- **Rate limiting**: login/register are capped per IP; accounts lock for 15
  minutes after 5 failed login attempts.
- **Input validation**: every request body is validated server-side
  (express-validator) — the frontend validation is a convenience, not the
  real security boundary.
- **Headers/CORS**: `helmet` sets standard hardening headers; CORS only allows
  the configured frontend origin, with credentials.
- **Generic errors**: login never reveals whether the email or the password was
  wrong; server errors never leak stack traces to the client.

## What was actually tested

While building this, the backend was run and exercised directly:
registered two users, transferred money between them, confirmed balances
updated correctly and atomically, and confirmed that a second user's valid
token gets a 404 when requesting the first user's account — plus 401s for
missing and tampered tokens. See the conversation for the full transcript.

## Honest limits (read this)

No system can make data "impossible" to access — what this app does is raise
the cost of unauthorized access at every layer (transport, storage, session,
authorization) using standard, well-vetted techniques. A stolen *valid*
session token can still be used until it naturally expires — that's true of
any bearer-token system, including real banks; the mitigation here is a short
15-minute expiry plus refresh-token rotation. For real deployment, add HTTPS
everywhere (this demo runs on plain HTTP for localhost), a managed database
with encryption-at-rest at the infra level as a second layer, monitoring/
alerting, and a security review — this project gives you the application-level
foundation, not a compliance-ready product.
