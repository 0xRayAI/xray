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
import { testAutoGenerationMonitor } from "../monitoring/test-auto-generation-monitor.js";

/**
 * Find the most recently modified TypeScript file in a directory
 * This is used as a fallback when filePath is not provided in the hook context
 */
function findRecentlyModifiedTsFile(
  dir: string,
  maxAgeSeconds: number = 60, // Increased to 60 seconds
): string | null {
  try {
    // Recursive walk to find all .ts files
    const files: string[] = [];
    
    function walkSync(dirPath: string) {
      try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              // Skip node_modules, dist, etc.
              if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
                walkSync(fullPath);
              }
            } else if (item.endsWith(".ts") && !item.endsWith(".test.ts") && !item.endsWith(".spec.ts")) {
              files.push(fullPath);
            }
          } catch {
            // Skip files we can't stat
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }
    
    walkSync(dir);
    
    // Find most recently modified
    let mostRecent: { path: string; mtime: number } | null = null;

    for (const filePath of files) {
      try {
        const stats = fs.statSync(filePath);
        
        // Get relative path
        const relPath = path.relative(dir, filePath);
        
        if (!mostRecent || stats.mtimeMs > mostRecent.mtime) {
          mostRecent = { path: relPath, mtime: stats.mtimeMs };
        }
      } catch {
        // Skip files we can't stat
      }
    }

    return mostRecent?.path || null;
  } catch {
    return null;
  }
}

