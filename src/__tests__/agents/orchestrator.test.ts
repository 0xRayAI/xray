import { describe, it, expect } from "vitest";
import { orchestrator } from "../../agents/orchestrator.js";
import type { AgentConfig } from "../../agents/types.js";

describe("Orchestrator Agent Configuration", () => {
  it("should be a valid AgentConfig object", () => {
    const config: AgentConfig = orchestrator;
    expect(config).toBeDefined();
  });

  describe("Basic Configuration", () => {
    it("should have correct name", () => {
      expect(orchestrator.name).toBe("orchestrator");
    });

    it("should be configured as subagent mode", () => {
      expect(orchestrator.mode).toBe("subagent");
    });

    it("should be disabled", () => {
      expect(orchestrator.enabled).toBe(false);
    });

    it("should have zero maxComplexity", () => {
      expect(orchestrator.maxComplexity).toBe(0);
    });
  });

  describe("Deprecated Status", () => {
    it("should have deprecation notice in description", () => {
      expect(orchestrator.description).toContain("DEPRECATED");
    });

    it("should indicate orchestration is plugin-level", () => {
      expect(orchestrator.description).toContain("plugin-level");
    });

    it("should reference agent-delegator", () => {
      expect(orchestrator.description).toContain("agent-delegator");
    });

    it("should have deprecation notice in system prompt", () => {
      expect(orchestrator.system).toContain("DEPRECATED");
    });

    it("should reference complexity analysis", () => {
      expect(orchestrator.system).toContain("complexity");
    });
  });
});