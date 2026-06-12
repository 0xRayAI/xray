import { describe, test, expect } from "vitest";
import { assessComplexity, shouldDelegate, getDelegationStrategy } from "../../tools/assess-complexity-tool.js";

describe("assessComplexity", () => {
  test("returns assessment result for a simple task", () => {
    const result = assessComplexity({
      taskDescription: "Fix a typo in README.md",
    });

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("strategy");
    expect(result).toHaveProperty("estimatedAgents");
    expect(Array.isArray(result.reasoning)).toBe(true);
    expect(["simple", "moderate", "complex", "enterprise"]).toContain(result.level);
    expect(["single-agent", "multi-agent", "orchestrator-led"]).toContain(result.strategy);
    expect(result.estimatedAgents).toBeGreaterThan(0);
  });

  test("returns higher score for complex tasks", () => {
    const simple = assessComplexity({
      taskDescription: "Fix typo",
      files: [],
      changeVolume: 1,
    });

    const complex = assessComplexity({
      taskDescription: "Build a multi-agent orchestration system with distributed state management and real-time conflict resolution",
      files: ["src/**/*.ts"],
      dependencies: ["react", "node", "typescript"],
      changeVolume: 100,
      riskLevel: "critical",
      estimatedDuration: 480,
    });

    expect(complex.score).toBeGreaterThan(simple.score);
  });
});

describe("shouldDelegate", () => {
  test("returns false for simple tasks", () => {
    expect(shouldDelegate({ taskDescription: "Rename a variable" })).toBe(false);
  });

  test("returns true for complex tasks", () => {
    expect(shouldDelegate({
      taskDescription: "Redesign the entire authentication system with OAuth2, JWT, session management, and MFA support across 15 microservices",
      changeVolume: 500,
      riskLevel: "critical",
    })).toBe(true);
  });
});

describe("getDelegationStrategy", () => {
  test("returns assessment result matching assessComplexity", () => {
    const input = { taskDescription: "Fix a typo" };
    const direct = assessComplexity(input);
    const strategy = getDelegationStrategy(input);

    expect(strategy.score).toBe(direct.score);
    expect(strategy.level).toBe(direct.level);
    expect(strategy.strategy).toBe(direct.strategy);
  });
});
