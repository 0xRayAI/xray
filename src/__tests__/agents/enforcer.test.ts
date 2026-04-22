import { describe, it, expect } from "vitest";
import { enforcer } from "../../agents/enforcer.js";
import type { AgentConfig } from "../../agents/types.js";

describe("Enforcer Agent Configuration", () => {
  it("should be a valid AgentConfig object", () => {
    const config: AgentConfig = enforcer;
    expect(config).toBeDefined();
  });

  describe("Basic Configuration", () => {
    it("should have correct name", () => {
      expect(enforcer.name).toBe("enforcer");
    });

    it("should be configured as subagent mode", () => {
      expect(enforcer.mode).toBe("subagent");
    });

    it("should be disabled", () => {
      expect(enforcer.enabled).toBe(false);
    });

    it("should have zero maxComplexity", () => {
      expect(enforcer.maxComplexity).toBe(0);
    });
  });

  describe("Deprecated Status", () => {
    it("should have deprecation notice in description", () => {
      expect(enforcer.description).toContain("DEPRECATED");
    });

    it("should indicate enforcement is plugin-level", () => {
      expect(enforcer.description).toContain("plugin-level");
    });

    it("should have deprecation notice in system prompt", () => {
      expect(enforcer.system).toContain("DEPRECATED");
    });

    it("should reference preValidate processor", () => {
      expect(enforcer.system).toContain("preValidate processor");
    });
  });
});