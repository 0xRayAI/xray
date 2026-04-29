import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";
import {
  detectProjectLanguage,
  getTestFilePath,
  buildTestCommand,
} from "../../utils/language-detector.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TestExecutionProcessor extends PreProcessor {
  readonly name = "testExecution";
  readonly priority = 10;

  protected async run(context: ProcessorContext): Promise<Record<string, unknown>> {
    frameworkLogger.log("test-execution-processor", "executing", "info", {
      message: "Running auto-generated tests...",
    });

    try {
      const cwd = context.directory || process.cwd();
      const projectLanguage = detectProjectLanguage(cwd);

      if (!projectLanguage) {
        frameworkLogger.log("test-execution-processor", "language-detection-failed", "info", {
          message: "Could not detect project language, falling back to TypeScript",
        });
        return this.executeTypeScriptTests(context as any, cwd);
      }

      frameworkLogger.log("test-execution-processor", "language-detected", "info", {
        language: projectLanguage.language,
        testFramework: projectLanguage.testFramework,
      });

      if (projectLanguage.language === "TypeScript" || projectLanguage.language === "JavaScript") {
        return this.executeTypeScriptTests(context as any, cwd);
      }

      return this.executeGenericTests(context as any, cwd, projectLanguage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      frameworkLogger.log("test-execution-processor", "error", "error", {
        message: `Test execution failed: ${errorMessage}`,
      });
      return { testsExecuted: 0, passed: 0, failed: 0, error: errorMessage, success: false };
    }
  }

  private async executeTypeScriptTests(context: any, cwd: string): Promise<any> {
    let testPattern = "";

    if (context.filePath) {
      const testFilePath = context.filePath
        .replace(/\/src\//, "/src/__tests__/")
        .replace(/\.ts$/, ".test.ts");

      const fs = await import("fs");
      if (fs.existsSync(testFilePath)) {
        testPattern = testFilePath;
      }
    }

    const command = testPattern ? `npx vitest run "${testPattern}"` : `npx vitest run`;

    frameworkLogger.log("test-execution-processor", "running-tests", "info", { command, cwd });
    return this.runTestCommand(command, cwd);
  }

  private async executeGenericTests(context: any, cwd: string, projectLanguage: any): Promise<any> {
    let testFilePath: string | undefined;

    if (context.filePath) {
      testFilePath = getTestFilePath(context.filePath, projectLanguage);
      const fs = await import("fs");
      if (!fs.existsSync(testFilePath!)) {
        frameworkLogger.log("test-execution-processor", "test-file-not-found", "info", {
          sourceFile: context.filePath,
        });
        testFilePath = undefined;
      }
    }

    const command = buildTestCommand(projectLanguage, testFilePath);
    frameworkLogger.log("test-execution-processor", "running-generic-tests", "info", {
      command,
      cwd,
      language: projectLanguage.language,
    });
    return this.runTestCommand(command, cwd);
  }

  private async runTestCommand(command: string, cwd: string): Promise<any> {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const result = await execAsync(command, { cwd, timeout: 120000 });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError: any) {
      exitCode = execError.code || 1;
      stdout = execError.stdout || "";
      stderr = execError.stderr || "";
    }

    const actualPassed = this.parseTestOutput(stdout, "passed");
    const actualFailed = this.parseTestOutput(stdout, "failed");

    const result = {
      testsExecuted: actualPassed + actualFailed,
      passed: actualPassed,
      failed: actualFailed,
      exitCode,
      output: stdout.substring(0, 2000),
      success: exitCode === 0,
    };

    frameworkLogger.log("test-execution-processor", "completed", result.success ? "success" : "error", result);
    return result;
  }

  private parseTestOutput(output: string, type: "passed" | "failed"): number {
    const patterns = [
      new RegExp(`(\\d+)\\s+${type}`, "gi"),
      new RegExp(`Tests?:\\s+\\d+\\s+passed,\\s+(\\d+)\\s+failed`, "gi"),
      new RegExp(`(\\d+)\\s+passed,\\s+(\\d+)\\s+failed`, "gi"),
      new RegExp(`tests="(\\d+)"\\s+failures="(\\d+)"`, "gi"),
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        if (type === "passed") {
          if (match[0].includes("passed") && match[0].includes("failed")) {
            const passedMatch = match[0].match(/(\d+)\s+passed/);
            return passedMatch ? parseInt(passedMatch[1] || "0") : 0;
          }
          const count = match[0].match(/(\d+)/);
          return count ? parseInt(count[1] || "0") : 0;
        } else {
          if (match[0].includes("passed") && match[0].includes("failed")) {
            const failedMatch = match[0].match(/(\d+)\s+failed/);
            return failedMatch ? parseInt(failedMatch[1] || "0") : 0;
          }
          const count = match[0].match(/failures="(\d+)"/);
          return count ? parseInt(count[1] || "0") : 0;
        }
      }
    }

    return 0;
  }
}
