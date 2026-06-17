/**
 * Strategy Selector Tests
 *
 * Tests for adaptive strategy selection based on complexity, risk, and context
 *
 * @since 2026-04-16
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AdaptiveStrategySelector,
  adaptiveStrategySelector,
  selectVotingStrategy,
} from "../../delegation/strategy-selector.js";
import type { StrategySelectionContext, VotingStrategy } from "../../delegation/voting-types.js";

describe("AdaptiveStrategySelector", () => {
  let selector: AdaptiveStrategySelector;

  beforeEach(() => {
    selector = new AdaptiveStrategySelector();
  });

  describe("selectStrategy", () => {
    it("should return expert_priority for high complexity (>=50)", () => {
      const context: StrategySelectionContext = {
        complexity: 55,
        riskLevel: "high",
        participantCount: 4,
        hasSecurityConcerns: false,
        hasArchitecturalImpact: false,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("expert_priority");
    });

    it("should return consensus for moderate complexity (25-49)", () => {
      const context: StrategySelectionContext = {
        complexity: 30,
        riskLevel: "medium",
        participantCount: 3,
        hasSecurityConcerns: false,
        hasArchitecturalImpact: false,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("consensus");
    });

    it("should return majority_vote for low complexity (<25)", () => {
      const context: StrategySelectionContext = {
        complexity: 15,
        riskLevel: "low",
        participantCount: 2,
        hasSecurityConcerns: false,
        hasArchitecturalImpact: false,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("majority_vote");
    });

    it("should return expert_priority when hasSecurityConcerns is true", () => {
      const context: StrategySelectionContext = {
        complexity: 20,
        riskLevel: "low",
        participantCount: 2,
        hasSecurityConcerns: true,
        hasArchitecturalImpact: false,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("expert_priority");
    });

    it("should use securityDominant when hasSecurityConcerns is true", () => {
      const context: StrategySelectionContext = {
        complexity: 10,
        riskLevel: "low",
        participantCount: 2,
        hasSecurityConcerns: true,
        hasArchitecturalImpact: false,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("expert_priority");
    });

    it("should use architecturalDominant when hasArchitecturalImpact is true", () => {
      const context: StrategySelectionContext = {
        complexity: 10,
        riskLevel: "low",
        participantCount: 2,
        hasSecurityConcerns: false,
        hasArchitecturalImpact: true,
      };

      const strategy = selector.selectStrategy(context);
      expect(strategy).toBe("expert_priority");
    });
  });

  describe("selectStrategyWithDefaults", () => {
    it("should use defaults when no context provided", () => {
      const strategy = selector.selectStrategyWithDefaults(15, "low", false, false, 2);
      expect(strategy).toBe("majority_vote");
    });

    it("should respect security concerns", () => {
      const strategy = selector.selectStrategyWithDefaults(20, "low", true, false, 2);
      expect(strategy).toBe("expert_priority");
    });

    it("should respect architectural impact", () => {
      const strategy = selector.selectStrategyWithDefaults(20, "low", false, true, 2);
      expect(strategy).toBe("expert_priority");
    });
  });

  describe("getStrategyReasoning", () => {
    it("should return reasoning string", () => {
      const context: StrategySelectionContext = {
        complexity: 45,
        riskLevel: "high",
        participantCount: 4,
        hasSecurityConcerns: false,
        hasArchitecturalImpact: false,
      };

      const reasoning = selector.getStrategyReasoning(context);
      expect(reasoning).toContain("Complexity:");
      expect(reasoning).toContain("Risk:");
      expect(reasoning).toContain("Participants:");
    });
  });

  describe("getConfig", () => {
    it("should return current config", () => {
      const config = selector.getConfig();
      expect(config.simple).toBeDefined();
      expect(config.moderate).toBeDefined();
      expect(config.complex).toBeDefined();
      expect(config.enterprise).toBeDefined();
    });
  });

  describe("updateConfig", () => {
    it("should update config values", () => {
      selector.updateConfig({ simple: "consensus" });
      const config = selector.getConfig();
      expect(config.simple).toBe("consensus");
    });
  });
});

describe("adaptiveStrategySelector singleton", () => {
  it("should have default strategies", () => {
    const config = adaptiveStrategySelector.getConfig();
    expect(config.simple).toBe("majority_vote");
    expect(config.moderate).toBe("majority_vote");
    expect(config.complex).toBe("consensus");
    expect(config.enterprise).toBe("expert_priority");
  });
});

describe("selectVotingStrategy utility", () => {
  it("should return majority_vote for simple tasks", () => {
    const strategy = selectVotingStrategy(10, "low", false, false, 2);
    expect(strategy).toBe("majority_vote");
  });

  it("should return consensus for moderate tasks", () => {
    const strategy = selectVotingStrategy(30, "medium", false, false, 3);
    expect(strategy).toBe("consensus");
  });

  it("should return consensus for high risk", () => {
    const strategy = selectVotingStrategy(25, "critical", false, false, 3);
    expect(strategy).toBe("consensus");
  });

  it("should return expert_priority for security concerns", () => {
    const strategy = selectVotingStrategy(15, "low", true, false, 2);
    expect(strategy).toBe("expert_priority");
  });
});