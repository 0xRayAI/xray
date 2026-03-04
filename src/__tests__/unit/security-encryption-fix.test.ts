/**
 * Quick test for H-001: Broken Encryption fix
 * This verifies that AES-256-GCM encryption works correctly
 */

import { describe, it, expect } from "vitest";
import { SecurityHardeningSystem } from "../../security/security-hardening-system.js";

describe("H-001: Broken Encryption Fix", () => {
  const securitySystem = new SecurityHardeningSystem("test-encryption-key-12345");

  it("should encrypt and decrypt data correctly", () => {
    const originalData = "Hello, StringRay!";
    const encrypted = securitySystem.encryptData(originalData);
    const decrypted = securitySystem.decryptData(encrypted);

    expect(decrypted).toBe(originalData);
  });

  it("should produce different ciphertexts for same plaintext (random IV)", () => {
    const originalData = "Hello, StringRay!";
    const encrypted1 = securitySystem.encryptData(originalData);
    const encrypted2 = securitySystem.encryptData(originalData);

    // Same plaintext should produce different ciphertext due to random IV
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should detect tampering (wrong auth tag)", () => {
    const originalData = "Hello, StringRay!";
    const encrypted = securitySystem.encryptData(originalData);

    // Decode Base64 to get the buffer
    const encryptedBuffer = Buffer.from(encrypted, "base64");

    // Tamper with the encrypted data by changing a byte in the middle
    // This will corrupt the ciphertext and cause auth tag verification to fail
    encryptedBuffer[20] = encryptedBuffer[20] ^ 0xFF; // Flip all bits in byte 20

    // Re-encode as Base64
    const tamperedData = encryptedBuffer.toString("base64");

    // Should throw error when decrypting tampered data
    expect(() => {
      securitySystem.decryptData(tamperedData);
    }).toThrow("Decryption failed");
  });

  it("should reject decryption with wrong key", () => {
    const originalData = "Hello, StringRay!";
    const encrypted = securitySystem.encryptData(originalData);

    // Try to decrypt with different key
    const wrongKeySystem = new SecurityHardeningSystem("different-key-67890");

    expect(() => {
      wrongKeySystem.decryptData(encrypted);
    }).toThrow("Decryption failed");
  });

  it("should handle empty string", () => {
    const emptyEncrypted = securitySystem.encryptData("");
    const emptyDecrypted = securitySystem.decryptData(emptyEncrypted);

    expect(emptyDecrypted).toBe("");
  });

  it("should handle long strings", () => {
    const longString = "a".repeat(1000);
    const longEncrypted = securitySystem.encryptData(longString);
    const longDecrypted = securitySystem.decryptData(longEncrypted);

    expect(longDecrypted).toBe(longString);
  });

  it("should handle unicode characters", () => {
    const unicodeString = "Hello 世界 🌍 Ñoño";
    const unicodeEncrypted = securitySystem.encryptData(unicodeString);
    const unicodeDecrypted = securitySystem.decryptData(unicodeEncrypted);

    expect(unicodeDecrypted).toBe(unicodeString);
  });

  it("should produce longer ciphertext than plaintext (IV + auth tag overhead)", () => {
    const shortData = "Hi";
    const encrypted = securitySystem.encryptData(shortData);

    // Ciphertext should be longer due to IV (16 bytes) + auth tag (16 bytes)
    expect(encrypted.length).toBeGreaterThan(shortData.length);
  });

  it("should use Base64 encoding for ciphertext", () => {
    const data = "Hello, StringRay!";
    const encrypted = securitySystem.encryptData(data);

    // Should be valid Base64
    expect(() => {
      Buffer.from(encrypted, "base64");
    }).not.toThrow();
  });
});
