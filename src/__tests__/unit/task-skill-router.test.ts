/**
 * Task-Skill Router Unit Tests
 *
 * @version 1.1.0
 * @since 2026-02-22
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TaskSkillRouter,
  createTaskSkillRouter,
  routeTaskToAgent,
  preprocessTask,
} from "../../delegation/task-skill-router.js";
import { StringRayStateManager } from "../../state/state-manager.js";

describe("TaskSkillRouter", () => {
  let router: TaskSkillRouter;
  let stateManager: StringRayStateManager;

  beforeEach(() => {
    stateManager = new StringRayStateManager();
    router = createTaskSkillRouter(stateManager);
  });

  describe("constructor", () => {
    it("should create router with state manager", () => {
      expect(router).toBeInstanceOf(TaskSkillRouter);
    });

    it("should create router without state manager", () => {
      const r = new TaskSkillRouter();
      expect(r).toBeInstanceOf(TaskSkillRouter);
    });

    it("should initialize with default mappings", () => {
      const mappings = router.getMappings();
      expect(mappings.length).toBeGreaterThan(20);
    });
  });

  describe("routeTask - Core Functionality", () => {
    it("should route security tasks correctly", () => {
      const result = router.routeTask("scan for security vulnerabilities");
      expect(result.agent).toBe("security-auditor");
      expect(result.skill).toBe("security-audit");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should route testing tasks correctly", () => {
      const result = router.routeTask("write tests for authentication");
      expect(result.agent).toBe("test-architect");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should route refactoring tasks correctly", () => {
      const result = router.routeTask("refactor the messy code");
      expect(result.agent).toBe("refactorer");
    });

    it("should route performance tasks correctly", () => {
      const result = router.routeTask("improve application performance");
      expect(result.agent).toBe("refactorer");
    });

    it("should route code review tasks correctly", () => {
      const result = router.routeTask("review the new code");
      expect(result.agent).toBe("code-reviewer");
    });

    it("should route architecture tasks correctly", () => {
      const result = router.routeTask("design system architecture");
      // "design system" is a UI/UX term that matches first, so enforcer is correct
      // For pure architecture, use keywords without UI overlap
      expect(result.agent).toBe("enforcer");
    });

    it("should route pure architecture tasks correctly", () => {
      const result = router.routeTask("create microservice architecture");
      expect(result.agent).toBe("architect");
    });

    it("should route bug fixing tasks correctly", () => {
      const result = router.routeTask("fix the login bug");
      expect(result.agent).toBe("bug-triage-specialist");
    });

    it("should route documentation tasks correctly", () => {
      const result = router.routeTask("update README file");
      expect(result.agent).toBe("librarian");
    });

    it("should route database tasks correctly", () => {
      const result = router.routeTask("design database schema");
      expect(result.agent).toBe("architect");
    });

    it("should route devops tasks correctly", () => {
      const result = router.routeTask("set up docker pipeline");
      expect(result.agent).toBe("architect");
    });

    it("should route git tasks correctly", () => {
      const result = router.routeTask("resolve merge conflict");
      expect(result.agent).toBe("librarian");
    });

    it("should fallback to enforcer for unknown tasks", () => {
      const result = router.routeTask("do something random xyz");
      expect(result.agent).toBe("enforcer");
    });

    it("should handle empty string", () => {
      const result = router.routeTask("");
      expect(result.agent).toBe("enforcer");
    });
  });

  describe("routeTask - Complexity-based Routing", () => {
    it("should route low complexity to code-reviewer", () => {
      const result = router.routeTask("do something", { complexity: 10 });
      expect(result.agent).toBe("code-reviewer");
    });

    it("should route medium complexity to architect", () => {
      const result = router.routeTask("do something", { complexity: 50 });
      expect(result.agent).toBe("architect");
    });

    it("should route high complexity to orchestrator", () => {
      const result = router.routeTask("do something", { complexity: 100 });
      expect(result.agent).toBe("orchestrator");
    });
  });

  describe("preprocess", () => {
    it("should return operation and context", () => {
      const result = router.preprocess("write tests for auth");
      expect(result.operation).toBe("test");
      expect(result.context).toBeDefined();
      expect(result.routing).toBeDefined();
    });

    it("should include confidence in context", () => {
      const result = router.preprocess("security audit");
      expect(result.context.routingConfidence).toBe(0.95);
    });
  });

  describe("getSkillForAgent", () => {
    it("should return skill for known agent", () => {
      const skill = router.getSkillForAgent("test-architect");
      expect(skill).toBeDefined();
      expect(typeof skill).toBe("string");
    });

    it("should return unknown for unknown agent", () => {
      expect(router.getSkillForAgent("unknown-agent")).toBe("unknown");
    });
  });

  describe("trackResult", () => {
    it("should track successful results", () => {
      router.trackResult("task-1", "test-architect", true);
      const stats = router.getStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });

    it("should track failed results", () => {
      router.trackResult("task-2", "test-architect", false);
      const stats = router.getStats();
      expect(Object.keys(stats).length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should return empty initially", () => {
      const r = createTaskSkillRouter();
      const stats = r.getStats();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe("addMapping", () => {
    it("should add custom mapping", () => {
      const count = router.getMappings().length;
      router.addMapping("xyz-custom-key-123", "custom-skill", "custom-agent");
      expect(router.getMappings().length).toBe(count + 1);
    });
  });

  describe("matchedKeyword", () => {
    it("should return matched keyword", () => {
      const result = router.routeTask("run tests now");
      expect(result.matchedKeyword).toBeDefined();
    });
  });
});

describe("Convenience Functions", () => {
  describe("routeTaskToAgent", () => {
    it("should work", () => {
      const result = routeTaskToAgent("security scan");
      expect(result.agent).toBeDefined();
    });
  });

  describe("preprocessTask", () => {
    it("should work", () => {
      const result = preprocessTask("refactor code");
      expect(result.operation).toBeDefined();
    });
  });
});

describe("Factory Function", () => {
  it("createTaskSkillRouter should work with state manager", () => {
    const sm = new StringRayStateManager();
    const r = createTaskSkillRouter(sm);
    expect(r).toBeInstanceOf(TaskSkillRouter);
  });

  it("createTaskSkillRouter should work without state manager", () => {
    const r = createTaskSkillRouter();
    expect(r).toBeInstanceOf(TaskSkillRouter);
  });
});
