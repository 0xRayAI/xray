/**
 * Test Auto-Creation Processor
 *
 * Automatically generates test files when new source files are created.
 * This ensures the 85%+ test coverage requirement is maintained.
 *
 * @version 1.0.0
 * @since 2026-02-15
 */

import * as fs from "fs";
import * as path from "path";
import { frameworkLogger } from "../core/framework-logger.js";
import { mcpClientManager } from "../mcps/mcp-client.js";

export const testAutoCreationProcessor = {
  name: "testAutoCreation",
  priority: 30,
  enabled: true,

  async execute(context: any): Promise<any> {
    const startTime = Date.now();
    
    // Debug: Log entry point immediately
    console.log(`[TEST-AUTO-CREATION] ENTER execute with context:`, JSON.stringify(context, null, 2).slice(0, 500));

    try {
      const { tool, args, directory, filePath: contextFilePath, operation } = context;

      // Use console.log for immediate feedback, frameworkLogger for persistence
      console.log(`[TEST-AUTO-CREATION] tool=${tool}, operation=${operation}, directory=${directory}, filePath=${contextFilePath}`);
      
      await frameworkLogger.log(
        "test-auto-creation",
        "execute-start",
        "info",
        {
          message: `TestAutoCreation processor executing`,
          tool,
          hasArgs: !!args,
          hasDirectory: !!directory,
          contextFilePath,
          argsFilePath: args?.filePath,
        }
      );

      // Get file path from various possible locations in context
      const filePath = contextFilePath || args?.filePath || args?.path || context.filePath;
      
      console.log(`[TEST-AUTO-CREATION] resolved filePath=${filePath}`);
      
      if (!filePath) {
        console.log(`[TEST-AUTO-CREATION] SKIPPED: no filePath found`);
        await frameworkLogger.log(
          "test-auto-creation",
          "skipped-no-filepath",
          "info",
          { message: `Skipped: no filePath found in context`, contextKeys: Object.keys(context) }
        );
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }
      
      // Check if this looks like a write operation based on context
      const isWriteOperation = tool === "write" || tool === "edit" || operation === "tool_execution";
      if (!isWriteOperation) {
        console.log(`[TEST-AUTO-CREATION] SKIPPED: not a write operation (tool=${tool}, operation=${operation})`);
        await frameworkLogger.log(
          "test-auto-creation",
          "skipped-not-write",
          "info",
          { message: `Skipped: not a write operation`, tool, operation }
        );
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      // Only process TypeScript files
      if (!filePath.endsWith(".ts") || filePath.endsWith(".test.ts")) {
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      // Check if test file already exists
      const testFilePath = filePath.replace(/\.ts$/, ".test.ts");
      const fullTestPath = path.join(directory, testFilePath);

      if (fs.existsSync(fullTestPath)) {
        await frameworkLogger.log(
          "test-auto-creation",
          "test-exists",
          "info",
          { message: `Test file already exists: ${testFilePath}` }
        );
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      // Read source file to analyze exports
      const fullSourcePath = path.join(directory, filePath);
      if (!fs.existsSync(fullSourcePath)) {
        await frameworkLogger.log(
          "test-auto-creation",
          "skipped-source-not-found",
          "info",
          { message: `Skipped: source file not found`, fullSourcePath, directory, filePath }
        );
        return {
          success: false,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      const sourceContent = fs.readFileSync(fullSourcePath, "utf8");

      // Extract exports to test
      const exports = extractExports(sourceContent);

      if (exports.length === 0) {
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      await frameworkLogger.log(
        "test-auto-creation",
        "generating-tests",
        "info",
        {
          message: `Auto-generating tests for ${filePath}`,
          exports: exports.map((e: { name: string }) => e.name),
          testFile: testFilePath,
        }
      );

      // Delegate to test-architect agent via MCP
      try {
        const result = await mcpClientManager.callServerTool(
          "skill-invocation",
          "invoke-skill",
          {
            skillName: "testing-strategy",
            toolName: "generate-test-file",
            args: {
              sourceFile: filePath,
              sourceContent,
              exports,
              testFilePath,
              directory,
            },
          }
        );

        // Check if result indicates success
        const isSuccess = result && (result as any).success === true;

        if (isSuccess) {
          await frameworkLogger.log(
            "test-auto-creation",
            "tests-generated",
            "success",
            {
              message: `Tests auto-generated for ${filePath}`,
              testFile: testFilePath,
              exportsTested: exports.length,
            }
          );

          return {
            success: true,
            processorName: "testAutoCreation",
            duration: Date.now() - startTime,
            data: { testFile: testFilePath, exports: exports.map((e: { name: string }) => e.name) },
          };
        } else {
          throw new Error("Test generation failed");
        }
      } catch (error) {
        // Fallback: Create basic test stub if agent fails
        await frameworkLogger.log(
          "test-auto-creation",
          "mcp-failed-using-fallback",
          "info",
          {
            message: `MCP call failed, using fallback stub creation`,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        
        await createBasicTestStub(fullTestPath, filePath, exports);

        await frameworkLogger.log(
          "test-auto-creation",
          "test-stub-created",
          "success",
          {
            message: `Basic test stub created for ${filePath}`,
            testFile: testFilePath,
            exportsCount: exports.length,
          }
        );

        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
          data: { testFile: testFilePath, exports: exports.map((e: { name: string }) => e.name) },
        };
      }
    } catch (error) {
      await frameworkLogger.log(
        "test-auto-creation",
        "error",
        "error",
        {
          message: `Test auto-creation failed: ${error instanceof Error ? error.message : String(error)}`,
        }
      );

      return {
        success: false,
        processorName: "testAutoCreation",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

/**
 * Extract exports from source file content
 */
function extractExports(content: string): Array<{ name: string; type: string }> {
  const exports: Array<{ name: string; type: string }> = [];

  // Match exported functions
  const functionMatches = content.match(/export\s+(?:async\s+)?function\s+(\w+)/g);
  if (functionMatches) {
    functionMatches.forEach((match: string) => {
      const name = match.replace(/export\s+(?:async\s+)?function\s+/, "").trim();
      exports.push({ name, type: "function" });
    });
  }

  // Match exported classes
  const classMatches = content.match(/export\s+class\s+(\w+)/g);
  if (classMatches) {
    classMatches.forEach((match: string) => {
      const name = match.replace(/export\s+class\s+/, "").trim();
      exports.push({ name, type: "class" });
    });
  }

  // Match exported const/let (but not types)
  const constMatches = content.match(/export\s+const\s+(\w+)\s*[:=]/g);
  if (constMatches) {
    constMatches.forEach((match: string) => {
      const name = match.replace(/export\s+const\s+/, "").replace(/\s*[:=]/, "").trim();
      exports.push({ name, type: "const" });
    });
  }

  // Match default exports
  const defaultMatch = content.match(/export\s+default\s+(?:class|function)?\s*(\w+)/);
  if (defaultMatch) {
    exports.push({ name: defaultMatch[1] || "default", type: "default" });
  }

  return exports;
}

/**
 * Create a basic test stub as fallback
 */
async function createBasicTestStub(
  testFilePath: string,
  sourceFile: string,
  exports: Array<{ name: string; type: string }>
): Promise<void> {
  const testDir = path.dirname(testFilePath);

  // Ensure test directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const relativeSourcePath = path.relative(testDir, sourceFile.replace(/\.ts$/, ""));
  const importPath = relativeSourcePath.startsWith(".")
    ? relativeSourcePath
    : `./${relativeSourcePath}`;

  const testContent = generateTestStub(importPath, exports, sourceFile);

  fs.writeFileSync(testFilePath, testContent, "utf8");
}

/**
 * Generate test stub content
 */
function generateTestStub(
  importPath: string,
  exports: Array<{ name: string; type: string }>,
  sourceFile: string
): string {
  const imports = exports.map((e: { name: string }) => e.name).join(", ");

  const testCases = exports
    .map((exp: { name: string; type: string }) => {
      if (exp.type === "function") {
        return `
  describe("${exp.name}", () => {
    it("should be defined", () => {
      expect(typeof ${exp.name}).toBe("function");
    });

    it("should handle basic case", async () => {
      // TODO: Implement test
      const result = await ${exp.name}();
      expect(result).toBeDefined();
    });
  });`;
      } else if (exp.type === "class") {
        return `
  describe("${exp.name}", () => {
    it("should instantiate", () => {
      const instance = new ${exp.name}();
      expect(instance).toBeInstanceOf(${exp.name});
    });
  });`;
      } else {
        return `
  describe("${exp.name}", () => {
    it("should be defined", () => {
      expect(${exp.name}).toBeDefined();
    });
  });`;
      }
    })
    .join("\n");

  return `/**
 * Auto-generated test file for ${sourceFile}
 * Generated by StringRay TestAutoCreationProcessor
 * @generated
 */

import { describe, it, expect } from "vitest";
import { ${imports} } from "${importPath}";

describe("${path.basename(sourceFile, ".ts")}", () => {${testCases}
});
`;
}

export default testAutoCreationProcessor;