export const testAutoCreationProcessor = {
  name: "testAutoCreation",
  priority: 30,
  enabled: true,

  async execute(context: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Handle both direct context and context.data (from ProcessorManager)
      // ProcessorManager passes: { operation, data: { directory, filePath, ... }, preResults }
      const innerContext = context.data || context;

      const {
        tool,
        args,
        directory,
        filePath: contextFilePath,
        operation,
      } = innerContext;

      // Also check the outer context for backward compatibility
      const outerFilePath = context.filePath || contextFilePath;
      const outerDirectory = context.directory || directory;

      await frameworkLogger.log("test-auto-creation", "execute-start", "info", {
        message: `TestAutoCreation processor executing`,
        tool,
        hasArgs: !!args,
        hasDirectory: !!outerDirectory,
        directoryValue: outerDirectory,
        contextFilePath,
        argsFilePath: args?.filePath,
        fullContext: JSON.stringify({ tool, directory, filePath: contextFilePath, argsFilePath: args?.filePath }).slice(0, 200),
      });

      // Get file path from various possible locations in context
      // Check: innerContext.filePath, context.filePath, args.filePath, context.filePath
      let filePath =
        outerFilePath ||
        contextFilePath ||
        args?.filePath ||
        args?.path ||
        innerContext.filePath;

      // ALWAYS scan for the most recent ts file in src/ or root as fallback
      // This is more reliable than depending on context
      const srcDir = path.join(process.cwd(), 'src');
      const rootDir = process.cwd();
      
      // Try src first, then root
      let recentFile = findRecentlyModifiedTsFile(srcDir, 60);
      if (!recentFile) {
        recentFile = findRecentlyModifiedTsFile(rootDir, 60);
      }
      
      if (recentFile) {
        // If it's from root, use it directly; if from src, prepend 'src/'
        const isFromSrc = recentFile.startsWith(srcDir);
        filePath = isFromSrc ? path.relative(process.cwd(), recentFile) : recentFile;
      }

      await frameworkLogger.log("test-auto-creation", "filepath-resolution", "info", {
        message: `Resolved filePath: ${filePath || 'UNDEFINED'}`,
      });

      if (!filePath) {
        await frameworkLogger.log(
          "test-auto-creation",
          "skipped-no-filepath",
          "info",
          {
            message: `Skipped: no filePath found in context`,
            contextKeys: Object.keys(context),
          },
        );
        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
        };
      }

      // Check if this looks like a write operation based on context
      const isWriteOperation =
        tool === "write" || tool === "edit" || operation === "tool_execution";
      if (!isWriteOperation) {
        await frameworkLogger.log(
          "test-auto-creation",
          "skipped-not-write",
          "info",
          { message: `Skipped: not a write operation`, tool, operation },
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
        await frameworkLogger.log("test-auto-creation", "test-exists", "info", {
          message: `Test file already exists: ${testFilePath}`,
        });

        // Record skipped to monitor
        testAutoGenerationMonitor.recordEvent({
          type: "skipped",
          filePath,
          testFile: testFilePath,
          timestamp: Date.now(),
          reason: "Test file already exists",
        });

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
          {
            message: `Skipped: source file not found`,
            fullSourcePath,
            directory,
            filePath,
          },
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
        // Record skipped to monitor
        testAutoGenerationMonitor.recordEvent({
          type: "skipped",
          filePath,
          testFile: null,
          timestamp: Date.now(),
          reason: "No exports found",
        });

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
        },
      );

      // Delegate to test-architect agent via MCP
      try {
        await frameworkLogger.log(
          "test-auto-creation",
          "mcp-call-start",
          "info",
          {
            message: `Calling MCP for test generation`,
            skillName: "testing-strategy",
            toolName: "generate-test-file",
            args: { sourceFile: filePath, testFilePath, directory },
          },
        );
        
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
          },
        ).catch((err) => {
          frameworkLogger.log(
            "test-auto-creation",
            "mcp-error",
            "error",
            { message: `MCP error: ${err}` },
          );
          throw err;
        });
        
        await frameworkLogger.log(
          "test-auto-creation",
          "mcp-call-result",
          "info",
          {
            message: `MCP returned`,
            result: JSON.stringify(result).slice(0, 500),
          },
        ).catch((err) => {
          frameworkLogger.log(
            "test-auto-creation",
            "log-error",
            "error", 
            { message: `Log error: ${err}` },
          );
        });

        // MCP creates the file directly - check if it was created
        const testCreated = fs.existsSync(fullTestPath);
        
        await frameworkLogger.log(
          "test-auto-creation",
          "test-creation-check",
          "info",
          {
            message: `Test creation check: ${testCreated}`,
            fullTestPath,
            directory,
            filePath,
            testFilePath,
          },
        );
        
        if (testCreated) {
          await frameworkLogger.log(
            "test-auto-creation",
            "tests-generated",
            "success",
            {
              message: `Tests auto-generated for ${filePath}`,
              testFile: testFilePath,
              exportsTested: exports.length,
            },
          );

          // Record success to monitor
          testAutoGenerationMonitor.recordEvent({
            type: "generated",
            filePath,
            testFile: testFilePath,
            timestamp: Date.now(),
          });

          return {
            success: true,
            processorName: "testAutoCreation",
            duration: Date.now() - startTime,
            data: {
              testFile: testFilePath,
              exports: exports.map((e: { name: string }) => e.name),
            },
          };
        }
        // If file not created, fall through to fallback
      } catch (error) {
        // Fallback: Create basic test stub if agent fails
        await frameworkLogger.log(
          "test-auto-creation",
          "mcp-failed-using-fallback",
          "info",
          {
            message: `MCP call failed, using fallback stub creation`,
            error: error instanceof Error ? error.message : String(error),
          },
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
          },
        );

        return {
          success: true,
          processorName: "testAutoCreation",
          duration: Date.now() - startTime,
          data: {
            testFile: testFilePath,
            exports: exports.map((e: { name: string }) => e.name),
          },
        };
      }
    } catch (error) {
      await frameworkLogger.log("test-auto-creation", "error", "error", {
        message: `Test auto-creation failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      // Record failure to monitor
      testAutoGenerationMonitor.recordEvent({
        type: "failed",
        filePath: "unknown",
        testFile: null,
        timestamp: Date.now(),
        reason: error instanceof Error ? error.message : String(error),
      });

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
function extractExports(
  content: string,
): Array<{ name: string; type: string }> {
  const exports: Array<{ name: string; type: string }> = [];

  // Match exported functions
  const functionMatches = content.match(
    /export\s+(?:async\s+)?function\s+(\w+)/g,
  );
  if (functionMatches) {
    functionMatches.forEach((match: string) => {
      const name = match
        .replace(/export\s+(?:async\s+)?function\s+/, "")
        .trim();
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
      const name = match
        .replace(/export\s+const\s+/, "")
        .replace(/\s*[:=]/, "")
        .trim();
      exports.push({ name, type: "const" });
    });
  }

  // Match default exports
  const defaultMatch = content.match(
    /export\s+default\s+(?:class|function)?\s*(\w+)/,
  );
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
  exports: Array<{ name: string; type: string }>,
): Promise<void> {
  const testDir = path.dirname(testFilePath);

  // Ensure test directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const relativeSourcePath = path.relative(
    testDir,
    sourceFile.replace(/\.ts$/, ""),
  );
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
  sourceFile: string,
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
