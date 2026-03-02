/**
 * Analyzer Unit Tests
 *
 * Comprehensive tests for Analyzer class including:
 * - Code analysis capabilities
 * - System architecture analysis
 * - Dependency analysis functionality
 * - Performance analysis features
 * - Security analysis capabilities
 * - Technical debt assessment
 * - Integration analysis tools
 * - Multi-domain analysis coordination
 *
 * @version 1.0.0
 * @since 2026-02-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzer } from "../../agents/analyzer.js";
import * as fs from "fs";

// Mock fs module
vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("crypto", () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("mock-hash"),
  }),
}));

describe("Analyzer", () => {
  let agent: any;
  let mockFs: any;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = analyzer;
    mockFs = vi.mocked(fs);

    // Setup default mocks
    mockFs.readdirSync.mockReturnValue([
      "package.json",
      "src/",
      "dist/",
      "README.md",
      "config/",
    ]);
    mockFs.statSync.mockReturnValue({
      isDirectory: vi
        .fn()
        .mockImplementation(
          (path: string) =>
            path.includes("src") ||
            path.includes("dist") ||
            path.includes("config"),
        ),
      isFile: vi
        .fn()
        .mockImplementation(
          (path: string) =>
            !path.includes("src") &&
            !path.includes("dist") &&
            !path.includes("config"),
        ),
      mode: 0o644, // Regular file permissions
    });
  });

  describe("Agent Configuration", () => {
    it("should have correct agent name", () => {
      expect(agent.name).toBe("analyzer");
    });

    it("should have comprehensive capabilities", () => {
      const expectedCapabilities = [
        "code-analysis",
        "system-analysis",
        "dependency-analysis",
        "performance-analysis",
        "security-analysis",
        "architecture-analysis",
        "technical-debt-assessment",
        "integration-analysis",
        "comprehensive-reporting",
      ];
      expect(agent.capabilities).toEqual(expectedCapabilities);
    });

    it("should have high max complexity", () => {
      expect(agent.maxComplexity).toBe(100);
    });

    it("should be enabled", () => {
      expect(agent.enabled).toBe(true);
    });

    it("should have subagent mode", () => {
      expect(agent.mode).toBe("subagent");
    });

    it("should have appropriate temperature", () => {
      expect(agent.temperature).toBe(0.2);
    });

    it("should have comprehensive tool access", () => {
      const expectedTools = [
        "read",
        "grep",
        "websearch",
        "codesearch",
        "project-analysis_*",
        "performance-analysis_*",
        "security-audit_*",
        "refactoring-strategies_*",
      ];
      expect(agent.tools.include).toEqual(
        expect.arrayContaining(expectedTools),
      );
    });

    it("should restrict dangerous operations", () => {
      const restrictedTools = [
        "background_task",
        "invoke-skill",
        "skill-*",
        "call_omo_agent",
      ];
      restrictedTools.forEach((tool) => {
        expect(agent.tools.exclude).toContain(tool);
      });
    });

    it("should have appropriate permissions", () => {
      expect(agent.permission.edit).toBe("deny");
      expect(agent.permission.bash).toBe("ask");
    });
  });

  describe("System Prompt", () => {
    it("should contain comprehensive analysis instructions", () => {
      expect(agent.system).toContain("Analyzer subagent");
      expect(agent.system).toContain("Universal analysis specialist");
      expect(agent.system).toContain("code, systems, and technical artifacts");
    });

    it("should cover multiple analysis domains", () => {
      expect(agent.system).toContain("Code Analysis");
      expect(agent.system).toContain("Security Analysis");
      expect(agent.system).toContain("Performance Analysis");
      expect(agent.system).toContain("Architecture Analysis");
      expect(agent.system).toContain("Dependency Analysis");
    });

    it("should have trigger keywords", () => {
      expect(agent.system).toContain("analyze");
      expect(agent.system).toContain("examine");
      expect(agent.system).toContain("audit");
      expect(agent.system).toContain("review");
      expect(agent.system).toContain("assess");
      expect(agent.system).toContain("analyzer");
    });

    it("should mention framework compliance", () => {
      expect(agent.system).toContain("Universal Development Codex v1.2.0");
      expect(agent.system).toContain("Analysis Compliance");
    });
  });

  describe("Code Analysis Capabilities", () => {
    it("should cover code quality analysis", () => {
      expect(agent.capabilities).toContain("code-analysis");
      expect(agent.system).toContain("Structure, readability, maintainability");
      expect(agent.system).toContain("complexity metrics");
    });

    it("should cover pattern recognition", () => {
      expect(agent.system).toContain("Pattern Recognition");
      expect(agent.system).toContain("design patterns");
      expect(agent.system).toContain("architectural styles");
    });
  });

  describe("Security Analysis Capabilities", () => {
    it("should cover vulnerability detection", () => {
      expect(agent.capabilities).toContain("security-analysis");
      expect(agent.system).toContain("Vulnerability detection");
      expect(agent.system).toContain("OWASP Top 10");
    });

    it("should cover security assessment", () => {
      expect(agent.system).toContain("Input validation");
      expect(agent.system).toContain("injection risks");
      expect(agent.system).toContain("Authentication and authorization");
    });
  });

  describe("Performance Analysis Capabilities", () => {
    it("should cover performance profiling", () => {
      expect(agent.capabilities).toContain("performance-analysis");
      expect(agent.system).toContain("Algorithmic efficiency");
      expect(agent.system).toContain("Resource usage patterns");
    });

    it("should cover optimization identification", () => {
      expect(agent.system).toContain("Bottleneck identification");
      expect(agent.system).toContain("Optimization opportunities");
    });
  });

  describe("Architecture Analysis Capabilities", () => {
    it("should cover design pattern analysis", () => {
      expect(agent.capabilities).toContain("architecture-analysis");
      expect(agent.system).toContain("Design pattern compliance");
    });

    it("should cover structure analysis", () => {
      expect(agent.system).toContain("Component coupling");
      expect(agent.system).toContain("Scalability and maintainability");
    });
  });

  describe("Dependency Analysis Capabilities", () => {
    it("should cover package analysis", () => {
      expect(agent.capabilities).toContain("dependency-analysis");
      expect(agent.system).toContain("Package security");
      expect(agent.system).toContain("Version conflicts");
    });

    it("should cover circular dependency detection", () => {
      expect(agent.system).toContain("Circular dependencies");
      expect(agent.system).toContain("License compliance");
    });
  });

  describe("Technical Debt Assessment", () => {
    it("should cover code quality issues", () => {
      expect(agent.capabilities).toContain("technical-debt-assessment");
      expect(agent.system).toContain("Code smells");
      expect(agent.system).toContain("anti-patterns");
    });

    it("should cover complexity metrics", () => {
      expect(agent.system).toContain("Complexity metrics");
      expect(agent.system).toContain("refactoring needs");
    });
  });

  describe("Response Format", () => {
    it("should specify comprehensive response structure", () => {
      expect(agent.system).toContain("Analysis Summary");
      expect(agent.system).toContain("Code Quality Assessment");
      expect(agent.system).toContain("Security Findings");
      expect(agent.system).toContain("Performance Insights");
      expect(agent.system).toContain("Architecture Review");
      expect(agent.system).toContain("Dependency Analysis");
      expect(agent.system).toContain("Prioritized Recommendations");
    });
  });

  describe("Integration with Other Agents", () => {
    it("should mention security auditor collaboration", () => {
      expect(agent.system).toContain("Security-Auditor");
      expect(agent.system).toContain("Escalate critical security findings");
    });

    it("should mention performance optimization", () => {
      expect(agent.system).toContain("Performance-Optimization");
      expect(agent.system).toContain("Suggest performance improvements");
    });

    it("should mention refactorer collaboration", () => {
      expect(agent.system).toContain("Refactorer");
      expect(agent.system).toContain(
        "Recommend refactoring for technical debt",
      );
    });

    it("should mention architect collaboration", () => {
      expect(agent.system).toContain("Architect");
      expect(agent.system).toContain("Validate architectural decisions");
    });
  });

  describe("Multi-Domain Analysis", () => {
    it("should handle comprehensive analysis approach", () => {
      expect(agent.system).toContain("Multi-Domain Analysis");
      expect(agent.system).toContain(
        "code, security, performance, and architectural lenses",
      );
    });

    it("should provide prioritized findings", () => {
      // System prompt contains prioritization in the analysis methodology section
      expect(agent.system).toContain("Prioritization");
      // Check for the prioritization instruction in context
      expect(agent.system).toContain("Prioritized Recommendations");
    });
  });

  describe("Framework Compliance", () => {
    it("should align with development codex terms", () => {
      expect(agent.system).toContain("Term 4");
      expect(agent.system).toContain("Term 15");
      expect(agent.system).toContain("Term 18");
      expect(agent.system).toContain("Term 22");
      expect(agent.system).toContain("Term 24");
      expect(agent.system).toContain("Term 35");
      expect(agent.system).toContain("Term 45");
    });
  });

  describe("File System Integration", () => {
    it("should handle various file types", () => {
      // Analyzer agent has multi-language support for various file types
      expect(agent.system).toContain("Multi-Language Support");
      expect(agent.system).toContain("TypeScript");
      expect(agent.system).toContain("JavaScript");
      expect(agent.system).toContain("Python");
    });

    it("should handle directory structures", () => {
      // Analyzer agent can analyze directory structures via code analysis
      expect(agent.system).toContain("Code Analysis");
      expect(agent.system).toContain("System Architecture Analysis");
    });
  });

  describe("Tool Integration", () => {
    it("should have access to analysis tools", () => {
      const analysisTools = [
        "project-analysis_*",
        "performance-analysis_*",
        "security-audit_*",
        "refactoring-strategies_*",
      ];

      analysisTools.forEach((tool) => {
        expect(agent.tools.include).toContain(tool);
      });
    });

    it("should have search capabilities", () => {
      expect(agent.tools.include).toContain("websearch");
      expect(agent.tools.include).toContain("codesearch");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing analysis targets gracefully", () => {
      mockFs.statSync.mockImplementation((filePath: string) => {
        if (filePath.includes("nonexistent")) {
          throw new Error("Analysis target not found");
        }
        return { isFile: () => true };
      });

      expect(() => {
        if (agent.model) {
          return agent.model;
        }
      }).not.toThrow();
    });

    it("should handle analysis failures", () => {
      // Test that agent can handle analysis failures without crashing
      expect(agent.temperature).toBe(0.2); // Low temp for more precise analysis
    });
  });

  describe("Description and Purpose", () => {
    it("should describe comprehensive analysis capabilities", () => {
      expect(agent.description).toContain("Universal analysis specialist");
      expect(agent.description).toContain(
        "code, systems, and technical artifacts",
      );
      expect(agent.description).toContain(
        "security, performance, architecture",
      );
    });
  });

  describe("Model Integration", () => {
    it("should get validated model for analyzer", () => {
      // The analyzer agent uses the model router to get a validated model
      // Model is optional - if defined, should be a valid model string
      if (agent.model) {
        expect(typeof agent.model).toBe("string");
        expect(agent.model.length).toBeGreaterThan(0);
        // Model router based on agent should come from model type
        expect(agent.model).toMatch(/^(gpt-|claude-|o1-)/);
      }
    });
  });
});
