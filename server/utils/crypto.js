/**
 * @fileoverview Cryptographic utilities for encrypting and decrypting sensitive data.
 * Uses AES-256-GCM encryption with authentication tags for secure data storage.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Retrieves and processes the encryption key from environment variables.
 * @returns {Buffer} SHA-256 hash of the encryption key (32 bytes for AES-256)
 * @throws {Error} If ENCRYPTION_KEY environment variable is not set
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM encryption.
 * @param {string} text - The plaintext to encrypt
 * @returns {string} Encrypted text in format: iv:authTag:encryptedData (hex-encoded)
 * @returns {string} Returns input unchanged if text is falsy
 */
function encrypt(text) {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text that was encrypted using the encrypt function.
 * @param {string} encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @returns {string} Decrypted plaintext
 * @returns {string} Returns input unchanged if text is falsy or not in expected format
 * @note Provides backward compatibility by returning unencrypted text as-is if decryption fails
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  // If the text doesn't look encrypted (no colons), return as-is for backward compatibility
  if (!encryptedText.includes(':')) return encryptedText;

  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) return encryptedText;

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, the data may be unencrypted (migration scenario)
    return encryptedText;
  }
}

module.exports = { encrypt, decrypt };
