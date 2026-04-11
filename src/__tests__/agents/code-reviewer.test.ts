import { describe, it, expect } from "vitest";
import { codeReviewer } from "../../agents/code-reviewer.js";
import type { AgentConfig } from "../../agents/types.js";

describe("Code Reviewer Agent Configuration", () => {
  it("should be a valid AgentConfig object", () => {
    const config: AgentConfig = codeReviewer;
    expect(config).toBeDefined();
  });

  describe("Basic Configuration", () => {
    it("should have correct name", () => {
      expect(codeReviewer.name).toBe("code-reviewer");
    });

    it("should be configured as subagent mode", () => {
      expect(codeReviewer.mode).toBe("subagent");
    });

    it("should have low temperature for consistent review standards", () => {
      expect(codeReviewer.temperature).toBe(0.1);
    });
  });

  describe("Description and System Prompt", () => {
    it("should have appropriate code review description", () => {
      expect(codeReviewer.description).toContain(
        "0xRay",
      );
      expect(codeReviewer.description).toContain("code reviewer");
    });

    it("should have comprehensive code reviewer system prompt", () => {
      const system = codeReviewer.system;
      expect(system).toContain("0xRay");
      expect(system).toContain("Code Reviewer");
      expect(system).toContain("code");
    });
  });

  describe("Core Responsibilities", () => {
    it("should reference Universal Development Codex", () => {
      const system = codeReviewer.system;
      expect(system).toContain("Universal Development Codex");
    });

    it("should include focus on code quality", () => {
      const system = codeReviewer.system;
      expect(system).toContain("Code quality");
    });
  });

  describe("Key Facilities", () => {
    it("should specify monitoring", () => {
      const system = codeReviewer.system;
      expect(system).toContain("monitoring");
    });

    it("should include analytics", () => {
      const system = codeReviewer.system;
      expect(system).toContain("analytics");
    });

    it("should define review processor", () => {
      const system = codeReviewer.system;
      expect(system).toContain("Review");
    });

    it("should include analytics engine capabilities", () => {
      const system = codeReviewer.system;
      expect(system).toContain("data-driven insights");
      expect(system).toContain("monitoring and analytics");
      expect(system).toContain("performance");
    });

    it("should define review processor components", () => {
      const system = codeReviewer.system;
      expect(system).toContain("code quality");
      expect(system).toContain("actionable insights");
    });

    it("should specify quality metrics", () => {
      const system = codeReviewer.system;
      expect(system).toContain("monitoring and analytics");
      expect(system).toContain("performance");
    });
  });

  describe("Review Process", () => {
    it("should have review process focus", () => {
      const system = codeReviewer.system;
      expect(system).toContain("Review");
    });
  });

  describe("Review Guidelines", () => {
    it("should reference codex terms", () => {
      const system = codeReviewer.system;
      expect(system).toContain("codex");
    });

    it("should prioritize correctness over style", () => {
      const system = codeReviewer.system;
      expect(system).toContain("correctness over style");
    });

    it("should provide actionable feedback", () => {
      const system = codeReviewer.system;
      expect(system).toContain("actionable");
    });

    it("should consider multiple quality dimensions", () => {
      const system = codeReviewer.system;
      expect(system).toContain("performance");
    });

    it("should use data-driven insights", () => {
      const system = codeReviewer.system;
      expect(system).toContain("data-driven insights");
      expect(system).toContain("monitoring and analytics");
    });
  });

  describe("Integration Points", () => {
    it("should have integration capabilities", () => {
      const system = codeReviewer.system;
      expect(system).toContain("Focus");
    });
  });

  describe("Tools Configuration", () => {
    it("should have comprehensive code analysis tools", () => {
      expect(codeReviewer.tools?.include).toContain("read");
      expect(codeReviewer.tools?.include).toContain("grep");
      expect(codeReviewer.tools?.include).toContain("lsp_*");
      expect(codeReviewer.tools?.include).toContain("run_terminal_cmd");
    });
  });

  describe("Permissions Configuration", () => {
    it("should allow edit operations", () => {
      expect(codeReviewer.permission?.edit).toBe("allow");
    });

    it("should have code quality tool permissions", () => {
      const bashPerms = codeReviewer.permission?.bash;
      expect(bashPerms).toBeDefined();
      expect(typeof bashPerms).toBe("object");

      expect((bashPerms as any)?.git).toBe("allow");
      expect((bashPerms as any)?.npm).toBe("allow");
      expect((bashPerms as any)?.bun).toBe("allow");
      expect((bashPerms as any)?.eslint).toBe("allow");
      expect((bashPerms as any)?.prettier).toBe("allow");
    });
  });

  describe("Code Quality Goal", () => {
    it("should define clear code quality maintenance goal", () => {
      const system = codeReviewer.system;
      expect(system).toContain("code quality");
    });
  });
});