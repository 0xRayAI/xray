/**
 * Security Module Integration Tests
 *
 * End-to-end security workflow testing.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SecurityHardener } from "../../../security/security-hardener.js";
import { SecurityHeadersMiddleware } from "../../../security/security-headers.js";

// Mock file system operations
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn(),
  resolve: vi.fn(),
}));

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

describe("Security Module Integration", () => {
  let hardener: SecurityHardener;
  let headersMiddleware: SecurityHeadersMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();

    hardener = new SecurityHardener();
    headersMiddleware = new SecurityHeadersMiddleware();

    // Setup default mocks
    vi.mocked(readdirSync).mockReturnValue([
      { name: "app.ts", isDirectory: () => false, isFile: () => true } as any,
      {
        name: "config.ts",
        isDirectory: () => false,
        isFile: () => true,
      } as any,
      {
        name: "package.json",
        isDirectory: () => false,
        isFile: () => true,
      } as any,
    ]);
    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
      mode: 0o644,
    } as any);
    vi.mocked(join).mockImplementation((...args) => args.join("/"));
    vi.mocked(resolve).mockImplementation((...args) => args.join("/"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Security Headers Integration", () => {
    it("should integrate security headers with audit results", () => {
      const mockResponse = { setHeader: vi.fn() };
      headersMiddleware.applySecurityHeaders(mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-Frame-Options",
        "DENY",
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-XSS-Protection",
        "1; mode=block",
      );
    });

    it("should work with Express middleware", () => {
      const expressMiddleware = headersMiddleware.getExpressMiddleware();
      expect(typeof expressMiddleware).toBe("function");

      const mockReq = {};
      const mockRes = { setHeader: vi.fn() };
      const mockNext = vi.fn();

      expressMiddleware(mockReq, mockRes, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Input Validation and Rate Limiting", () => {
    it("should validate input and apply rate limiting together", () => {
      const schema = { type: "string", maxLength: 10 };
      const validResult = hardener.validateInput("test", schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = hardener.validateInput("this is too long", schema);
      expect(invalidResult.valid).toBe(false);

      const requests = new Map<string, number[]>();
      const rateLimitResult = hardener.checkRateLimit("user", requests);
      expect(typeof rateLimitResult).toBe("boolean");
    });
  });
});
