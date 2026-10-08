/**
 * Security Hardening Module
 *
 * Implements additional security measures and hardening for the framework.
 * Addresses vulnerabilities identified during security audit.
 *
 * @since 2026-01-07
 */

import { SecurityIssue } from "./security-auditor.js";
import { promises as fs } from "fs";

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
  private readonly patternCache = new Map<string, RegExp>();

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
      !this.regexFor(String(schema.pattern)).test(input)
    ) {
      errors.push("String does not match required pattern");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private regexFor(source: string): RegExp {
    const cached = this.patternCache.get(source);
    if (cached) {
      cached.lastIndex = 0;
      return cached;
    }
    const compiled = new RegExp(source);
    this.patternCache.set(source, compiled);
    return compiled;
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(identifier: string, requests: Map<string, number[]>): boolean {
    if (!this.config.enableRateLimiting) return true;

    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;

    const userRequests = requests.get(identifier);
    if (!userRequests) {
      requests.set(identifier, [now]);
      return true;
    }

    let recent = 0;
    for (let i = 0; i < userRequests.length; i++) {
      const time = userRequests[i];
      if (time !== undefined && time > windowStart) recent++;
    }
    if (recent >= this.config.rateLimitMaxRequests) return false;

    let write = 0;
    for (let i = 0; i < userRequests.length; i++) {
      const time = userRequests[i];
      if (time !== undefined && time > windowStart) userRequests[write++] = time;
    }
    userRequests.length = write;
    userRequests.push(now);
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
