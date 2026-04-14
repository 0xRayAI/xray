/**
 * Processor Test Executor
 *
 * Extracted from ProcessorManager to handle test execution concerns:
 * - TypeScript/JavaScript test execution via Vitest
 * - Cross-language test execution via native test frameworks
 * - Test output parsing and result aggregation
 *
 * @version 1.0.0
 * @since 2026-04-14
 */

import { exec } from "child_process";
import { promisify } from "util";
import {
  detectProjectLanguage,
  getTestFilePath,
  buildTestCommand,
} from "../utils/language-detector.js";
import type { ProjectLanguage } from "../utils/language-detector.js";
import { frameworkLogger } from "../core/framework-logger.js";
import type { TestExecutionResult } from "./processor-types.js";

const execAsync = promisify(exec);

export interface TestExecutionContext {
  directory?: string;
  filePath?: string;
  tool?: string;
  operation?: string;
  args?: {
    filePath?: string;
    content?: string;
    operation?: string;
  };
}

export async function executeTestExecution(
  context: TestExecutionContext,
): Promise<TestExecutionResult> {
  frameworkLogger.log(
    "processor-manager",
    "executing automatic tests",
    "info",
    { message: "Running auto-generated tests..." },
  );

  try {
    const cwd = context.directory || process.cwd();
    const projectLanguage = detectProjectLanguage(cwd);

    if (!projectLanguage) {
      frameworkLogger.log(
        "processor-manager",
        "language-detection-failed",
        "info",
        {
          message:
            "Could not detect project language, falling back to TypeScript",
        },
      );
      return executeTypeScriptTests(context, cwd);
    }

    frameworkLogger.log("processor-manager", "language-detected", "info", {
      message: `Detected ${projectLanguage.language} project with ${projectLanguage.testFramework}`,
      language: projectLanguage.language,
      testFramework: projectLanguage.testFramework,
    });

    if (
      projectLanguage.language === "TypeScript" ||
      projectLanguage.language === "JavaScript"
    ) {
      return executeTypeScriptTests(context, cwd);
    }

    return executeGenericTests(context, cwd, projectLanguage);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    frameworkLogger.log(
      "processor-manager",
      "test-execution-error",
      "error",
      { message: `Test execution failed: ${errorMessage}` },
    );

    return {
      testsExecuted: 0,
      passed: 0,
      failed: 0,
      error: errorMessage,
      success: false,
    };
  }
}

export async function executeTypeScriptTests(
  context: TestExecutionContext,
  cwd: string,
): Promise<TestExecutionResult> {
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

  const command = testPattern
    ? `npx vitest run "${testPattern}"`
    : `npx vitest run`;

  frameworkLogger.log(
    "processor-manager",
    "running-typescript-tests",
    "info",
    { command, cwd },
  );

  return runTestCommand(command, cwd);
}

export async function executeGenericTests(
  context: TestExecutionContext,
  cwd: string,
  projectLanguage: ProjectLanguage,
): Promise<TestExecutionResult> {
  let testFilePath: string | undefined;

  if (context.filePath) {
    testFilePath = getTestFilePath(context.filePath, projectLanguage);

    const fs = await import("fs");
    if (!fs.existsSync(testFilePath)) {
      frameworkLogger.log(
        "processor-manager",
        "test-file-not-found",
        "info",
        {
          message: `Test file not found: ${testFilePath}`,
          sourceFile: context.filePath,
        },
      );
      testFilePath = undefined;
    }
  }

  const command = buildTestCommand(projectLanguage, testFilePath);

  frameworkLogger.log("processor-manager", "running-generic-tests", "info", {
    command,
    cwd,
    language: projectLanguage.language,
  });

  return runTestCommand(command, cwd);
}

export async function runTestCommand(
  command: string,
  cwd: string,
): Promise<TestExecutionResult> {
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const result = await execAsync(command, {
      cwd,
      timeout: 120000,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (execError: unknown) {
    const err = execError as { code?: number; stdout?: string; stderr?: string };
    exitCode = err.code || 1;
    stdout = err.stdout || "";
    stderr = err.stderr || "";
  }

  const actualPassed = parseTestOutput(stdout, "passed");
  const actualFailed = parseTestOutput(stdout, "failed");

  const result: TestExecutionResult = {
    testsExecuted: actualPassed + actualFailed,
    passed: actualPassed,
    failed: actualFailed,
    exitCode,
    output: stdout.substring(0, 2000),
    success: exitCode === 0,
  };

  frameworkLogger.log(
    "processor-manager",
    "tests-completed",
    result.success ? "success" : "error",
    {
      message: `Tests completed: ${result.passed} passed, ${result.failed} failed`,
      ...result,
    },
  );

  return result;
}

export function parseTestOutput(
  output: string,
  type: "passed" | "failed",
): number {
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