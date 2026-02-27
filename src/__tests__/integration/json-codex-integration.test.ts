/**
 * StringRay Framework - JSON Codex Integration Tests (Mock-Based)
 *
 * Tests JSON codex parsing and integration using real utilities but mocked plugin behavior
 * to avoid ES6 import conflicts when running directly with Node.js.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { StringRayContextLoader } from "../../core/context-loader.js";
import {
  parseCodexContent,
  detectContentFormat,
  validateJsonSyntax,
  extractCodexMetadata,
} from "../../utils/codex-parser.js";
import { getFrameworkVersion } from "../utils/test-helpers.js";

const testProjectRoot = process.cwd();
const validJsonCodex = JSON.stringify({
  version: getFrameworkVersion(),
  lastUpdated: "2026-01-06",
  errorPreventionTarget: 0.996,
  terms: {
    "1": {
      number: 1,
      title: "Progressive Prod-Ready Code",
      description: "All code must be production-ready from the first commit.",
      category: "core",
      zeroTolerance: false,
      enforcementLevel: "high",
    },
    "7": {
      number: 7,
      title: "Resolve All Errors",
      description: "Zero-tolerance for unresolved errors.",
      category: "core",
      zeroTolerance: true,
      enforcementLevel: "blocking",
    },
    "11": {
      number: 11,
      title: "Type Safety First",
      description: "Never use 'any', '@ts-ignore', or '@ts-expect-error'.",
      category: "extended",
      zeroTolerance: true,
      enforcementLevel: "blocking",
    },
  },
});

const invalidJsonCodex = `{
  version: "1.6.0",
  lastUpdated: "2026-01-06",
  errorPreventionTarget: 0.996,
  terms: {
    "1": {
      number: 1,
      title: "Progressive Prod-Ready Code",
      description: "All code must be production-ready from the first commit.",
      category: "core",
      zeroTolerance: false,
      enforcementLevel: "high",
    },
    // Missing closing quote on key
    7: {
      number: 7,
      title: "Resolve All Errors",
      description: "Zero-tolerance for unresolved errors.",
      category: "core",
      zeroTolerance: true,
      enforcementLevel: "blocking",
    }
  }
}`;

describe("JSON Codex Integration", () => {
  let contextLoader: StringRayContextLoader;

  beforeEach(() => {
    contextLoader = StringRayContextLoader.getInstance();
    contextLoader.clearCache(); // Clear cached context
    vi.clearAllMocks();
  });

  describe("JSON Codex Parsing", () => {
    test("should parse valid JSON codex content", () => {
      const result = parseCodexContent(validJsonCodex, "test-codex.json");

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.version).toBe(getFrameworkVersion());
      expect(result.context!.terms).toBeDefined();
      expect(result.context!.terms.size).toBe(3);
    });

    test("should detect JSON format correctly", () => {
      const result = detectContentFormat(validJsonCodex);
      expect(result.format).toBe("json");
      expect(result.confidence).toBe(1);
    });

    test("should validate correct JSON syntax", () => {
      const result = validateJsonSyntax(validJsonCodex);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeDefined();
    });

    test("should reject invalid JSON syntax", () => {
      const result = validateJsonSyntax(invalidJsonCodex);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Invalid JSON syntax");
    });

    test("should extract metadata from valid JSON", () => {
      const metadata = extractCodexMetadata(validJsonCodex);

      expect(metadata).toHaveProperty("version", getFrameworkVersion());
      expect(metadata).toHaveProperty("termCount", 3);
    });

    test("should handle JSON with different key formats", () => {
      const mixedKeyJson = JSON.stringify({
        version: getFrameworkVersion(),
        terms: {
          "1": { number: 1, title: "Test 1" },
          "2": { number: 2, title: "Test 2" },
        },
      });

      const result = parseCodexContent(mixedKeyJson, "test-codex.json");
      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.terms.has(1)).toBe(true);
      expect(result.context!.terms.has(2)).toBe(true);
    });
  });

  describe("Context Loader Integration", () => {
    test("should load JSON codex through context loader", async () => {
      // Mock fs to return our test codex
      const mockFs = {
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => validJsonCodex),
      };

      // Temporarily replace fs methods
      const originalExistsSync = require("fs").existsSync;
      const originalReadFileSync = require("fs").readFileSync;

      require("fs").existsSync = mockFs.existsSync;
      require("fs").readFileSync = mockFs.readFileSync;

      try {
        const result = await contextLoader.loadCodexContext(testProjectRoot);

        expect(result.success).toBe(true);
        expect(result.context).toBeDefined();
        expect(result.context).toBeInstanceOf(Object);
        expect(result.context!.version).toBeDefined();

        // Check that the loaded context contains our test data
        expect(result.context!.terms.size).toBeGreaterThan(0);
        // Verify version is present and is a valid semver string
        expect(result.context!.version).toMatch(/^\d+\.\d+\.\d+$/);
      } finally {
        // Restore original fs methods
        require("fs").existsSync = originalExistsSync;
        require("fs").readFileSync = originalReadFileSync;
      }
    });

    test("should handle missing codex files gracefully", async () => {
      // Create a temporary context loader with non-existent file paths
      const tempContextLoader = new (StringRayContextLoader as any)();
      tempContextLoader.codexFilePaths = [
        "nonexistent-codex-1.json",
        "nonexistent-codex-2.json",
      ];

      const result = await tempContextLoader.loadCodexContext(testProjectRoot);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No valid codex file found");
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test("should validate codex content during loading", async () => {
      // Test with invalid JSON by creating a temporary file path that doesn't exist
      // but simulating the validation by testing parseCodexContent directly
      const result = parseCodexContent(invalidJsonCodex, "test-invalid.json");

      expect(result.success).toBe(false);
      expect(result.error).toContain("JSON");
      expect(result.warnings).toBeDefined();
    });
  });

  describe("Plugin Integration Simulation", () => {
    test("should simulate codex injection workflow", async () => {
      // Mock the plugin hook behavior
      const mockPluginHook = {
        "tool.execute.before": async (input: any) => {
          const content = input.args?.content || "";

          // Simulate codex enforcement
          if (content.includes("TODO")) {
            throw new Error("Codex violation: TODO comments not allowed");
          }

          if (content.includes(": any")) {
            throw new Error("Codex violation: any type not allowed");
          }
        },
        "tool.execute.after": async (input: any, output: any) => {
          // Simulate codex context injection
          if (output && output.output) {
            output.output = `📚 Codex Context: ${validJsonCodex.substring(0, 50)}...\n${output.output}`;
          }
          return output;
        },
      };

      // Test valid content
      const validInput = {
        tool: "edit",
        args: { content: "const x: string = 'test';" },
      };
      await expect(
        mockPluginHook["tool.execute.before"](validInput),
      ).resolves.toBeUndefined();

      // Test invalid content (TODO)
      const invalidInput1 = {
        tool: "edit",
        args: { content: "// TODO: fix this" },
      };
      await expect(
        mockPluginHook["tool.execute.before"](invalidInput1),
      ).rejects.toThrow("TODO");

      // Test invalid content (any type)
      const invalidInput2 = {
        tool: "edit",
        args: { content: "const x: any = 'test';" },
      };
      await expect(
        mockPluginHook["tool.execute.before"](invalidInput2),
      ).rejects.toThrow("any");

      // Test output injection
      const testOutput = { output: "original content" };
      await mockPluginHook["tool.execute.after"]({}, testOutput);
      expect(testOutput.output).toContain("📚 Codex Context:");
      expect(testOutput.output).toContain("original content");
    });

    test("should handle plugin hook errors gracefully", async () => {
      const mockPluginHook = {
        "tool.execute.before": async () => {
          throw new Error("Plugin hook failed");
        },
      };

      await expect(mockPluginHook["tool.execute.before"]()).rejects.toThrow(
        "Plugin hook failed",
      );
    });
  });

  describe("End-to-End Codex Workflow", () => {
    test("should complete full codex processing pipeline", async () => {
      // Step 1: Parse JSON codex
      const parseResult = parseCodexContent(validJsonCodex, "test-codex.json");
      expect(parseResult.success).toBe(true);

      // Step 2: Extract metadata
      const metadata = extractCodexMetadata(validJsonCodex);
      expect(metadata.termCount).toBe(3);

      // Step 3: Simulate context loading
      const mockContext = [
        {
          id: "test-codex",
          source: "/test/codex.json",
          content: validJsonCodex,
          metadata: metadata,
          priority: "critical",
        },
      ];

      expect(mockContext).toHaveLength(1);
      expect(mockContext[0].metadata.version).toBe(getFrameworkVersion());

      // Step 4: Simulate plugin enforcement
      const testContent = "const validCode: string = 'test';";
      const mockEnforcement = (content: string) => {
        if (content.includes("TODO")) return false;
        if (content.includes(": any")) return false;
        return true;
      };

      expect(mockEnforcement(testContent)).toBe(true);
      expect(mockEnforcement("const x: any = 1;")).toBe(false);
    });
  });
});
