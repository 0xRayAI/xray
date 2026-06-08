/**
 * Security Hardening Module
 *
 * Implements additional security measures and hardening for the framework.
 * Addresses vulnerabilities identified during security audit.
 * Includes AES-256-GCM encryption, scrypt password hashing, and event tracking.
 *
 * @version 2.0.0
 * @since 2026-01-07
 */

import { SecurityIssue } from "./security-auditor.js";
import { promises as fs } from "fs";
import * as crypto from "crypto";
import { frameworkLogger } from "../core/framework-logger.js";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

interface SecurityEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  source: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SecurityHardeningConfig {
  enableInputValidation: boolean;
  enableRateLimiting: boolean;
  enableAuditLogging: boolean;
  enableSecureHeaders: boolean;
  maxRequestSizeBytes: number; // Maximum request size in bytes
  rateLimitWindowMs: number; // Rate limit window in milliseconds
  rateLimitMaxRequests: number; // Maximum requests per window
}

export class SecurityHardener {
  private config: SecurityHardeningConfig;
  private encryptionKey: Buffer | null = null;
  private securityEvents: SecurityEvent[] = [];
  private readonly maxSecurityEvents = 1000;

  constructor(config: Partial<SecurityHardeningConfig> = {}) {
    this.config = {
      enableInputValidation: true,
      enableRateLimiting: true,
      enableAuditLogging: true,
      enableSecureHeaders: true,
      maxRequestSizeBytes: 1024 * 1024, // 1MB
      rateLimitWindowMs: 60000, // 1 minute
      rateLimitMaxRequests: 100,
      ...config,
    };
  }

  /**
   * Initialize encryption with an optional key.
   * Generates a random key if none provided.
   */
  initEncryption(secret?: string): void {
    if (this.encryptionKey) return;
    this.encryptionKey = secret
      ? crypto.scryptSync(secret, "salt", KEY_LENGTH)
      : crypto.randomBytes(KEY_LENGTH);
  }

