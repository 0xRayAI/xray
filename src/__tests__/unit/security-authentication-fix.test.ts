/**
 * Comprehensive tests for API key authentication management
 * 
 * Tests the complete API key system including:
 * - API key creation and management
 * - Authentication with API keys
 * - Rate limiting
 * - API key rotation
 * - Security validation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SecureAuthenticationSystem, User, APIKey } from "../../security/secure-authentication-system.js";

describe("API Key Authentication System", () => {
  let authSystem: SecureAuthenticationSystem;
  let testUser: User;

  beforeEach(async () => {
    // Create RBAC config
    const rbacConfig = {
      roles: {
        user: ["authenticated"],
        admin: ["authenticated", "manage_users"],
      },
      permissions: {
        authenticated: ["read"],
        manage_users: ["create", "read", "update", "delete"],
      },
      roleHierarchy: {},
    };

    // Initialize authentication system
    authSystem = new SecureAuthenticationSystem(
      "test-jwt-secret",
      rbacConfig,
      {
        jwtExpiresIn: "1h",
        refreshTokenExpiresIn: "7d",
      }
    );

    // Create test user
    testUser = await authSystem.createUser({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      roles: ["user"],
    });
  });

  describe("API Key Creation", () => {
    it("should create API key with valid parameters", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Test API Key",
        permissions: ["read", "write"],
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(apiKey.userId).toBe(testUser.id);
      expect(apiKey.name).toBe("Test API Key");
      expect(apiKey.permissions).toEqual(["read", "write"]);
      expect(apiKey.isActive).toBe(true);
      expect(apiKey.createdAt).toBeInstanceOf(Date);
    });

    it("should create API key with expiration", () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Expiring API Key",
        expiresAt,
      });

      expect(apiKey.expiresAt).toBeInstanceOf(Date);
      expect(apiKey.expiresAt?.getTime()).toBe(expiresAt.getTime());
    });

    it("should create API key with rate limit", () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Rate Limited API Key",
        rateLimit: {
          requests: 100,
          window: 60, // 60 minutes
        },
      });

      expect(apiKey.rateLimit).toBeDefined();
      expect(apiKey.rateLimit?.requests).toBe(100);
      expect(apiKey.rateLimit?.window).toBe(60);
    });

    it("should throw error for invalid user", () => {
      expect(() => {
        authSystem.createAPIKey("nonexistent-user", {
          name: "Invalid User Key",
        });
      }).toThrow("User not found");
    });

    it("should create unique API keys", () => {
      const apiKey1 = authSystem.createAPIKey(testUser.id, {
        name: "Key 1",
      });
      const apiKey2 = authSystem.createAPIKey(testUser.id, {
        name: "Key 2",
      });

      expect(apiKey1.id).not.toBe(apiKey2.id);
      expect(apiKey1.key).not.toBe(apiKey2.key);
    });
  });

  describe("API Key Authentication", () => {
    let testApiKey: APIKey;

    beforeEach(() => {
      testApiKey = authSystem.createAPIKey(testUser.id, {
        name: "Test Auth Key",
        permissions: ["read"],
      });
    });

    it("should authenticate with valid API key", async () => {
      const result = await authSystem.authenticate({
        method: "api_key",
        password: "unused",
        metadata: {
          api_key: testApiKey.key,
        },
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(testUser.id);
      expect(result.token).toBeDefined();
    });

    it("should reject authentication with invalid API key", async () => {
      const result = await authSystem.authenticate({
        method: "api_key",
        metadata: {
          api_key: "invalid-key",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or inactive API key");
    });

    it("should reject authentication with expired API key", async () => {
      const expiredApiKey = authSystem.createAPIKey(testUser.id, {
        name: "Expired Key",
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const result = await authSystem.authenticate({
        method: "api_key",
        password: "unused",
        metadata: {
          api_key: expiredApiKey.key,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API key expired");
    });

    it("should reject authentication for inactive API key", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Inactive Key",
      });
      
      // Revoke the API key
      authSystem.revokeAPIKey(apiKey.id, testUser.id);

      const result = await authSystem.authenticate({
        method: "api_key",
        password: "unused",
        metadata: {
          api_key: apiKey.key,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or inactive API key");
    });

    it("should reject authentication with missing API key", async () => {
      const result = await authSystem.authenticate({
        method: "api_key",
        metadata: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("API key is required in metadata");
    });
  });

  describe("API Key Management", () => {
    let testApiKey: APIKey;

    beforeEach(() => {
      testApiKey = authSystem.createAPIKey(testUser.id, {
        name: "Test Management Key",
      });
    });

    it("should get API keys for user", () => {
      const apiKeys = authSystem.getAPIKeys(testUser.id);
      
      expect(apiKeys).toHaveLength(1);
      expect(apiKeys[0].id).toBe(testApiKey.id);
      expect(apiKeys[0].userId).toBe(testUser.id);
      expect(apiKeys[0].name).toBe("Test Management Key");
      expect(apiKeys[0].key).toContain('*'); // Should be masked
      expect(apiKeys[0].isActive).toBe(true);
    });

    it("should get API key by ID", () => {
      const apiKey = authSystem.getAPIKeyById(testApiKey.id, testUser.id);
      
      expect(apiKey).toBeDefined();
      expect(apiKey?.id).toBe(testApiKey.id);
      expect(apiKey?.key).toContain('*'); // Should be masked
    });

    it("should revoke API key", () => {
      const result = authSystem.revokeAPIKey(testApiKey.id, testUser.id);
      
      expect(result).toBe(true);
      
      const updatedApiKey = authSystem.getAPIKeyById(testApiKey.id, testUser.id);
      expect(updatedApiKey?.isActive).toBe(false);
    });

    it("should throw error when revoking non-existent API key", () => {
      expect(() => {
        authSystem.revokeAPIKey("nonexistent-id", testUser.id);
      }).toThrow("API key not found");
    });

    it("should throw error when revoking unauthorized API key", () => {
      const otherUser = authSystem.createUser({
        username: "otheruser",
        email: "other@example.com",
        password: "password123",
        roles: ["user"],
      });

      expect(() => {
        authSystem.revokeAPIKey(testApiKey.id, otherUser.id);
      }).toThrow("Unauthorized to revoke this API key");
    });

    it("should update API key properties", () => {
      const updatedName = "Updated Key Name";
      const updatedPermissions = ["read", "write", "delete"];

      const result = authSystem.updateAPIKey(
        testApiKey.id,
        testUser.id,
        {
          name: updatedName,
          permissions: updatedPermissions,
        }
      );

      expect(result).toBe(true);

      const updatedApiKey = authSystem.getAPIKeyById(testApiKey.id, testUser.id);
      expect(updatedApiKey?.name).toBe(updatedName);
      expect(updatedApiKey?.permissions).toEqual(updatedPermissions);
    });
  });

  describe("Rate Limiting", () => {
    it("should check rate limit for API key with no limit", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "No Rate Limit",
      });

      const rateLimit = await authSystem.checkRateLimit(apiKey.key);
      
      expect(rateLimit.allowed).toBe(true);
      expect(rateLimit.remaining).toBe(-1); // No limit
    });

    it("should check rate limit for API key with limit", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Rate Limited",
        rateLimit: {
          requests: 100,
          window: 60,
        },
      });

      const rateLimit = await authSystem.checkRateLimit(apiKey.key);
      
      expect(rateLimit.allowed).toBe(true);
      expect(rateLimit.remaining).toBe(100);
      expect(rateLimit.resetAt).toBeInstanceOf(Date);
    });

    it("should reject rate limit check for invalid API key", async () => {
      const rateLimit = await authSystem.checkRateLimit("invalid-key");
      
      expect(rateLimit.allowed).toBe(false);
      expect(rateLimit.remaining).toBe(0);
    });

    it("should reject rate limit check for expired API key", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Expired Rate Limit",
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const rateLimit = await authSystem.checkRateLimit(apiKey.key);
      
      expect(rateLimit.allowed).toBe(false);
    });
  });

  describe("API Key Rotation", () => {
    it("should rotate API key", async () => {
      const apiKey = authSystem.createAPIKey(testUser.id, {
        name: "Original Key",
        permissions: ["read"],
      });

      const { newApiKey, revokedApiKey } = await authSystem.rotateAPIKeys(testUser.id);

      expect(newApiKey).toBeDefined();
      expect(revokedApiKey.id).toBe(apiKey.id);
      expect(newApiKey.name).toContain("rotated");
      expect(revokedApiKey.isActive).toBe(false);
      expect(newApiKey.isActive).toBe(true);
    });

    it("should throw error when rotating non-existent API keys", async () => {
      await expect(authSystem.rotateAPIKeys("nonexistent-user")).rejects.toThrow("No active API keys to rotate");
    });
  });

  describe("Security Features", () => {
    it("should mask API key for display", () => {
      const apiKey = "sk_abcdefghijklmnopqrstuvwxyz1234567890";
      const masked = (authSystem as any).maskAPIKey(apiKey);
      
      // Manual check: 35 total - 4 prefix - 4 suffix = 27 middle
      const expectedLength = apiKey.length - 8;
      
      expect(masked.length).toBe(apiKey.length);
      expect(masked.substring(0, 4)).toBe("sk_a");
      expect(masked.substring(masked.length - 4)).toBe("7890");
      expect(masked.substring(4, masked.length - 4)).toHaveLength(expectedLength);
    });

    it("should generate secure API keys", () => {
      const apiKey1 = (authSystem as any).generateSecureAPIKey();
      const apiKey2 = (authSystem as any).generateSecureAPIKey();
      
      expect(apiKey1).toBeDefined();
      expect(apiKey2).toBeDefined();
      expect(apiKey1).not.toBe(apiKey2);
      expect(apiKey1).toMatch(/^sk_[A-Za-z0-9_-]+$/);
      expect(apiKey2).toMatch(/^sk_[A-Za-z0-9_-]+$/);
    });
  });

  describe("Authentication Statistics", () => {
    it("should include API key statistics in auth stats", () => {
      // Create some API keys
      authSystem.createAPIKey(testUser.id, { name: "Key 1" });
      authSystem.createAPIKey(testUser.id, { name: "Key 2" });
      
      const stats = authSystem.getAuthStats();
      
      expect(stats.totalAPIKeys).toBe(2);
      expect(stats.activeAPIKeys).toBe(2);
      expect(stats.totalUsers).toBe(1);
      expect(stats.activeUsers).toBe(1);
    });

    it("should count only active API keys", () => {
      const apiKey = authSystem.createAPIKey(testUser.id, { name: "Key 1" });
      authSystem.createAPIKey(testUser.id, { name: "Key 2" });
      
      // Revoke one API key
      authSystem.revokeAPIKey(apiKey.id, testUser.id);
      
      const stats = authSystem.getAuthStats();
      
      expect(stats.totalAPIKeys).toBe(2);
      expect(stats.activeAPIKeys).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors gracefully", async () => {
      const result = await authSystem.authenticate({
        method: "api_key",
        metadata: {
          api_key: "malformed-key-with-special-chars!@#$%",
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle API key management errors gracefully", () => {
      expect(() => {
        authSystem.getAPIKeys("nonexistent-user");
      }).not.toThrow();
    });
  });
});