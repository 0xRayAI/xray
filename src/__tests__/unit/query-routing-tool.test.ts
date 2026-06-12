import { describe, test, expect } from "vitest";
import { queryRouting, listAllRoutes } from "../../tools/query-routing-tool.js";

describe("queryRouting", () => {
  test("returns matches for known agent keywords", () => {
    const results = queryRouting(["code review"]);
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r).toHaveProperty("agent");
      expect(r).toHaveProperty("skill");
      expect(r).toHaveProperty("confidence");
      expect(typeof r.confidence).toBe("number");
      expect(Array.isArray(r.matchedKeywords)).toBe(true);
      expect(r.matchedKeywords.length).toBeGreaterThan(0);
    }
  });

  test("returns agents sorted by confidence descending", () => {
    const results = queryRouting(["security"]);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].confidence).toBeLessThanOrEqual(results[i - 1].confidence);
    }
  });

  test("returns empty array for unknown keywords", () => {
    const results = queryRouting(["xyznonexistent12345"]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  test("matches multiple keywords", () => {
    const results = queryRouting(["api", "design"]);
    expect(results.length).toBeGreaterThan(0);
    const allHaveKeywords = results.every(r => r.matchedKeywords.length > 0);
    expect(allHaveKeywords).toBe(true);
  });
});

describe("listAllRoutes", () => {
  test("returns all unique agent-skill routes", () => {
    const routes = listAllRoutes();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  test("returns no duplicate agent-skill pairs", () => {
    const routes = listAllRoutes();
    const seen = new Set<string>();
    for (const r of routes) {
      const key = `${r.agent}:${r.skill}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("returns routes sorted by confidence descending", () => {
    const routes = listAllRoutes();
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].confidence).toBeLessThanOrEqual(routes[i - 1].confidence);
    }
  });
});
