// Set encryption key before requiring the module
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';

const { encrypt, decrypt } = require('../utils/crypto');

describe('Crypto Utility', () => {
  describe('encrypt and decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt a short string', () => {
      const original = 'a';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt a medium-length string', () => {
      const original = 'This is a medium-length string used for testing the AES-256-GCM encryption.';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt a long string', () => {
      const original = 'A'.repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt strings with special characters', () => {
      const original = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt unicode strings', () => {
      const original = 'Hello \u4e16\u754c \ud83c\udf0d \u00e9\u00e0\u00fc';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should encrypt and decrypt JSON strings', () => {
      const original = JSON.stringify({ key: 'value', number: 42, nested: { a: true } });
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe('encrypt output format', () => {
    it('should produce output in iv:authTag:encryptedData format', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // IV should be 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Auth tag should be 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Encrypted data should be non-empty hex
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext each time due to random IV', () => {
      const original = 'same input text';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });
  });

  describe('decrypt edge cases', () => {
    it('should return null as-is', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('should return undefined as-is', () => {
      expect(decrypt(undefined)).toBeUndefined();
    });

    it('should return empty string as-is', () => {
      expect(decrypt('')).toBe('');
    });

    it('should return non-encrypted text (no colons) as-is for backward compatibility', () => {
      const plainText = 'just-a-plain-api-key';
      expect(decrypt(plainText)).toBe(plainText);
    });

    it('should return text with wrong number of colon-separated parts as-is', () => {
      const malformed = 'part1:part2';
      expect(decrypt(malformed)).toBe(malformed);
    });

    it('should return text with four colon-separated parts as-is', () => {
      const malformed = 'part1:part2:part3:part4';
      expect(decrypt(malformed)).toBe(malformed);
    });

    it('should return text with invalid hex as-is (decryption fails gracefully)', () => {
      const invalidEncrypted = 'notvalidhex1234567890abcdef1234:notvalidhex1234567890abcdef1234:notvalidhex';
      // Should not throw, returns as-is on decryption failure
      const result = decrypt(invalidEncrypted);
      expect(result).toBe(invalidEncrypted);
    });
  });

  describe('encrypt edge cases', () => {
    it('should return null as-is', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('should return undefined as-is', () => {
      expect(encrypt(undefined)).toBeUndefined();
    });

    it('should return empty string as-is', () => {
      expect(encrypt('')).toBe('');
    });
  });

  describe('ENCRYPTION_KEY requirement', () => {
    it('should throw if ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is required');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw on decrypt if ENCRYPTION_KEY is not set and text looks encrypted', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      // First encrypt with the key
      const encrypted = encrypt('test');

      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY environment variable is required');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
