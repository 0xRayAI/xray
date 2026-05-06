import { describe, it, expect } from "vitest";
import {
  builtinAgents,
  architect,
  bugTriageSpecialist,
  codeReviewer,
  securityAuditor,
  refactorer,
  testingLead,
} from "../../agents/index.js";
import type { AgentConfig } from "../../agents/types.js";

describe("Agent Index Registry", () => {
  describe("Builtin Agents Registry", () => {
    it("should export a valid builtinAgents registry", () => {
      expect(builtinAgents).toBeDefined();
      expect(typeof builtinAgents).toBe("object");
      expect(builtinAgents).not.toBeNull();
    });

    it("should contain expected specialized agents", () => {
      const expectedAgents = [
        "architect",
        "bug-triage-specialist",
        "code-reviewer",
        "security-auditor",
        "refactorer",
        "testing-lead",
      ];

      expectedAgents.forEach((agentName) => {
        expect(builtinAgents).toHaveProperty(agentName);
      });

      expect(Object.keys(builtinAgents).length).toBeGreaterThanOrEqual(6);
    });

    it("should have all agents as valid AgentConfig objects", () => {
      Object.values(builtinAgents).forEach((agent) => {
        expect(agent).toBeDefined();
        expect(typeof agent).toBe("object");
        expect(agent).toHaveProperty("name");
        // Model is optional - don't require it
        expect(agent).toHaveProperty("description");
      });
    });

    it("should have agents with correct names matching their keys", () => {
      Object.entries(builtinAgents).forEach(([key, agent]) => {
        expect(agent.name.toLowerCase()).toBe(key.toLowerCase());
      });
    });

    it("should have agents configured appropriately", () => {
      Object.values(builtinAgents).forEach((agent) => {
        expect(["subagent", "primary"]).toContain(agent.mode);
      });
    });

    it("should have agents with consistent model configuration", () => {
      Object.values(builtinAgents).forEach((agent) => {
        // Model is optional - if specified, it should be a string
        if (agent.model) {
          expect(typeof agent.model).toBe("string");
        }
      });
    });

    it("should have agents with appropriate temperature settings", () => {
      Object.values(builtinAgents).forEach((agent) => {
        // Temperature is optional - only check if specified
        if (agent.temperature !== undefined) {
          expect(agent.temperature).toBeGreaterThanOrEqual(0.1);
        }
      });
    });
  });

  describe("Individual Agent Exports", () => {
    it("should export all individual agents", () => {
      expect(architect).toBeDefined();
      expect(bugTriageSpecialist).toBeDefined();
      expect(codeReviewer).toBeDefined();
      expect(securityAuditor).toBeDefined();
      expect(refactorer).toBeDefined();
      expect(testingLead).toBeDefined();
    });

    it("should have individual exports match registry entries", () => {
      expect(architect).toBe(builtinAgents.architect);
    });

    it("should have all individual exports as valid AgentConfig objects", () => {
      const agents = [
        architect,
        bugTriageSpecialist,
        codeReviewer,
        securityAuditor,
        refactorer,
        testingLead,
      ];

      agents.forEach((agent) => {
        expect(agent).toHaveProperty("name");
        // Model is optional
        expect(agent).toHaveProperty("description");
      });
    });
  });

  describe("Registry Integrity", () => {
    it("should have no duplicate agent names", () => {
      const names = Object.values(builtinAgents).map((agent) => agent.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have no duplicate keys", () => {
      const keys = Object.keys(builtinAgents);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("should have consistent naming between keys and agent names", () => {
      Object.entries(builtinAgents).forEach(([key, agent]) => {
        expect(agent.name.toLowerCase()).toBe(key.toLowerCase());
      });
    });
  });
});
