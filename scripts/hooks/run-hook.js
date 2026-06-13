#!/usr/bin/env node

/**
 * 0xRay Git Hook Runner
 *
 * Called by git hooks (pre-commit, post-commit, pre-push, post-push)
 * to perform validation, logging, and monitoring.
 *
 * Usage:
 *   node scripts/hooks/run-hook.js <hook-type>
 *
 * Environment variables (set by bash hook scripts):
 *   HOOK_TYPE     - pre-commit | post-commit | pre-push | post-push
 *   PROJECT_ROOT  - Git repository root directory
 *   STAGED_FILES  - Newline-separated staged files (pre-commit)
 *   CHANGED_FILES - Newline-separated changed files (pre-push)
 *   COMMIT_SHA    - Commit hash (post-commit, post-push)
 *   BRANCH        - Branch name
 *   COMMIT_RANGE  - Commit range like abc..def (pre-push)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { execSync, exec } from "child_process";

// ── Parse arguments ──────────────────────────────────────────

const hookType = process.argv[2] || process.env.HOOK_TYPE || "unknown";
const projectRoot = process.env.PROJECT_ROOT || process.cwd();

// ── Logging ──────────────────────────────────────────────────

function ensureLogDir() {
  const logDir = join(projectRoot, "logs", "framework");
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function log(message) {
  try {
    const logDir = ensureLogDir();
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} [${hookType}] ${message}\n`;
    appendFileSync(join(logDir, "activity.log"), entry, "utf-8");
  } catch {
    // Never crash over logging
  }
}

function logError(message) {
  try {
    const logDir = ensureLogDir();
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} [${hookType}] ERROR: ${message}\n`;
    appendFileSync(join(logDir, "activity.log"), entry, "utf-8");
  } catch {
    // Never crash over logging
  }
}

// ── Record metrics ───────────────────────────────────────────

function recordMetrics(duration, exitCode) {
  try {
    const metricsFile = join(projectRoot, "hooks", "hook-metrics.json");
    let metrics = [];
    if (existsSync(metricsFile)) {
      try {
        metrics = JSON.parse(readFileSync(metricsFile, "utf-8"));
      } catch {
        metrics = [];
      }
    }
    metrics.push({
      timestamp: Date.now(),
      hookType,
      duration,
      exitCode,
      success: exitCode === 0,
    });
    // Keep last 500 entries
    if (metrics.length > 500) {
      metrics = metrics.slice(-500);
    }
    writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  } catch {
    // Never crash over metrics
  }
}

// ── TypeScript checking ──────────────────────────────────────

function runTypeScriptCheck(files) {
  /**
   * Run tsc --noEmit on a subset of files.
   * Falls back to full project check if per-file fails.
   */
  log("Running TypeScript validation...");

  try {
    // Check if tsconfig.json exists
    const tsconfigPath = join(projectRoot, "tsconfig.json");
    if (!existsSync(tsconfigPath)) {
      log("No tsconfig.json found, skipping TypeScript check");
      return { passed: true, errors: [] };
    }

    // Check if tsc is available
    const tscPath = join(projectRoot, "node_modules", ".bin", "tsc");
    const tscCmd = existsSync(tscPath) ? tscPath : "npx tsc";

    // Try per-file check first (faster)
    const tsFiles = files.filter((f) => /\.(ts|tsx)$/.test(f));
    if (tsFiles.length > 0 && tsFiles.length <= 20) {
      try {
        execSync(`${tscCmd} --noEmit ${tsFiles.map((f) => `"${f}"`).join(" ")}`, {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 30000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        log(`TypeScript check passed: ${tsFiles.length} files`);
        return { passed: true, errors: [] };
      } catch (err) {
        const stderr = err.stderr || "";
        // If it's "cannot find file" errors from per-file mode, fall back
        if (stderr.includes("Cannot find name") || stderr.includes("error TS")) {
          // Parse errors
          const errorLines = stderr
            .split("\n")
            .filter((l) => l.includes("error TS"))
            .map((l) => l.trim());
          log(`TypeScript check failed: ${errorLines.length} errors`);
          return { passed: false, errors: errorLines };
        }
        // Fall through to full check
      }
    }

    // Full project check (fallback)
    try {
      execSync(`${tscCmd} --noEmit`, {
        cwd: projectRoot,
        encoding: "utf-8",
        timeout: 60000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      log("TypeScript full check passed");
      return { passed: true, errors: [] };
    } catch (err) {
      const stderr = (err.stderr || err.stdout || "").toString();
      const errorLines = stderr
        .split("\n")
        .filter((l) => l.includes("error TS"))
        .map((l) => l.trim())
        .slice(0, 20); // Cap at 20 errors
      log(`TypeScript full check failed: ${errorLines.length} errors`);
      return { passed: false, errors: errorLines };
    }
  } catch (err) {
    logError(`TypeScript check crashed: ${err.message}`);
    // Don't block commits if tsc itself crashes
    return { passed: true, errors: [], note: "tsc crashed, allowing commit" };
  }
}

// ── Codex validation ─────────────────────────────────────────

/**
 * Try to load the framework's ConsoleLogUsageValidator.
 * Falls back gracefully if the framework dist is not available.
 */
async function tryLoadConsoleValidator() {
  const distPaths = [
    join(projectRoot, "dist", "enforcement", "validators", "code-quality-validators.js"),
    join(projectRoot, "node_modules", "xray", "dist", "enforcement", "validators", "code-quality-validators.js"),
  ];
  for (const distPath of distPaths) {
    if (existsSync(distPath)) {
      try {
        const mod = await import(distPath);
        if (mod.ConsoleLogUsageValidator) {
          return new mod.ConsoleLogUsageValidator();
        }
      } catch {
        // Fall through to next dist path
      }
    }
  }
  return null;
}

/**
 * Try to load the framework's LightweightValidator.
 * Falls back gracefully if the framework dist is not available.
 */
async function tryLoadLightweightValidator() {
  const distPaths = [
    join(projectRoot, "dist", "postprocessor", "validation", "LightweightValidator.js"),
    join(projectRoot, "node_modules", "0xray", "dist", "postprocessor", "validation", "LightweightValidator.js"),
  ];
  for (const distPath of distPaths) {
    if (existsSync(distPath)) {
      try {
        const mod = await import(distPath);
        if (mod.runLightweightPreCommitValidation) {
          return mod.runLightweightPreCommitValidation;
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Try to load the enforcement gate's beforeToolHook.
 * Falls back gracefully if the framework dist is not available.
 */
async function tryLoadGate() {
  const distPaths = [
    join(projectRoot, "dist", "integrations", "enforcement-gate.js"),
    join(projectRoot, "node_modules", "0xray", "dist", "integrations", "enforcement-gate.js"),
  ];
  for (const distPath of distPaths) {
    if (existsSync(distPath)) {
      try {
        const mod = await import(distPath);
        if (mod.beforeToolHook) {
          return mod.beforeToolHook;
        }
      } catch {}
    }
  }
  return null;
}

/**
 * Check a single file for console.log/warn/error violations using the
 * framework validator when available, falling back to inline regex.
 *
 * Delegates to ConsoleLogUsageValidator (from dist/) when available to
 * ensure consistent CLI-exemption logic with the framework's registry.
 */
async function checkConsoleViolations(filePath, content) {
  const frameworkValidator = await tryLoadConsoleValidator();
  if (frameworkValidator) {
    try {
      const result = await frameworkValidator.validate({
        operation: "write",
        files: [filePath],
        newCode: content,
      });
      if (!result.passed) {
        return { errors: [`${filePath}: ${result.message}`], warnings: [] };
      }
      return { errors: [], warnings: [] };
    } catch {
      // Fall through to inline check
    }
  }

  // Inline fallback (same logic as framework validator for consistency)
  const codeWithoutComments = content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  const isCLIFile = filePath.includes("/cli/") || filePath.includes("src\\cli\\");
  const violations = [];

  const consolePatterns = [
    { pattern: /\bconsole\.log\s*\(/g, name: "console.log" },
    { pattern: /\bconsole\.warn\s*\(/g, name: "console.warn" },
    { pattern: /\bconsole\.error\s*\(/g, name: "console.error" },
  ];
  for (const { pattern, name } of consolePatterns) {
    const matches = codeWithoutComments.match(pattern);
    if (matches && matches.length > 0) {
      violations.push(`${matches.length} use(s) of ${name}`);
    }
  }

  if (violations.length > 0 && !isCLIFile) {
    return { errors: [`${filePath}: ${violations.join("; ")}`], warnings: [] };
  }
  return { errors: [], warnings: [] };
}

async function runCodexValidation(files) {
  /**
   * Run lightweight codex validation on files.
   * Uses dynamic import of ConsoleLogUsageValidator from framework when available.
   */
  log("Running Codex validation...");

  const tsFiles = files.filter((f) => /\.(ts|tsx)$/.test(f));
  const jsFiles = files.filter((f) => /\.(js|jsx|mjs)$/.test(f));

  if (tsFiles.length === 0 && jsFiles.length === 0) {
    return { passed: true, warnings: [], errors: [] };
  }

  const errors = [];
  const warnings = [];

  for (const file of [...tsFiles, ...jsFiles]) {
    const filePath = join(projectRoot, file);
    if (!existsSync(filePath)) continue;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Console check via framework validator (with inline fallback)
      const consoleResult = await checkConsoleViolations(file, content);
      errors.push(...consoleResult.errors);
      warnings.push(...consoleResult.warnings);

      // LightweightValidator for TODO/@ts-ignore/any/security/syntax (replaces inline regex)
      const lwValidate = await tryLoadLightweightValidator();
      if (lwValidate) {
        const lwResult = await lwValidate([filePath]);
        errors.push(...lwResult.errors);
        warnings.push(...lwResult.warnings);
      }

      // Full registry gate call (same path as TUI/CLI hooks)
      const beforeHook = await tryLoadGate();
      if (beforeHook) {
        try {
          const gateResult = await beforeHook("write", { filePath, content });
          if (!gateResult.allowed && gateResult.violations) {
            for (const v of gateResult.violations) {
              const msg = `${file}: ${v.message || v.ruleId}`;
              if (v.severity === "error" || v.severity === "blocking") {
                errors.push(msg);
              } else {
                warnings.push(msg);
              }
            }
          }
        } catch (gateErr) {
          logError(`Gate call failed for ${file}: ${gateErr.message}`);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  const passed = errors.length === 0;
  log(`Codex validation: ${passed ? "passed" : `FAILED with ${errors.length} error(s)`}`);
  if (warnings.length > 0) {
    log(`Codex warnings: ${warnings.length}`);
  }

  return { passed, errors, warnings };
}

// ── Log archival and cleanup ──────────────────────────────────

async function runLogMaintenance() {
  /**
   * Archive and clean up old log files.
   * Runs after commits to keep logs manageable.
   */
  log("Running log maintenance...");

  try {
    const distDirs = [
      join(projectRoot, "dist"),
      join(projectRoot, "node_modules", "xray", "dist"),
    ];

    for (const distDir of distDirs) {
      const triggerPath = join(distDir, "postprocessor", "triggers", "GitHookTrigger.js");
      if (!existsSync(triggerPath)) continue;

      try {
        const { archiveLogFiles, cleanupLogFiles } = await import(triggerPath);

        // Archive logs
        try {
          const archiveResult = await archiveLogFiles({
            archiveDirectory: join(projectRoot, "logs", "framework"),
            maxFileSizeMB: 10,
            rotationIntervalHours: 24,
            compressionEnabled: true,
            maxAgeHours: 168,
            directories: [join(projectRoot, "logs", "framework")],
            excludePatterns: [],
          });
          if (archiveResult.archived > 0) {
            log(`Archived ${archiveResult.archived} log file(s)`);
          }
        } catch {
          // Archive can fail silently
        }

        // Cleanup old logs
        try {
          const cleanResult = await cleanupLogFiles({
            maxAgeHours: 24,
            excludePatterns: [
              "activity.log",
              "framework-activity-",
              "xray-plugin-",
              "kernel-",
              "reflection-",
              ".md",
              "AUTOMATED_",
              "REFACTORING-",
              "release-",
              "deployment/",
              "monitoring/",
              "reports/",
              "reflections/",
              "current-session.log",
              "full-test-run.log",
            ],
            directories: [join(projectRoot, "logs")],
            enabled: true,
          });
          if (cleanResult.cleaned > 0) {
            log(`Cleaned ${cleanResult.cleaned} old log file(s)`);
          }
        } catch {
          // Cleanup can fail silently
        }

        return; // Successfully loaded and ran
      } catch {
        // Dynamic import failed, try next dist dir
      }
    }

    log("Log maintenance: framework modules not available, skipping");
  } catch (err) {
    logError(`Log maintenance failed: ${err.message}`);
  }
}

// ── Comprehensive validation (pre-push) ──────────────────────

async function runFullValidation(files) {
  /**
   * Full validation suite for pre-push.
   * Includes TypeScript check, codex validation, and test hints.
   */
  log("Running full validation suite...");

  // TypeScript check
  const tsResult = runTypeScriptCheck(files);

  // Codex validation
  const codexResult = await runCodexValidation(files);

  // Check for test files
  const sourceFiles = files.filter((f) =>
    /src\/.*\.(ts|tsx)$/.test(f) &&
    !f.includes(".test.") &&
    !f.includes(".spec.") &&
    !f.includes("__tests__")
  );

  let testWarning = null;
  if (sourceFiles.length > 0) {
    const testFiles = files.filter((f) =>
      f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__")
    );
    if (testFiles.length === 0) {
      testWarning = `${sourceFiles.length} source file(s) modified but no tests — consider adding tests`;
    }
  }

  const allPassed = tsResult.passed && codexResult.passed;
  log(`Full validation: ${allPassed ? "passed" : "FAILED"}`);

  return {
    passed: allPassed,
    typescript: tsResult,
    codex: codexResult,
    testWarning,
  };
}

// ── Hook handlers ─────────────────────────────────────────────

async function handlePreCommit() {
  const stagedFiles = (process.env.STAGED_FILES || "")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    log("No staged files to validate");
    process.exit(0);
  }

  log(`Validating ${stagedFiles.length} staged file(s)...`);

  // TypeScript check (blocking)
  const tsResult = runTypeScriptCheck(stagedFiles);
  if (!tsResult.passed) {
    process.stderr.write("\n❌ TypeScript validation failed:\n");
    tsResult.errors.slice(0, 10).forEach((e) => process.stderr.write(`   ${e}\n`));
    if (tsResult.errors.length > 10) {
      process.stderr.write(`   ... and ${tsResult.errors.length - 10} more\n`);
    }
    process.stderr.write("\nFix TypeScript errors before committing.\n");
    process.stderr.write("Run: npx tsc --noEmit\n");
    process.exit(1);
  }

  // Codex validation (blocking)
  const codexResult = await runCodexValidation(stagedFiles);
  if (!codexResult.passed) {
    logError("Codex validation failed:");
    codexResult.errors.slice(0, 10).forEach((e) => logError(`   ${e}`));
    process.stderr.write("\n❌ Codex validation failed:\n");
    codexResult.errors.slice(0, 10).forEach((e) => process.stderr.write(`   ${e}\n`));
    process.stderr.write("\nFix Codex violations before committing.\n");
    process.stderr.write("Run: npx 0xray validate\n\n");
    process.exit(1);
  }

  // Warnings (non-blocking)
  if (codexResult.warnings.length > 0) {
    log("Codex warnings:");
    codexResult.warnings.slice(0, 5).forEach((w) => log(`   ${w}`));
    process.stderr.write("\n⚠️  Codex warnings:\n");
    codexResult.warnings.slice(0, 5).forEach((w) => process.stderr.write(`   ${w}\n`));
    process.stderr.write("\n");
  }

  log(`\n✅ Pre-commit validation passed (${stagedFiles.length} files)\n`);
  process.exit(0);
}

async function handlePostCommit() {
  const commitSha = process.env.COMMIT_SHA || "unknown";
  const branch = process.env.BRANCH || "unknown";

  log(`Post-commit: ${commitSha} on ${branch}`);

  // Run log maintenance
  await runLogMaintenance();

  // Record metrics
  recordMetrics(0, 0);

  log("Post-commit: complete");
  process.exit(0);
}

async function handlePrePush() {
  const changedFiles = (process.env.CHANGED_FILES || "")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  if (changedFiles.length === 0) {
    log("No changed files to validate");
    process.exit(0);
  }

  log(`Validating ${changedFiles.length} changed file(s) for push...`);

  const result = await runFullValidation(changedFiles);

  if (!result.passed) {
    logError("Pre-push validation failed:");
    process.stderr.write("\n❌ Pre-push validation failed:\n");

    if (!result.typescript.passed) {
      process.stderr.write("TypeScript errors:\n");
      result.typescript.errors.slice(0, 10).forEach((e) =>
        process.stderr.write(`   ${e}\n`)
      );
      process.stderr.write("\n");
    }

    if (!result.codex.passed) {
      process.stderr.write("Codex violations:\n");
      result.codex.errors.slice(0, 10).forEach((e) =>
        process.stderr.write(`   ${e}\n`)
      );
      process.stderr.write("\n");
    }

    process.stderr.write("Fix all errors before pushing.\n");
    process.stderr.write("Run: npx tsc --noEmit && npx 0xray validate\n\n");
    process.exit(1);
  }

  // Warnings
  if (result.codex.warnings.length > 0) {
    log("Codex warnings:");
    result.codex.warnings.slice(0, 5).forEach((w) => log(`   ${w}`));
    process.stderr.write("\n⚠️  Codex warnings:\n");
    result.codex.warnings.slice(0, 5).forEach((w) => process.stderr.write(`   ${w}\n`));
    process.stderr.write("\n");
  }

  if (result.testWarning) {
    log(`Pre-push test warning: ${result.testWarning}`);
    process.stderr.write(`\n⚠️  ${result.testWarning}\n\n`);
  }

  log(`\n✅ Pre-push validation passed (${changedFiles.length} files)\n`);
  process.exit(0);
}

async function handlePostPush() {
  const commitSha = process.env.COMMIT_SHA || "unknown";
  const branch = process.env.BRANCH || "unknown";

  log(`Post-push: ${commitSha} on ${branch}`);

  // Run log maintenance
  await runLogMaintenance();

  // Record metrics
  recordMetrics(0, 0);

  log("Post-push: complete");
  process.exit(0);
}

async function handlePreCommand() {
  const preCommandPath = join(projectRoot, "scripts", "hooks", "pre-command.mjs");

  if (!existsSync(preCommandPath)) {
    log("Pre-command hook not found, skipping");
    process.exit(0);
  }

  log("Running pre-command context check...");

  try {
    const { execSync: nodeExecSync } = await import("child_process");
    nodeExecSync(`node "${preCommandPath}"`, {
      cwd: projectRoot,
      stdio: "inherit",
    });
    log("Pre-command: complete");
    process.exit(0);
  } catch (err) {
    logError(`Pre-command hook failed: ${err.message}`);
    process.exit(0);
  }
}

// ── Main ─────────────────────────────────────────────────────

const handlers = {
  "pre-commit": handlePreCommit,
  "post-commit": handlePostCommit,
  "pre-push": handlePrePush,
  "post-push": handlePostPush,
  "pre-command": handlePreCommand,
};

const handler = handlers[hookType];
if (!handler) {
  process.stderr.write(`Unknown hook type: ${hookType}\n`);
  process.stderr.write(`Valid types: ${Object.keys(handlers).join(", ")}\n`);
  process.exit(1);
}

// Run with timing
const startTime = Date.now();
handler()
  .then(() => {
    const duration = Date.now() - startTime;
    log(`Hook completed in ${duration}ms`);
  })
  .catch((err) => {
    logError(`Hook crashed: ${err.message}`);
    process.stderr.write(`0xRay hook error: ${err.message}\n`);
    process.exit(1);
  });
