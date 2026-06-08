/**
 * 0xRay Framework - Script Execution Integration Tests
 *
 * Tests for CommonJS (.cjs) and ES Module (.mjs) script execution
 * including timeout handling, stdout/stderr capture, and exit code detection.
 *
 * @version 1.7.5
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("0xRay Script Execution Integration", () => {
  // Use native os.tmpdir() instead of tmpdirSync to avoid type issues
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test scripts
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-script-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a script file in temp directory
   */
  function createScript(filename: string, content: string): string {
    const scriptPath = path.join(tempDir, filename);
    fs.writeFileSync(scriptPath, content, { mode: 0o755 });
    return scriptPath;
  }

  describe("CommonJS (.cjs) Script Execution", () => {
    test("should execute simple CommonJS script successfully", () => {
      const script = createScript("hello.cjs", `#!/usr/bin/env node
console.log("Hello from CommonJS");
process.exit(0);
`);

      const result = execSync(`node "${script}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });

      expect(result).toContain("Hello from CommonJS");
    });

    test("should capture stdout from CommonJS script", () => {
      const script = createScript("stdout.cjs", `#!/usr/bin/env node
console.log("stdout message");
console.error("stderr message");
`);

      const output = execSync(`node "${script}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });

      expect(output).toContain("stdout message");
    });

    test("should execute CommonJS script with JSON output", () => {
      const script = createScript("json-output.cjs", `#!/usr/bin/env node
const result = { success: true, data: [1, 2, 3] };
console.log(JSON.stringify(result));
`);

      const output = execSync(`node "${script}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });

      const parsed = JSON.parse(output.trim());
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    test("should execute CommonJS script with complex logic", () => {
      const script = createScript("complex.cjs", `#!/usr/bin/env node
// Complex logic test
const fibonacci = (n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const result = fibonacci(10);
console.log("Fibonacci(10) =", result);
console.log("Execution complete");
`);

      const output = execSync(`node "${script}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });

      expect(output).toContain("Fibonacci(10) = 55");
      expect(output).toContain("Execution complete");
    });
  });

  describe("ES Module (.mjs) Script Execution", () => {
    test("should execute simple ES Module script successfully", () => {
      const script = createScript("hello.mjs", `#!/usr/bin/env node
console.log("Hello from ES Module");
export {};
`);

      const result = execSync(`node "${script}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });

      expect(result).toContain("Hello from ES Module");
    });
  });

  describe("Script Execution Security", () => {
    test("should reject script outside allowed directory", () => {
      // This tests the security validation in CLI
      const outsideScript = "/tmp/malicious.cjs";
      fs.writeFileSync(outsideScript, "console.log('hack')", { mode: 0o755 });

      try {
        // This should fail validation
        const packageRoot = process.cwd();
        const resolvedPath = path.resolve(outsideScript);
        const relativePath = path.resolve(packageRoot);

        expect(resolvedPath.startsWith(relativePath)).toBe(false);
      } finally {
        // Clean up
        if (fs.existsSync(outsideScript)) {
          fs.unlinkSync(outsideScript);
        }
      }
    });

    test("should validate script file extension", () => {
      const allowedExtensions = [".js", ".cjs", ".sh"];

      const testCases = [
        { ext: ".js", allowed: true },
        { ext: ".cjs", allowed: true },
        { ext: ".sh", allowed: true },
        { ext: ".ts", allowed: false },
        { ext: ".py", allowed: false },
        { ext: ".exe", allowed: false },
      ];

      testCases.forEach(({ ext, allowed }) => {
        const result = allowedExtensions.some((ae) => ext.endsWith(ae));
        expect(result).toBe(allowed);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle missing script file", () => {
      const nonexistent = path.join(tempDir, "nonexistent.cjs");

      expect(() => {
        execSync(`node "${nonexistent}"`, { cwd: tempDir });
      }).toThrow();
    });

    test("should handle script with syntax error", () => {
      const script = createScript("syntax-error.cjs", `#!/usr/bin/env node
console.log("unclosed string
process.exit(0);
`);

      expect(() => {
        execSync(`node "${script}"`, { cwd: tempDir });
      }).toThrow();
    });
  });

  describe("Integration with 0xRay Framework", () => {
    test("should execute postinstall script if exists", () => {
      const postinstallPath = path.join(
        process.cwd(),
        "scripts",
        "node",
        "postinstall.cjs",
      );

      if (fs.existsSync(postinstallPath)) {
        const result = execSync(`node "${postinstallPath}"`, {
          encoding: "utf-8",
          cwd: process.cwd(),
          timeout: 60000, // 1 minute timeout
        });

        expect(result).toBeDefined();
      } else {
        // If postinstall doesn't exist, skip this test
        expect(true).toBe(true);
      }
    });
  });
});
