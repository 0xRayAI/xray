/**
 */

import { vi } from "vitest";

/**
 */
vi.mock("../src/core/framework-logger.js", () => ({
  frameworkLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
    success: vi.fn().mockResolvedValue(undefined),
  },
}));

/**
 */
vi.mock("../src/core/state-manager.js", () => ({
  stateManager: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(false),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}));

/**
 */
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(""),
  writeFileSync: vi.fn().mockReturnValue(undefined),
  appendFileSync: vi.fn().mockReturnValue(undefined),
  mkdirSync: vi.fn().mockReturnValue(undefined),
  rmSync: vi.fn().mockReturnValue(undefined),
  readdirSync: vi.fn().mockReturnValue([]),
  unlinkSync: vi.fn().mockReturnValue(undefined),
  statSync: vi.fn().mockReturnValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 0,
    mtime: new Date(),
  }),
}));

/**
 */
vi.mock("child_process", () => ({
  exec: vi.fn().mockImplementation(
    (command: string, options: any, callback: Function) => {
      // Default: succeed with empty output - tests should override this
      callback(null, { stdout: "", stderr: "" });
    },
  ),
  execSync: vi.fn().mockReturnValue(""),
  spawn: vi.fn().mockReturnValue({
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  }),
}));

/**
 */
vi.mock("util", () => ({
  promisify: vi.fn().mockImplementation((fn: Function) => {
    return async (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: Error | null, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
  }),
}));

/**
 */
vi.mock("../src/utils/language-detector.js", () => ({
  detectProjectLanguage: vi.fn().mockReturnValue({
    language: "TypeScript",
    testFramework: "Vitest",
    testCommand: "vitest run",
    testFilePattern: "*.test.ts",
    configFiles: ["vitest.config.ts"],
  }),
}));

/**
 */
export const resetProcessorMocks = () => {
  const fs = require("fs");
  const child_process = require("child_process");
  const languageDetector = require("../src/utils/language-detector");

  // Reset fs mocks
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockReturnValue("");
  fs.writeFileSync.mockReturnValue(undefined);
  fs.appendFileSync.mockReturnValue(undefined);

  // Reset child_process mocks
  child_process.exec.mockImplementation(
    (command: string, options: any, callback: Function) => {
      callback(null, { stdout: "", stderr: "" });
    },
  );

  // Reset language detector mocks
  languageDetector.detectProjectLanguage.mockReturnValue({
    language: "TypeScript",
    testFramework: "Vitest",
    testCommand: "vitest run",
  });
};
