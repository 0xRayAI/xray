/**
 * Security Headers Middleware
 *
 * Comprehensive security headers implementation for HTTP responses.
 * Integrates with boot orchestrator and API endpoints.
 *
 * @since 2026-01-07
 */

import { frameworkLogger } from "../core/framework-logger.js";

export interface HttpResponse {
  setHeader(name: string, value: string): void;
}

export interface ExpressMiddlewareParams {
  req: unknown;
  res: HttpResponse;
  next: (err?: Error) => void;
}

export interface FastifyMiddlewareParams {
  request: unknown;
  reply: HttpResponse;
  done: (err?: Error) => void;
}

export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableFrameOptions: boolean;
  enableXSSProtection: boolean;
  enableContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  customCSP?: string;
  hstsMaxAge?: number;
  hstsIncludeSubdomains?: boolean;
  hstsPreload?: boolean;
}

export class SecurityHeadersMiddleware {
  private config: SecurityHeadersConfig;
  private headerPairs: Array<[string, string]> = [];

  constructor(config: Partial<SecurityHeadersConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableHSTS: true,
      enableFrameOptions: true,
      enableXSSProtection: true,
      enableContentTypeOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      hstsMaxAge: 31536000, // 1 year
      hstsIncludeSubdomains: true,
      hstsPreload: false,
      ...config,
    };
    this.rebuildHeaders();
  }

  /**
   * Apply security headers to HTTP response
   */
  applySecurityHeaders(response: HttpResponse): void {
    if (!response || typeof response.setHeader !== "function") {
      frameworkLogger.log("security-headers", "invalid-response-object", "warning", { warning: "SecurityHeadersMiddleware: Invalid response object" });
      return;
    }

    for (const [key, value] of this.headerPairs) {
      response.setHeader(key, value);
    }
  }

  private rebuildHeaders(): void {
    const headers: Array<[string, string]> = [];

    if (this.config.enableCSP) {
      headers.push([
        "Content-Security-Policy",
        this.config.customCSP ||
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'",
      ]);
    }

    if (this.config.enableHSTS) {
      let hstsValue = `max-age=${this.config.hstsMaxAge}`;
      if (this.config.hstsIncludeSubdomains) {
        hstsValue += "; includeSubDomains";
      }
      if (this.config.hstsPreload) {
        hstsValue += "; preload";
      }
      headers.push(["Strict-Transport-Security", hstsValue]);
    }

    if (this.config.enableFrameOptions) {
      headers.push(["X-Frame-Options", "DENY"]);
    }

    if (this.config.enableXSSProtection) {
      headers.push(["X-XSS-Protection", "1; mode=block"]);
    }

    if (this.config.enableContentTypeOptions) {
      headers.push(["X-Content-Type-Options", "nosniff"]);
    }

    if (this.config.enableReferrerPolicy) {
      headers.push(["Referrer-Policy", "strict-origin-when-cross-origin"]);
    }

    if (this.config.enablePermissionsPolicy) {
      headers.push([
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()",
      ]);
    }

    this.headerPairs = headers;
  }

  /**
   * Express.js middleware function
   */
  getExpressMiddleware() {
    return (req: unknown, res: HttpResponse, next: (err?: Error) => void) => {
      this.applySecurityHeaders(res);
      next();
    };
  }

  /**
   * Fastify middleware function
   */
  getFastifyMiddleware() {
    return (request: unknown, reply: HttpResponse, done: (err?: Error) => void) => {
      this.applySecurityHeaders(reply);
      done();
    };
  }

  /**
   * Generic middleware for any HTTP framework
   */
  getMiddleware() {
    return this.applySecurityHeaders.bind(this);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityHeadersConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.rebuildHeaders();
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const securityHeadersMiddleware = new SecurityHeadersMiddleware();
