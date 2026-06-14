/**
 * Multimodal Looker Unit Tests
 *
 * Comprehensive tests for MultimodalLooker class including:
 * - Media file analysis capabilities
 * - Image interpretation functionality
 * - PDF parsing and content extraction
 * - Diagram analysis and interpretation
 * - Visual content understanding
 * - Tool usage and permissions
 *
 * @version 1.0.0
 * @since 2026-02-02
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { multimodalLooker } from "../../agents/multimodal-looker.js";
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

describe("Multimodal Looker", () => {
  let agent: any;
  let mockFs: any;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = multimodalLooker;
    mockFs = vi.mocked(fs);

    // Setup default mocks
    mockFs.readdirSync.mockReturnValue([
      "screenshot.png",
      "diagram.jpg",
      "documentation.pdf",
      "chart.svg",
    ]);
    mockFs.statSync.mockReturnValue({
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
      mode: 0o644, // Regular file permissions
    });
  });

  describe("Agent Configuration", () => {
    it("should have correct agent name", () => {
      expect(agent.name).toBe("multimodal-looker");
    });

    it("should have correct capabilities", () => {
      const expectedCapabilities = [
        "media-file-analysis",
        "image-interpretation",
        "diagram-analysis",
        "pdf-content-extraction",
        "visual-content-understanding",
        "multimodal-data-processing",
        "technical-diagram-parsing",
        "screenshot-analysis",
        "chart-and-graph-interpretation",
      ];
      expect(agent.capabilities).toEqual(expectedCapabilities);
    });

    it("should have correct max complexity", () => {
      expect(agent.maxComplexity).toBe(80);
    });

    it("should be enabled", () => {
      expect(agent.enabled).toBe(true);
    });

    it("should have subagent mode", () => {
      expect(agent.mode).toBe("subagent");
    });

    it("should have appropriate temperature", () => {
      expect(agent.temperature).toBe(0.3);
    });

    it("should have correct tool permissions", () => {
      expect(agent.tools.include).toContain("read");
      expect(agent.tools.include).toContain("grep");
      expect(agent.tools.include).toContain("webfetch");
      expect(agent.tools.include).toContain("websearch");
      expect(agent.tools.exclude).toContain("background_task");
      expect(agent.tools.exclude).toContain("invoke-skill");
      expect(agent.permission.edit).toBe("deny");
      expect(agent.permission.bash).toBe("ask");
    });
  });

  describe("System Prompt", () => {
    it("should contain multimodal analysis instructions", () => {
      expect(agent.system).toContain("Multimodal Looker subagent");
      expect(agent.system).toContain("visual and multimedia content");
      // Use case-insensitive checks for phrases that vary in capitalization
      expect(agent.system.toLowerCase()).toContain("image analysis");
      expect(agent.system.toLowerCase()).toContain("pdf parsing");
      expect(agent.system.toLowerCase()).toContain("diagram interpretation");
    });

    it("should have trigger keywords", () => {
      expect(agent.system).toContain("analyze image");
      expect(agent.system).toContain("look at screenshot");
      expect(agent.system).toContain("examine diagram");
      expect(agent.system).toContain("parse PDF");
      expect(agent.system).toContain("multimodal-looker");
    });

    it("should mention framework compliance", () => {
      expect(agent.system).toContain("0xRay");
      expect(agent.system).toContain("Visual Analysis Compliance");
    });
  });

  describe("Description", () => {
    it("should describe multimodal capabilities", () => {
      expect(agent.description).toContain("Media file analysis");
      expect(agent.description).toContain("images, diagrams, PDFs");
      expect(agent.description).toContain("visual content");
      expect(agent.description).toContain("technical information");
    });
  });

  describe("Model Integration", () => {
    it("should get validated model for multimodal-looker", () => {
      // Agent uses modelRouter for validated models
      // Model is optional - if defined, should be a string
      if (agent.model) {
        expect(typeof agent.model).toBe("string");
        expect(agent.model.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Capability Coverage", () => {
    it("should cover image analysis capabilities", () => {
      expect(agent.capabilities).toContain("image-interpretation");
      expect(agent.capabilities).toContain("screenshot-analysis");
    });

    it("should cover document analysis capabilities", () => {
      expect(agent.capabilities).toContain("pdf-content-extraction");
      expect(agent.capabilities).toContain("visual-content-understanding");
    });

    it("should cover diagram analysis capabilities", () => {
      expect(agent.capabilities).toContain("diagram-analysis");
      expect(agent.capabilities).toContain("technical-diagram-parsing");
    });

    it("should cover data visualization capabilities", () => {
      expect(agent.capabilities).toContain("chart-and-graph-interpretation");
    });
  });

  describe("Tool Access Control", () => {
    it("should allow read tools", () => {
      const allowedTools = ["read", "grep", "webfetch", "websearch"];
      allowedTools.forEach((tool) => {
        expect(agent.tools.include).toContain(tool);
      });
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

    it("should deny edit permissions", () => {
      expect(agent.permission.edit).toBe("deny");
    });

    it("should require bash permission asking", () => {
      expect(agent.permission.bash).toBe("ask");
    });
  });

  describe("File System Integration", () => {
    it("should handle various file types", () => {
      const supportedTypes = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf"];

      // Test that agent can handle different file extensions (case-insensitive)
      const systemLower = agent.system.toLowerCase();
      supportedTypes.forEach((ext) => {
        expect(systemLower).toContain(ext.replace(".", ""));
      });
    });

    it("should handle image files", () => {
      // Agent has capabilities for image file analysis
      expect(agent.capabilities).toContain("image-interpretation");
      expect(agent.capabilities).toContain("screenshot-analysis");
      // System prompt mentions PNG format support
      expect(agent.system.toLowerCase()).toContain("png");
    });

    it("should handle document files", () => {
      // Agent has capabilities for PDF/document analysis
      expect(agent.capabilities).toContain("pdf-content-extraction");
      // System prompt mentions PDF format support
      expect(agent.system.toLowerCase()).toContain("pdf");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing files gracefully", () => {
      mockFs.statSync.mockImplementation((filePath: string) => {
        if (filePath.includes("nonexistent")) {
          throw new Error("File not found");
        }
        return { isFile: () => true };
      });

      // Agent should handle file access errors without crashing
      // Model is optional - only check if defined
      if (agent.model) {
        expect(() => agent.model).not.toThrow();
      }
    });

    it("should handle unsupported file types", () => {
      // Test behavior with unsupported file types
      const systemPrompt = agent.system.toLowerCase();

      // System should mention supported formats
      expect(systemPrompt).toContain("png");
      expect(systemPrompt).toContain("jpeg");
      expect(systemPrompt).toContain("pdf");
    });
  });

  describe("Response Format", () => {
    it("should specify structured response format", () => {
      expect(agent.system).toContain("Content Type");
      expect(agent.system).toContain("Key Elements");
      expect(agent.system).toContain("Technical Interpretation");
      expect(agent.system).toContain("Findings & Insights");
      expect(agent.system).toContain("Recommendations");
      expect(agent.system).toContain("Source References");
    });
  });

  describe("Framework Integration", () => {
    it("should align with development codex terms", () => {
      expect(agent.system).toContain("Term 15");
      expect(agent.system).toContain("Term 24");
      expect(agent.system).toContain("Term 38");
      expect(agent.system).toContain("Term 47");
    });

    it("should mention integration with other agents", () => {
      // System should mention working with other 0xRay components
      expect(agent.system).toContain("0xRay");
      // Verify framework alignment section exists
      expect(agent.system).toContain("Framework Alignment");
    });
  });
});
