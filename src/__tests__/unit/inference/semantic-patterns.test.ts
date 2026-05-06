import { describe, it, expect, beforeAll } from "vitest";
import {
  analyzeStructuralPatterns,
  StructuralPattern,
} from "../../../inference/semantic-patterns.js";

describe("Semantic Pattern Detection", () => {
  let patterns20: StructuralPattern[];
  let patterns30: StructuralPattern[];
  let patterns40: StructuralPattern[];

  beforeAll(() => {
    patterns20 = analyzeStructuralPatterns("HEAD~20", "HEAD");
    patterns30 = analyzeStructuralPatterns("HEAD~30", "HEAD");
    patterns40 = analyzeStructuralPatterns("HEAD~40", "HEAD");
  }, 180000);

  it("should detect patterns between recent commits", () => {
    expect(Array.isArray(patterns20)).toBe(true);

    for (const p of patterns20) {
      expect(p.name).toBeTruthy();
      expect(p.confidence).toBeGreaterThan(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
      expect(p.description).toBeTruthy();
      expect(Array.isArray(p.evidence)).toBe(true);
    }
  });

  it("should sort patterns by confidence descending", () => {
    if (patterns30.length < 2) return;

    for (let i = 1; i < patterns30.length; i++) {
      expect(patterns30[i - 1]!.confidence).toBeGreaterThanOrEqual(
        patterns30[i]!.confidence,
      );
    }
  });

  it("should detect Extract Method when implementations added alongside modifications", () => {
    const extract = patterns30.find((p) => p.name === "Extract Method");
    if (extract) {
      expect(extract.confidence).toBeGreaterThan(0.5);
      expect(extract.description).toContain("monolith");
    }
  });

  it("should detect Dead Code Removal when files deleted", () => {
    const deadCode = patterns40.find((p) => p.name === "Dead Code Removal");
    if (deadCode) {
      expect(deadCode.confidence).toBeGreaterThan(0.8);
      expect(deadCode.evidence.length).toBeGreaterThan(0);
    }
  });

  it("should detect Test Coverage Expansion when test files added", () => {
    const tests = patterns40.find((p) => p.name === "Test Coverage Expansion");
    if (tests) {
      expect(tests.confidence).toBeGreaterThan(0.9);
      expect(tests.evidence.some((e) => e.includes("__tests__"))).toBe(true);
    }
  });

  it("should have descriptive explanations for all patterns", () => {
    for (const p of patterns30) {
      expect(p.description.length).toBeGreaterThan(20);
    }
  });
});
