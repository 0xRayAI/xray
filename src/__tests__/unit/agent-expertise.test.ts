/**
 * Agent Expertise Tests
 *
 * Tests for agent expertise level configuration and voting weights
 *
 * @version 1.0.0
 * @since 2026-04-16
 */

import { describe, it, expect } from "vitest";
import {
  AGENT_EXPERTISE_LEVELS,
  getAgentExpertise,
  getAgentExpertiseLevel,
  getVotingWeight,
  getAgentsWithExpertiseDomain,
  getTopExpertsForDomain,
} from "../../delegation/agent-expertise.js";

describe("AGENT_EXPERTISE_LEVELS", () => {
  it("should have architect with expertise level 10", () => {
    const architect = AGENT_EXPERTISE_LEVELS.architect;
    expect(architect.expertiseLevel).toBe(10);
    expect(architect.domain).toBe("system design");
  });

  it("should have security-auditor with expertise level 10", () => {
    const securityAuditor = AGENT_EXPERTISE_LEVELS["security-auditor"];
    expect(securityAuditor.expertiseLevel).toBe(10);
    expect(securityAuditor.domain).toBe("security");
  });

  it("should have strategist with expertise level 9", () => {
    const strategist = AGENT_EXPERTISE_LEVELS.strategist;
    expect(strategist.expertiseLevel).toBe(9);
  });

  it("should have architect with expertise level 10", () => {
    const architect = AGENT_EXPERTISE_LEVELS.architect;
    expect(architect.expertiseLevel).toBe(10);
  });

  it("should have testing-lead with expertise level 8", () => {
    const testingLead = AGENT_EXPERTISE_LEVELS["testing-lead"];
    expect(testingLead.expertiseLevel).toBe(8);
  });
});

describe("getAgentExpertise", () => {
  it("should return expertise for architect", () => {
    const expertise = getAgentExpertise("architect");
    expect(expertise?.expertiseLevel).toBe(10);
  });

  it("should return expertise for security-auditor", () => {
    const expertise = getAgentExpertise("security-auditor");
    expect(expertise?.expertiseLevel).toBe(10);
  });

  it("should return undefined for unknown agent", () => {
    const expertise = getAgentExpertise("unknown-agent");
    expect(expertise).toBeUndefined();
  });
});

describe("getAgentExpertiseLevel", () => {
  it("should return level 10 for architect", () => {
    expect(getAgentExpertiseLevel("architect")).toBe(10);
  });

  it("should return level 10 for security-auditor", () => {
    expect(getAgentExpertiseLevel("security-auditor")).toBe(10);
  });

  it("should return level 9 for strategist", () => {
    expect(getAgentExpertiseLevel("strategist")).toBe(9);
  });

  it("should return default level 5 for unknown agent", () => {
    expect(getAgentExpertiseLevel("unknown-agent")).toBe(5);
  });
});

describe("getVotingWeight", () => {
  it("should return weight 100 for architect (10 * 10)", () => {
    expect(getVotingWeight("architect")).toBe(100);
  });

  it("should return weight 100 for security-auditor (10 * 10)", () => {
    expect(getVotingWeight("security-auditor")).toBe(100);
  });

  it("should return weight 90 for strategist (9 * 10)", () => {
    expect(getVotingWeight("strategist")).toBe(90);
  });

  it("should return weight 50 for unknown (5 * 10)", () => {
    expect(getVotingWeight("unknown-agent")).toBe(50);
  });
});

describe("getAgentsWithExpertiseDomain", () => {
  it("should find agents in security domain", () => {
    const agents = getAgentsWithExpertiseDomain("security");
    expect(agents.length).toBeGreaterThan(0);
    const hasSecurity = agents.some((a) => a.name === "security-auditor");
    expect(hasSecurity).toBe(true);
  });

  it("should find agents in design domain", () => {
    const agents = getAgentsWithExpertiseDomain("design");
    expect(agents.length).toBeGreaterThan(0);
  });
});

describe("getTopExpertsForDomain", () => {
  it("should return top experts sorted by expertise level", () => {
    const experts = getTopExpertsForDomain("security", 3);
    expect(experts.length).toBeGreaterThan(0);
    for (let i = 1; i < experts.length; i++) {
      expect(experts[i - 1].expertiseLevel).toBeGreaterThanOrEqual(experts[i].expertiseLevel);
    }
  });

  it("should limit results to specified count", () => {
    const experts = getTopExpertsForDomain("security", 2);
    expect(experts.length).toBeLessThanOrEqual(2);
  });
});