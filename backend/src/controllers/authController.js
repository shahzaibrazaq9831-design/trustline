const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { encryptField, maskAccountNumber } = require('../utils/encryption');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL_DAYS = 7;

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).run(userId, hashToken(token), expiresAt);
  return token;
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true, // JavaScript on the page can never read this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production
    sameSite: 'strict', // never sent on cross-site requests, blocks CSRF-style theft
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function generateAccountNumber() {
  // 12-digit demo account number
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

async function register(req, res) {
  const { fullName, email, password } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const insertUser = db.prepare(
    `INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)`
  );
  const userResult = insertUser.run(fullName, email.toLowerCase(), passwordHash);
  const userId = userResult.lastInsertRowid;

  // Every new customer starts with one current account, like opening a real account.
  const accountNumber = generateAccountNumber();
  db.prepare(
    `INSERT INTO accounts (user_id, account_number_encrypted, account_type, balance_cents)
     VALUES (?, ?, 'Current', 0)`
  ).run(userId, encryptField(accountNumber));

  const accessToken = signAccessToken(userId);
  const refreshToken = issueRefreshToken(userId);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({
    accessToken,
    user: { id: userId, fullName, email: email.toLowerCase() },
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  // Same generic error whether the email exists or not — don't leak which one was wrong.
  const genericError = { error: 'Invalid email or password.' };
  if (!user) return res.status(401).json(genericError);

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    const attempts = user.failed_login_attempts + 1;
    const lockUntil = attempts >= 5
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null;
    db.prepare(
      `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`
    ).run(attempts, lockUntil, user.id);
    return res.status(401).json(genericError);
  }

  db.prepare(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`
  ).run(user.id);

  const accessToken = signAccessToken(user.id);
  const refreshToken = issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  return res.json({
    accessToken,
    user: { id: user.id, fullName: user.full_name, email: user.email },
  });
}

function refresh(req, res) {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  const tokenHash = hashToken(token);
  const row = db.prepare(
    `SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0`
  ).get(tokenHash);

  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Rotate: revoke the used refresh token and issue a new one (limits replay if stolen).
  db.prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE id = ?`).run(row.id);
  const newRefreshToken = issueRefreshToken(row.user_id);
  setRefreshCookie(res, newRefreshToken);

  const accessToken = signAccessToken(row.user_id);
  return res.json({ accessToken });
}

function logout(req, res) {
  const token = req.cookies?.refresh_token;
  if (token) {
    db.prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`).run(hashToken(token));
  }
  res.clearCookie('refresh_token', { path: '/api/auth' });
  return res.json({ message: 'Logged out.' });
}

function me(req, res) {
  const user = db.prepare('SELECT id, full_name, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ id: user.id, fullName: user.full_name, email: user.email, createdAt: user.created_at });
}

module.exports = { register, login, refresh, logout, me, maskAccountNumber };
