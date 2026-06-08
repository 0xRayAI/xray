/**
 * Encryption test: verifies AES-256-GCM encrypt/decrypt on SecurityHardener
 */

import { describe, it, expect } from "vitest";
import { SecurityHardener } from "../../security/security-hardener.js";

describe("AES-256-GCM Encryption", () => {
  const hardener = new SecurityHardener();
  hardener.initEncryption("test-encryption-key-12345");

  it("should encrypt and decrypt data correctly", () => {
    const original = "Hello, 0xRay!";
    const encrypted = hardener.encryptData(original);
    const decrypted = hardener.decryptData(encrypted);
    expect(decrypted).toBe(original);
  });

  it("should produce different ciphertexts for same plaintext (random IV)", () => {
    const original = "Hello, 0xRay!";
    const e1 = hardener.encryptData(original);
    const e2 = hardener.encryptData(original);
    expect(e1).not.toBe(e2);
  });

  it("should detect tampering (wrong auth tag)", () => {
    const encrypted = hardener.encryptData("test");
    const buf = Buffer.from(encrypted, "base64");
    buf[20] = buf[20] ^ 0xFF;
    const result = hardener.decryptData(buf.toString("base64"));
    expect(result).toBeNull();
  });

  it("should reject decryption with wrong key", () => {
    const encrypted = hardener.encryptData("test");
    const wrong = new SecurityHardener();
    wrong.initEncryption("different-key-67890");
    expect(wrong.decryptData(encrypted)).toBeNull();
  });

  it("should handle empty string", () => {
    const encrypted = hardener.encryptData("");
    expect(hardener.decryptData(encrypted)).toBe("");
  });

  it("should handle long strings", () => {
    const long = "a".repeat(1000);
    const encrypted = hardener.encryptData(long);
    expect(hardener.decryptData(encrypted)).toBe(long);
  });

  it("should handle unicode characters", () => {
    const unicode = "Hello 世界 🌍 Ñoño";
    const encrypted = hardener.encryptData(unicode);
    expect(hardener.decryptData(encrypted)).toBe(unicode);
  });

  it("should produce longer ciphertext than plaintext (IV + auth tag overhead)", () => {
    const encrypted = hardener.encryptData("Hi");
    expect(encrypted.length).toBeGreaterThan("Hi".length);
  });
});
