/**
 * Unit Tests for Anonymization Engine
 */

import { describe, test, expect } from "vitest";
import { AnonymizationEngine, RawReflectionData } from "../../../analytics/anonymization-engine.js";

describe("AnonymizationEngine", () => {
  let anonymizer: AnonymizationEngine;

  test("should create anonymization engine", () => {
    const engine = new AnonymizationEngine();
    expect(engine).toBeInstanceOf(AnonymizationEngine);
  });

  test("should anonymize raw reflection data", () => {
    const rawData: RawReflectionData = {
      projectName: "acme-corp/legacy-system",
      repositoryUrl: "https://github.com/acme/legacy-system",
      reflection: "Fixed bug in user authentication module. The inner dialogue showed I thought it was a simple timeout issue.",
      filePath: "/Users/john/projects/legacy/src/auth.ts",
      author: "john.doe@acme.com",
      authorEmail: "john.doe@acme.com",
      code: "function authenticate(user) { /* secret logic */ }",
      timestamp: new Date("2026-03-06T10:30:00Z"),
      ipAddress: "192.168.1.100"
    };

    anonymizer = new AnonymizationEngine();
    const anonymized = anonymizer.anonymize(rawData);

    // Check that sensitive data is removed
    expect(anonymized.content.taskType).toBe("bug_fix");
    expect(anonymized.content.routedAgent).toBe("bug-triage-specialist");
    
    // Check that learning signals are preserved
    expect(anonymized.content.complexity).toBeGreaterThan(0);
    expect(anonymized.content.complexity).toBeLessThanOrEqual(100);
    expect(anonymized.content.outcome).toBe("success");
  });

  test("should detect task type correctly", () => {
    anonymizer = new AnonymizationEngine();
    
    const bugReflection = "Fixed bug in user authentication";
    const rawData: RawReflectionData = {
      projectName: "test",
      repositoryUrl: "https://github.com/test",
      reflection: bugReflection,
      filePath: "/test/file.ts",
      author: "test@test.com",
      authorEmail: "test@test.com",
      code: "test code",
      timestamp: new Date(),
      ipAddress: undefined
    };

    const anonymized = anonymizer.anonymize(rawData);
    expect(anonymized.content.taskType).toBe("bug_fix");
  });

  test("should extract agent name correctly", () => {
    anonymizer = new AnonymizationEngine();
    
    const reflection = "The enforcer agent handled the code review";
    const rawData: RawReflectionData = {
      projectName: "test",
      repositoryUrl: "https://github.com/test",
      reflection,
      filePath: "/test/file.ts",
      author: "test@test.com",
      authorEmail: "test@test.com",
      code: "test code",
      timestamp: new Date(),
      ipAddress: undefined
    };

    const anonymized = anonymizer.anonymize(rawData);
    expect(anonymized.content.routedAgent).toBe("enforcer");
  });

  test("should remove all PII from anonymized data", () => {
    anonymizer = new AnonymizationEngine();
    
    const rawData: RawReflectionData = {
      projectName: "MyCompany/SecretProject",
      repositoryUrl: "https://github.com/mycompany/secret",
      reflection: "Fixed issue by John Smith (john@company.com)",
      filePath: "/Users/john/secret-project/src/file.ts",
      author: "John Smith",
      authorEmail: "john@company.com",
      code: "SECRET_KEY = '12345'",
      timestamp: new Date("2026-03-06T10:30:00Z"),
      ipAddress: "203.0.113.1"
    };

    const anonymized = anonymizer.anonymize(rawData);

    // Verify no company names in anonymized data
    const dataString = JSON.stringify(anonymized);
    expect(dataString).not.toContain("MyCompany");
    expect(dataString).not.toContain("SecretProject");
    expect(dataString).not.toContain("John Smith");
    expect(dataString).not.toContain("john@company.com");
    expect(dataString).not.toContain("SECRET_KEY");
    expect(dataString).not.toContain("12345");
    expect(dataString).not.toContain("203.0.113.1");
  });

  test("should generate valid UUID for submission ID", () => {
    anonymizer = new AnonymizationEngine();
    
    const rawData: RawReflectionData = {
      projectName: "test",
      repositoryUrl: "https://github.com/test",
      reflection: "Test reflection",
      filePath: "/test/file.ts",
      author: "test@test.com",
      authorEmail: "test@test.com",
      code: "test code",
      timestamp: new Date(),
      ipAddress: undefined
    };

    const anonymized = anonymizer.anonymize(rawData);
    
    expect(anonymized.submissionId).toBeDefined();
    expect(anonymized.submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4 format
  });
});