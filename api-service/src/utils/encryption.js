const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:';

let _key = null;

function getKey() {
  if (_key) return _key;

  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  _key = Buffer.from(hex, 'hex');
  return _key;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a prefixed base64 string: "enc:<base64(iv + authTag + ciphertext)>"
 * Returns null/undefined as-is (safe for nullable DB columns).
 */
function encrypt(plaintext) {
  if (plaintext == null) return plaintext;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + combined.toString('base64');
}

/**
 * Decrypt a value produced by encrypt().
 * If the value doesn't have the "enc:" prefix, returns it as-is
 * (supports graceful transition from plaintext to encrypted data).
 * Returns null/undefined as-is.
 */
function decrypt(ciphertext) {
  if (ciphertext == null) return ciphertext;

  const str = String(ciphertext);
  if (!str.startsWith(PREFIX)) {
    return str;
  }

  const key = getKey();
  const combined = Buffer.from(str.slice(PREFIX.length), 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  return decrypted;
}

/**
 * Check whether a value is already encrypted (has the enc: prefix).
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

module.exports = { encrypt, decrypt, isEncrypted };