  /**
   * AES-256-GCM encrypt data.
   * Returns Base64 string with IV + ciphertext + auth tag.
   */
  encryptData(data: string): string {
    this.initEncryption();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey!, iv);
    let encrypted = cipher.update(data, "utf8", "binary");
    encrypted += cipher.final("binary");
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, Buffer.from(encrypted, "binary"), authTag]);
    return combined.toString("base64");
  }

  /**
   * AES-256-GCM decrypt data.
   * Returns null on auth failure (tampered key or data).
   */
  decryptData(encryptedData: string): string | null {
    this.initEncryption();
    try {
      const combined = Buffer.from(encryptedData, "base64");
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(combined.length - 16);
      const encrypted = combined.subarray(IV_LENGTH, combined.length - 16);
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey!, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    } catch {
      return null;
    }
  }

  /**
   * Hash password with scrypt and unique salt.
   */
  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(32).toString("hex");
      crypto.scrypt(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve({ hash: derivedKey.toString("hex"), salt });
      });
    });
  }

  /**
   * Verify password against a scrypt hash.
   */
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    return new Promise((resolve) => {
      crypto.scrypt(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          resolve(crypto.timingSafeEqual(
            Buffer.from(derivedKey.toString("hex"), "hex"),
            Buffer.from(hash, "hex"),
          ));
        } catch {
          resolve(false);
        }
      });
    });
  }

  /**
   * Generate a cryptographically secure random hex token.
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Record a security event for tracking and stats.
   */
  recordSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp">): void {
    const entry: SecurityEvent = {
      id: this.generateSecureToken(16),
      timestamp: Date.now(),
      ...event,
    };
    this.securityEvents.push(entry);
    if (this.securityEvents.length > this.maxSecurityEvents) {
      this.securityEvents.shift();
    }
    if (event.severity === "high" || event.severity === "critical") {
      frameworkLogger.log("security-hardener", "security-event", "error", {
        severity: event.severity,
        type: event.type,
        message: event.message,
        source: event.source,
      });
    }
  }

  /**
   * Get recent security events.
   */
  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Get security event statistics.
   */
  getSecurityStats(): { totalEvents: number; eventsBySeverity: Record<string, number> } {
    const eventsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    this.securityEvents.forEach((e) => {
      eventsBySeverity[e.severity] = (eventsBySeverity[e.severity] || 0) + 1;
    });
    return { totalEvents: this.securityEvents.length, eventsBySeverity };
  }

  /**
   * Apply security hardening based on audit results
   */
  async hardenSecurity(auditResult: { issues: SecurityIssue[] }): Promise<{
    appliedFixes: string[];
    remainingIssues: SecurityIssue[];
  }> {
    const appliedFixes: string[] = [];
    const remainingIssues: SecurityIssue[] = [];

    for (const issue of auditResult.issues) {
      const fix = await this.applyFixForIssue(issue);
      if (fix.applied) {
        appliedFixes.push(fix.description);
      } else {
        remainingIssues.push(issue);
      }
    }

    return { appliedFixes, remainingIssues };
  }

  private async applyFixForIssue(issue: SecurityIssue): Promise<{
    applied: boolean;
    description: string;
  }> {
    switch (issue.category) {
      case "hardcoded-secrets":
        return await this.fixHardcodedSecrets(issue);
      case "file-permissions":
        return await this.fixFilePermissions(issue);
      case "dependency-management":
        return await this.fixDependencyManagement(issue);
      case "input-validation":
        return await this.addInputValidation(issue);
      default:
        return {
          applied: false,
          description: `No automated fix available for ${issue.category}`,
        };
    }
  }

  private async fixHardcodedSecrets(issue: SecurityIssue): Promise<{
    applied: boolean;
    description: string;
  }> {
    // This would require manual intervention, but we can suggest the fix
    return {
      applied: false,
      description: `Manual intervention required for hardcoded secrets in ${issue.file}`,
    };
  }

  private async fixFilePermissions(issue: SecurityIssue): Promise<{
    applied: boolean;
    description: string;
  }> {
    try {
      // Remove world-writable permissions
      await fs.chmod(issue.file, 0o644);
      return {
        applied: true,
        description: `Fixed file permissions for ${issue.file}`,
      };
    } catch (error) {
      return {
        applied: false,
        description: `Failed to fix permissions for ${issue.file}: ${error}`,
      };
    }
  }

  private async fixDependencyManagement(issue: SecurityIssue): Promise<{
    applied: boolean;
    description: string;
  }> {
    // This requires manual intervention for dependency updates
    return {
      applied: false,
      description: `Manual intervention required for dependency management in ${issue.file}`,
    };
  }

  private async addInputValidation(issue: SecurityIssue): Promise<{
    applied: boolean;
    description: string;
  }> {
    // This would require code analysis and modification
    return {
      applied: false,
      description: `Code modification required for input validation in ${issue.file}`,
    };
  }

  /**
   * Add security headers to HTTP responses
   */
  addSecurityHeaders(headers: Record<string, string>): Record<string, string> {
    if (!this.config.enableSecureHeaders) return headers;

    return {
      ...headers,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }

  /**
   * Validate input data
   */
  validateInput(input: any, schema: any): { valid: boolean; errors: string[] } {
    if (!this.config.enableInputValidation) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    // Basic validation - in production, use a proper validation library
    if (schema.type === "string" && typeof input !== "string") {
      errors.push("Expected string");
    }

    if (
      schema.maxLength &&
      typeof input === "string" &&
      input.length > schema.maxLength
    ) {
      errors.push(`String too long (max ${schema.maxLength})`);
    }

    if (
      schema.pattern &&
      typeof input === "string" &&
      !new RegExp(schema.pattern).test(input)
    ) {
      errors.push("String does not match required pattern");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(identifier: string, requests: Map<string, number[]>): boolean {
    if (!this.config.enableRateLimiting) return true;

    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;

    const userRequests = requests.get(identifier) || [];
    const recentRequests = userRequests.filter((time) => time > windowStart);

    if (recentRequests.length >= this.config.rateLimitMaxRequests) {
      return false;
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);

    return true;
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    metadata?: Record<string, any>;
  }): void {
    if (!this.config.enableAuditLogging) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    // In production, this would write to secure audit logs
  }
}

// Export singleton instance
export const securityHardener = new SecurityHardener();
