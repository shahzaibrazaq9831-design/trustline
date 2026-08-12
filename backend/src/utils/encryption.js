/**
 * Field-level encryption for sensitive columns (account numbers, CNIC/national ID,
 * card numbers, etc). Even if the database file itself leaked, these columns are
 * unreadable without FIELD_ENCRYPTION_KEY, which only lives in the server's .env
 * — it is never sent to the client and never appears in any API response.
 *
 * Algorithm: AES-256-GCM (authenticated encryption — tampering is detected, not
 * just hidden). Each value gets its own random IV, so identical plaintexts never
 * produce identical ciphertexts (prevents pattern leakage).
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function getKey() {
  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be set in .env as a 64-character hex string (32 bytes).'
    );
  }
  return Buffer.from(keyHex, 'hex');
}

function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store iv + authTag + ciphertext together, base64-encoded, in one column.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptField(payload) {
  if (payload === null || payload === undefined) return null;
  const key = getKey();
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Masks an account number for API responses: keep only the last 4 digits visible. */
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const str = String(accountNumber);
  return str.length <= 4 ? str : `${'*'.repeat(str.length - 4)}${str.slice(-4)}`;
}

module.exports = { encryptField, decryptField, maskAccountNumber };
