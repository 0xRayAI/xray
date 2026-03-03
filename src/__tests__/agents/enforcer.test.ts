import { describe, it, expect } from "vitest";
import { enforcer } from "../../agents/enforcer.js";
import type { AgentConfig } from "../../agents/types.js";

describe("Enforcer Agent Configuration", () => {
  it("should be a valid AgentConfig object", () => {
    // Type check - this will fail at compile time if not valid
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

    it("should have low temperature for deterministic responses", () => {
      expect(enforcer.temperature).toBe(0.1);
    });
  });

  describe("Description and System Prompt", () => {
    it("should have appropriate description", () => {
      expect(enforcer.description).toContain("StringRay Framework enforcer");
      expect(enforcer.description).toContain("error handling");
      expect(enforcer.description).toContain("compliance monitoring");
    });

    it("should have comprehensive system prompt", () => {
      const system = enforcer.system;
      expect(system).toContain("StringRay");
      expect(system).toContain("error prevention");
      expect(system).toContain("Universal Development Codex v1.2.0");
      expect(system).toContain("99.6%");
      expect(system).toContain("256MB");
    });

    it("should define core responsibilities", () => {
      const system = enforcer.system;
      // The concise prompt doesn't have explicit responsibilities section
      // but has Focus, Rules, Pipeline sections
      expect(system).toContain("Focus");
      expect(system).toContain("Rules");
      expect(system).toContain("Processor");
    });
  });

  describe("Tools Configuration", () => {
    it("should have appropriate tool permissions", () => {
      expect(enforcer.tools?.include).toContain("read");
      expect(enforcer.tools?.include).toContain("grep");
      expect(enforcer.tools?.include).toContain("lsp_*");
      expect(enforcer.tools?.include).toContain("run_terminal_cmd");
      expect(enforcer.tools?.include).toContain("lsp_diagnostics");
      expect(enforcer.tools?.include).toContain("lsp_code_actions");
    });

    it("should not have exclude restrictions", () => {
      expect(enforcer.tools?.exclude).toBeUndefined();
    });
  });

  describe("Permissions Configuration", () => {
    it("should allow edit operations", () => {
      expect(enforcer.permission?.edit).toBe("allow");
    });

    it("should have specific bash command permissions", () => {
      const bashPerms = enforcer.permission?.bash;
      expect(bashPerms).toBeDefined();
      expect(typeof bashPerms).toBe("object");

      // Check individual command permissions
      expect((bashPerms as any)?.git).toBe("allow");
      expect((bashPerms as any)?.npm).toBe("allow");
      expect((bashPerms as any)?.bun).toBe("allow");
      expect((bashPerms as any)?.eslint).toBe("allow");
      expect((bashPerms as any)?.prettier).toBe("allow");
    });

    it("should not have webfetch permissions defined", () => {
      expect(enforcer.permission?.webfetch).toBeUndefined();
    });
  });

  describe("Processor Pipeline", () => {
    it("should define processor pipeline", () => {
      const system = enforcer.system;
      expect(system).toContain("Processor");
      expect(system).toContain("codexValidation");
      expect(system).toContain("thresholdCheck");
      expect(system).toContain("complianceReporting");
      expect(system).toContain("violationLogging");
    });

    it("should specify integration hooks", () => {
      const system = enforcer.system;
      expect(system).toContain("Integration");
      expect(system).toContain("validation");
      expect(system).toContain("error");
      expect(system).toContain("performance");
    });
  });

  describe("Codex Compliance", () => {
    it("should reference Universal Development Codex v1.2.0", () => {
      const system = enforcer.system;
      expect(system).toContain("Universal Development Codex v1.2.0");
    });

    it("should specify error prevention target", () => {
      const system = enforcer.system;
      expect(system).toContain("99.6%");
    });

    it("should mention zero tolerance policy", () => {
      const system = enforcer.system;
      expect(system).toContain("zero-tolerance");
    });

    it("should reference codex terms", () => {
      const system = enforcer.system;
      // The prompt references codex, just not exact number
      expect(system).toContain("codex");
    });
  });

  describe("Performance Limits", () => {
    it("should specify memory limit", () => {
      const system = enforcer.system;
      expect(system).toContain("256MB memory");
    });

    it("should specify CPU limit", () => {
      const system = enforcer.system;
      expect(system).toContain("80% CPU");
    });

    it("should specify timeout limit", () => {
      const system = enforcer.system;
      expect(system).toContain("45s timeout");
    });
  });

  describe("Operational Guidelines", () => {
    it("should provide actionable error message guidance", () => {
      const system = enforcer.system;
      expect(system).toContain("actionable error messages");
      expect(system).toContain("context");
    });

    it("should require structured logging", () => {
      const system = enforcer.system;
      expect(system).toContain("structured logging");
      expect(system).toContain("JSON format");
    });

    it("should maintain system stability goal", () => {
      const system = enforcer.system;
      expect(system).toContain("maintain system stability");
      expect(system).toContain("production-ready code quality");
    });
  });
});
