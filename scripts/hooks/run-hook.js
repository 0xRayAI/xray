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
import { join, dirname, resolve } from "path";
import { execSync, exec, execFileSync } from "child_process";
import { fileURLToPath } from "url";

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

function packageHasTypecheckScript() {
  try {
    const pkgPath = join(projectRoot, "package.json");
    if (!existsSync(pkgPath)) return false;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return typeof pkg.scripts?.typecheck === "string" && pkg.scripts.typecheck.length > 0;
  } catch {
    return false;
  }
}

function runTypeScriptCheck(files) {
  /**
   * Prefer npm run typecheck when defined (matches CI).
   * Otherwise tsc --noEmit on staged files or full project.
   */
  log("Running TypeScript validation...");

  try {
    if (packageHasTypecheckScript()) {
      try {
        execSync("npm run typecheck", {
          cwd: projectRoot,
          encoding: "utf-8",
          timeout: 120000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        log("npm run typecheck passed");
        return { passed: true, errors: [] };
      } catch (err) {
        const stderr = (err.stderr || err.stdout || "").toString();
        const errorLines = stderr
          .split("\n")
          .filter((l) => /error TS\d+/.test(l))
          .map((l) => l.trim())
          .slice(0, 20);
        log(`npm run typecheck failed: ${errorLines.length} errors`);
        return { passed: false, errors: errorLines };
      }
    }

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
        execFileSync(
          tscCmd,
          ["--noEmit", ...tsFiles],
          {
            cwd: projectRoot,
            encoding: "utf-8",
            timeout: 30000,
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
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

// ── Codex validation (diff-hunk scoped) ──────────────────────

/**
 * Collect added lines per staged file from `git diff --cached`.
 * Only + lines are validated — pre-existing violations in untouched hunks are ignored.
 */
export function getStagedAddedLinesByFile(files, root = projectRoot) {
  const addedByFile = new Map();

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    try {
      const diff = execSync(`git diff --cached -U0 -- ${JSON.stringify(file).slice(1, -1)}`, {
        cwd: root,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const addedLines = [];
      for (const line of diff.split("\n")) {
        if (
          line.startsWith("+++") ||
          line.startsWith("---") ||
          line.startsWith("@@") ||
          line.startsWith("diff ") ||
          line.startsWith("index ")
        ) {
          continue;
        }
        if (line.startsWith("+")) {
          addedLines.push(line.slice(1));
        }
      }
      if (addedLines.length > 0) {
        addedByFile.set(file, addedLines);
      }
    } catch {
      // Deletions-only or unreadable diff — skip codex for this file
    }
  }

  return addedByFile;
}

export function scanAddedLinesForCodex(file, addedLines) {
  const errors = [];
  const warnings = [];
  const content = addedLines.join("\n");
  const lines = addedLines;

  const consoleLogLines = lines.reduce((acc, line, i) => {
    if (/\bconsole\.(log|warn|error)\b/.test(line) && !line.includes("NOSONAR")) {
      acc.push(i + 1);
    }
    return acc;
  }, []);
  if (consoleLogLines.length > 0) {
    errors.push(
      `${file}: console.log/warn/error in staged diff at hunk line(s) ${consoleLogLines.slice(0, 3).join(", ")}`,
    );
  }

  const todoLines = lines.reduce((acc, line, i) => {
    if (/\/\/\s*(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
      acc.push(i + 1);
    }
    return acc;
  }, []);
  if (todoLines.length > 0) {
    warnings.push(`${file}: ${todoLines.length} TODO/FIXME in staged diff`);
  }

  const tsIgnoreLines = lines.reduce((acc, line, i) => {
    if (/@ts-ignore|@ts-nocheck|@ts-expect-error/.test(line)) {
      acc.push(i + 1);
    }
    return acc;
  }, []);
  if (tsIgnoreLines.length > 0) {
    warnings.push(`${file}: ${tsIgnoreLines.length} @ts-ignore/@ts-nocheck in staged diff`);
  }

  if (/\bany\b/.test(content)) {
    const anyLines = lines.reduce((acc, line, i) => {
      if (/\bany\b/.test(line) && !line.includes("//") && !line.includes("*")) {
        acc.push(i + 1);
      }
      return acc;
    }, []);
    if (anyLines.length > 0) {
      warnings.push(`${file}: ${anyLines.length} use(s) of 'any' in staged diff`);
    }
  }

  return { errors, warnings };
}

async function runCodexValidation(files) {
  /**
   * Run lightweight codex validation on staged diff hunks only.
   */
  log("Running Codex validation (diff-hunk scope)...");

  const codexFiles = files.filter((f) => /\.(ts|tsx|js|jsx|mjs)$/.test(f));
  if (codexFiles.length === 0) {
    return { passed: true, warnings: [], errors: [] };
  }

  const addedByFile = getStagedAddedLinesByFile(codexFiles);
  const errors = [];
  const warnings = [];

  for (const file of codexFiles) {
    const addedLines = addedByFile.get(file);
    if (!addedLines || addedLines.length === 0) continue;
    const scan = scanAddedLinesForCodex(file, addedLines);
    errors.push(...scan.errors);
    warnings.push(...scan.warnings);
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
      join(projectRoot, "node_modules", "0xray", "dist"),
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
    console.error("\n❌ TypeScript validation failed:");
    tsResult.errors.slice(0, 10).forEach((e) => console.error(`   ${e}`));
    if (tsResult.errors.length > 10) {
      console.error(`   ... and ${tsResult.errors.length - 10} more`);
    }
    console.error("\nFix TypeScript errors before committing.");
    console.error("Run: npx tsc --noEmit\n");
    process.exit(1);
  }

  // Codex validation (blocking)
  const codexResult = await runCodexValidation(stagedFiles);
  if (!codexResult.passed) {
    console.error("\n❌ Codex validation failed:");
    codexResult.errors.slice(0, 10).forEach((e) => console.error(`   ${e}`));
    console.error("\nFix Codex violations before committing.");
    console.error("Run: npx xray validate\n");
    process.exit(1);
  }

  // Warnings (non-blocking)
  if (codexResult.warnings.length > 0) {
    console.warn("\n⚠️  Codex warnings:");
    codexResult.warnings.slice(0, 5).forEach((w) => console.warn(`   ${w}`));
    console.warn();
  }

  console.log(`\n✅ Pre-commit validation passed (${stagedFiles.length} files)\n`);
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
    console.error("\n❌ Pre-push validation failed:\n");

    if (!result.typescript.passed) {
      console.error("TypeScript errors:");
      result.typescript.errors.slice(0, 10).forEach((e) =>
        console.error(`   ${e}`)
      );
      console.error();
    }

    if (!result.codex.passed) {
      console.error("Codex violations:");
      result.codex.errors.slice(0, 10).forEach((e) =>
        console.error(`   ${e}`)
      );
      console.error();
    }

    console.error("Fix all errors before pushing.");
    console.error("Run: npx tsc --noEmit && npx xray validate\n");
    process.exit(1);
  }

  // Warnings
  if (result.codex.warnings.length > 0) {
    console.warn("\n⚠️  Codex warnings:");
    result.codex.warnings.slice(0, 5).forEach((w) => console.warn(`   ${w}`));
    console.warn();
  }

  if (result.testWarning) {
    console.warn(`\n⚠️  ${result.testWarning}\n`);
  }

  console.log(`\n✅ Pre-push validation passed (${changedFiles.length} files)\n`);
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

const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const handler = handlers[hookType];
  if (!handler) {
    console.error(`Unknown hook type: ${hookType}`);
    console.error(`Valid types: ${Object.keys(handlers).join(", ")}`);
    process.exit(1);
  }

  const startTime = Date.now();
  handler()
    .then(() => {
      const duration = Date.now() - startTime;
      log(`Hook completed in ${duration}ms`);
    })
    .catch((err) => {
      logError(`Hook crashed: ${err.message}`);
      console.error(`0xRay hook error: ${err.message}`);
      process.exit(1);
    });
}
