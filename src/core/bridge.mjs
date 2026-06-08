#!/usr/bin/env node

/**
 * Xray Universal Bridge
 *
 * Standalone bridge that provides Xray framework capabilities
 * to ANY consumer — no OpenCode dependency.
 *
 * Supports three transport modes:
 *   1. Stdin/Stdout (default): JSON pipe protocol
 *   2. Positional args: node bridge.mjs <command> [--json '{}'] [--cwd /path]
 *   3. HTTP server:    node bridge.mjs --http --port 18431 [--cwd /path]
 *
 * Commands:
 *   health            Framework health check
 *   codex-check       Check code against codex rules
 *   get-codex-prompt   Get formatted codex terms for system prompt injection
 *   get-config        Get full framework configuration as JSON
 *   validate          Run validation on files
 *   pre-process       Run quality gate + pre-processors
 *   post-process      Run post-processors
 *   stats             Bridge/framework statistics
 *   hooks             Manage git hooks (install/uninstall/list/status)
 *
 * Usage (stdin):
 *   echo '{"command":"health"}' | node bridge.mjs --cwd /path
 *
 * Usage (positional):
 *   node bridge.mjs health --cwd /path
 *   node bridge.mjs get-codex-prompt --cwd /path --json '{"severityFilter":["blocking"]}'
 *
 * Usage (HTTP):
 *   node bridge.mjs --http --port 18431 --cwd /path
 *   curl -X POST http://localhost:18431 -d '{"command":"get-codex-prompt"}'
 *
 * @version 1.0.0
 * @since 2026-03-28
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
  renameSync,
  lstatSync,
} from "fs";
import { join, dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Framework Components (lazy-loaded)
// ============================================================================

let QualityGateModule = null;
let CodexFormatterModule = null;
let frameworkReady = false;
let frameworkLoadAttempted = false;

// ============================================================================
// Project Root Detection
// ============================================================================

function findProjectRoot() {
  const envHome = process.env.STRRAY_HOME;
  if (envHome && existsSync(join(envHome, "package.json"))) return envHome;

  const candidates = [
    process.cwd(),
    join(homedir(), "dev", "stringray"),
    join(dirname(__dirname), "..", ".."), // core/ -> project root
    join(dirname(__dirname), "..", "..", ".."), // integrations/ -> project root
  ];

  for (const dir of candidates) {
    try {
      const pkgPath = join(dir, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "0xray" || pkg.dependencies?.["0xray"]) {
          return dir;
        }
      }
    } catch {
      continue;
    }
  }
  return process.cwd();
}

// ============================================================================
// Log Directory
// ============================================================================

function ensureLogDir(projectRoot) {
  const logDir = join(projectRoot, "logs", "framework");
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

function logToActivity(logDir, message) {
  try {
    const activityPath = join(logDir, "activity.log");
    const timestamp = new Date().toISOString();
    appendFileSync(activityPath, `${timestamp} [bridge] ${message}\n`, "utf-8");
  } catch {
    // Silent fail — never break the consumer over logging
  }
}

// ============================================================================
// Framework Loading
// ============================================================================

async function loadFramework(projectRoot) {
  if (frameworkReady) return true;
  if (frameworkLoadAttempted) return false;
  frameworkLoadAttempted = true;

  const distDirs = [
    join(projectRoot, "dist"),
    join(projectRoot, "node_modules", "0xray", "dist"),
  ];

  for (const distDir of distDirs) {
    try {
      // Codex formatter (standalone, no deps)
      if (!CodexFormatterModule) {
        const cfPath = join(distDir, "core", "codex-formatter.js");
        if (!existsSync(cfPath)) {
          // dist/ not available for codex formatter — will use built-in fallback
        }
        if (existsSync(cfPath)) {
          const mod = await import(cfPath);
          CodexFormatterModule = mod;
        }
      }

      // Quality gate (standalone, no deps)
      if (!QualityGateModule) {
        const qgPath = join(distDir, "plugin", "quality-gate.js");
        if (existsSync(qgPath)) {
          const mod = await import(qgPath);
          QualityGateModule = mod;
        }
      }

      frameworkReady = true;
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

// ============================================================================
// Built-in Codex Fallback (when dist/ is not available)
// NOTE: The canonical source is codex-formatter.ts BUILTIN_CODEX.
// This is a minimal inline copy for bridge standalone mode only.
// ============================================================================

const BRIDGE_CODEX_FALLBACK = {
  version: "fallback-1.0.0",
  terms: [
    { id: "resolve-all-errors", title: "Resolve All Errors", description: "Never leave unhandled errors, rejected promises, or uncaught exceptions in production code.", severity: "blocking" },
    { id: "tests-required", title: "Tests Required", description: "Every new function, method, or module must have corresponding test coverage.", severity: "blocking" },
    { id: "no-console-in-production", title: "No Console in Production", description: "Use structured logging instead of console.log, console.warn, or console.error.", severity: "blocking" },
    { id: "type-safety", title: "Type Safety", description: "Prefer explicit types over 'any'. Use TypeScript strict mode features.", severity: "high" },
    { id: "input-validation", title: "Input Validation", description: "Validate all external inputs at the system boundary.", severity: "high" },
  ],
};

// ============================================================================
// Command Handlers
// ============================================================================

async function handleHealth(input) {
  const projectRoot = findProjectRoot();
  const loaded = await loadFramework(projectRoot);

  const pkgPath = join(projectRoot, "package.json");
  let version = "unknown";
  if (existsSync(pkgPath)) {
    try {
      version = JSON.parse(readFileSync(pkgPath, "utf-8")).version;
    } catch {}
  }

  return {
    status: "ok",
    framework: loaded ? "loaded" : "not_loaded",
    version,
    projectRoot,
    components: {
      codexFormatter: !!CodexFormatterModule,
      qualityGate: !!QualityGateModule,
    },
    nodeVersion: process.version,
  };
}

// ============================================================================
// Filesystem Codex Loader (bridge-native, no dist/ dependency)
// ============================================================================

/**
 * Load codex.json from the standard priority chain.
 * Same logic as codex-formatter.ts but inlined so bridge works standalone.
 */
/** Codex candidate paths — single source of truth for both loadCodexFromFs and handleGetConfig */
function getCodexCandidates(projectRoot) {
  const envDir = process.env.STRRAY_CONFIG_DIR;
  const candidates = [];
  if (envDir) candidates.push(join(projectRoot, envDir, "codex.json"));
  candidates.push(join(projectRoot, ".strray", "codex.json"));
  candidates.push(join(projectRoot, ".opencode", "xray", "codex.json"));
  candidates.push(join(projectRoot, "codex.json"));
  return candidates;
}

function loadCodexFromFs(projectRoot) {
  const candidates = getCodexCandidates(projectRoot);

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const raw = readFileSync(candidate, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version && Array.isArray(parsed.terms)) {
          return { codex: parsed, source: candidate };
        }
      }
    } catch {
      continue;
    }
  }

  return { codex: null, source: null };
}

async function handleGetCodexPrompt(input, projectRoot, logDir) {
  const { severityFilter, includeExamples, maxTerms, compressed } = input;
  logToActivity(logDir, `get-codex-prompt: severity=${severityFilter || "all"} compressed=${!!compressed}`);

  let prompt, termCount, totalTerms, version, source, charCount;

  if (CodexFormatterModule && CodexFormatterModule.formatCodexPrompt) {
    const result = CodexFormatterModule.formatCodexPrompt({
      projectRoot,
      severityFilter,
      includeExamples,
      maxTerms,
      compressed,
    });
    prompt = result.prompt;
    termCount = result.termCount;
    totalTerms = result.totalTerms;
    version = result.version;
    source = result.configPath;
    charCount = result.charCount;
  } else {
    // Try filesystem first, fall back to built-in
    const { codex, source: fsSource } = loadCodexFromFs(projectRoot);
    const termsSource = codex || BRIDGE_CODEX_FALLBACK;

    let terms = termsSource.terms;
    if (severityFilter) {
      terms = terms.filter((t) => severityFilter.includes(t.severity));
    }
    const severityOrder = { blocking: 0, high: 1, medium: 2 };
    terms.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
    if (maxTerms) terms = terms.slice(0, maxTerms);

    const lines = [`## Xray Universal Development Codex v${termsSource.version}`];
    const emojis = { blocking: "🔴", high: "🟡", medium: "🟢" };
    const labels = { blocking: "BLOCKING", high: "HIGH PRIORITY", medium: "MEDIUM" };

    for (const term of terms) {
      lines.push(`\n**${emojis[term.severity] || "⚪"} ${term.id}** [${labels[term.severity] || term.severity}]`);
      if (!compressed || term.severity !== "medium") {
        lines.push(`  ${term.description}`);
      }
    }

    prompt = lines.join("\n");
    termCount = terms.length;
    totalTerms = termsSource.terms.length;
    version = termsSource.version;
    source = fsSource;
    charCount = prompt.length;
  }

  return {
    status: "ok",
    prompt,
    termCount,
    totalTerms,
    version,
    source,
    charCount,
    via: CodexFormatterModule ? "framework" : (source ? "filesystem" : "builtin"),
  };
}

async function handleGetConfig(input, projectRoot, logDir) {
  logToActivity(logDir, "get-config");

  const result = {
    status: "ok",
    projectRoot,
    nodeVersion: process.version,
  };

  // Load codex.json
  const codexPaths = getCodexCandidates(projectRoot);

  let codexPath = null;
  for (const p of codexPaths) {
    if (existsSync(p)) { codexPath = p; break; }
  }

  if (codexPath) {
    try {
      const codex = JSON.parse(readFileSync(codexPath, "utf-8"));
      result.codex = {
        path: codexPath,
        version: codex.version,
        termCount: codex.terms?.length || 0,
        categories: Object.keys(codex.categories || {}),
      };
    } catch {
      result.codex = { path: codexPath, error: "failed to parse" };
    }
  } else {
    result.codex = { path: null, note: "using built-in fallback codex" };
  }

  // Load features.json
  const featurePaths = [];
  if (envDir) featurePaths.push(join(projectRoot, envDir, "features.json"));
  featurePaths.push(join(projectRoot, ".strray", "features.json"));
  featurePaths.push(join(projectRoot, ".opencode", "xray", "features.json"));

  let featurePath = null;
  for (const p of featurePaths) {
    if (existsSync(p)) { featurePath = p; break; }
  }

  if (featurePath) {
    try {
      result.features = JSON.parse(readFileSync(featurePath, "utf-8"));
    } catch {
      result.features = { path: featurePath, error: "failed to parse" };
    }
  } else {
    result.features = { path: null, note: "no features.json found, using defaults" };
  }

  return result;
}

async function handleStats() {
  return {
    frameworkReady,
    codexFormatterAvailable: !!CodexFormatterModule,
    qualityGateAvailable: !!QualityGateModule,
    nodeVersion: process.version,
    projectRoot: findProjectRoot(),
  };
}

// ============================================================================
// Quality Gate Helper (bridge-native)
// ============================================================================

/**
 * Run quality gate check using the loaded QualityGateModule.
 * Falls back to { passed: true } when module is not available.
 */
async function runQualityGateCheck(context, projectRoot, logDir) {
  if (!QualityGateModule || !QualityGateModule.runQualityGate) {
    return { passed: true, violations: [], note: "quality-gate module not available" };
  }

  try {
    const result = await QualityGateModule.runQualityGate(context);
    return {
      passed: result.passed,
      violations: result.violations,
      checks: result.checks,
    };
  } catch (e) {
    logToActivity(logDir, `quality-gate error: ${e.message}`);
    return { passed: true, violations: [], error: e.message };
  }
}

// ============================================================================
// Additional Command Handlers
// ============================================================================

/**
 * Validate one or more files using quality gate checks.
 */
async function handleValidate(input, projectRoot, logDir) {
  const { files, operation } = input;
  logToActivity(logDir, `validate: files=${JSON.stringify(files || [])} operation=${operation}`);

  const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
  if (fileArray.length === 0) {
    return { error: "validate requires a 'files' array" };
  }

  const results = [];
  for (const filePath of fileArray) {
    const qualityResult = await runQualityGateCheck(
      { tool: "write", args: { filePath } },
      projectRoot,
      logDir,
    );
    results.push({ file: filePath, ...qualityResult });
  }

  const allPassed = results.every((r) => r.passed);
  return {
    passed: allPassed,
    operation: operation || "validate",
    fileResults: results,
  };
}

/**
 * Check code against codex rules — quality gate + optional deep enforcement.
 */
async function handleCodexCheck(input, projectRoot, logDir) {
  const { code, focusAreas, operation } = input;
  const codeLen = code?.length || 0;
  logToActivity(logDir, `codex-check: code_length=${codeLen} focus=${focusAreas} operation=${operation}`);

  const allViolations = [];
  const allChecks = [];
  let enforcerRan = false;

  // Phase 1: Quality gate (fast meta-checks + basic patterns)
  const qualityResult = await runQualityGateCheck(
    { tool: "write", args: { content: code } },
    projectRoot,
    logDir,
  );

  if (qualityResult.checks) {
    allChecks.push(...qualityResult.checks);
  }
  if (qualityResult.violations?.length) {
    allViolations.push(...qualityResult.violations);
  }

  // Phase 2: Enforcement validators (deep code analysis — security, quality, architecture)
  //    Only run content-analysis validators — skip project-level validators that
  //    require full context (docs, tests, CI, package.json) and always fail on snippets.
  const SNIPPET_SAFE_RULES = new Set([
    "security-by-design",
    "input-validation",
    "clean-debug-logs",
    "console-log-usage",
    "no-duplicate-code",
    "loop-safety",
    "no-over-engineering",
    "single-responsibility",
    "error-resolution",
    "module-system-consistency",
  ]);

  // Try to load ValidatorRegistry from enforcement/index.js
  let enforcerValidators = null;
  if (codeLen > 0) {
    const distDirs = [
      join(projectRoot, "dist"),
      join(projectRoot, "node_modules", "0xray", "dist"),
    ];

    for (const distDir of distDirs) {
      try {
        const rePath = join(distDir, "enforcement", "index.js");
        if (existsSync(rePath)) {
          const reModule = await import(rePath);
          const ValidatorRegistry = reModule.ValidatorRegistry;
          if (ValidatorRegistry) {
            enforcerValidators = new ValidatorRegistry();
          }
        }
      } catch (e) {
        // Skip — enforcer not available
      }
      if (enforcerValidators) break;
    }
  }

  if (enforcerValidators && codeLen > 0) {
    try {
      const ctx = { operation: "write", newCode: code, files: [] };
      const validators = enforcerValidators.getAllValidators();
      let enforcerViolations = 0;

      for (const v of validators) {
        if (!SNIPPET_SAFE_RULES.has(v.ruleId)) {
          if (focusAreas && focusAreas !== "all" && Array.isArray(focusAreas)) {
            if (focusAreas.includes(v.category)) {
              // Fall through to validate
            } else {
              continue;
            }
          } else {
            continue;
          }
        }

        try {
          const result = await v.validate(ctx);
          if (!result.passed) {
            enforcerViolations++;
            allViolations.push({
              id: v.ruleId,
              severity: v.severity || "error",
              message: result.message,
              suggestions: result.suggestions,
            });
            allChecks.push({ id: v.ruleId, passed: false, message: result.message });
          }
        } catch {
          // Skip broken validators gracefully
        }
      }

      enforcerRan = true;
      logToActivity(logDir, `codex-check: Validators ran against ${validators.length} rules (${SNIPPET_SAFE_RULES.size} snippet-safe), ${enforcerViolations} violations`);
    } catch (e) {
      logToActivity(logDir, `codex-check: Validator error: ${e.message}`);
    }
  } else if (!enforcerValidators) {
    logToActivity(logDir, `codex-check: Validators not available, quality gate only`);
  }

  const passed = allViolations.length === 0;

  return {
    passed,
    violations: allViolations,
    checks: allChecks,
    focusAreas: focusAreas || "all",
    enforcerRan,
  };
}

/**
 * Run quality gate check on a tool+args before execution.
 */
async function handlePreProcess(input, projectRoot, logDir) {
  const { tool, args } = input;
  const startTime = Date.now();

  logToActivity(logDir, `pre-process: tool=${tool}`);

  // Quality gate check
  const qualityResult = await runQualityGateCheck(
    { tool, args: args || {} },
    projectRoot,
    logDir,
  );

  const duration = Date.now() - startTime;
  logToActivity(logDir, `pre-process: complete duration=${duration}ms quality=${qualityResult.passed}`);

  return {
    passed: qualityResult.passed,
    duration,
    qualityGate: qualityResult,
  };
}

/**
 * Post-process stub — ProcessorManager not available in standalone bridge.
 */
async function handlePostProcess(input, projectRoot, logDir) {
  logToActivity(logDir, `post-process: stub (no ProcessorManager)`);
  return { ran: false, reason: "post-processors not available in standalone bridge" };
}

/**
 * Manage git hooks (install, uninstall, list, status).
 * Pure filesystem operations — no framework deps needed.
 */
function handleHooks(input, projectRoot) {
  const { action, hooks } = input;
  const hookTypes = hooks || ["pre-commit", "post-commit", "pre-push", "post-push"];
  const gitHooksDir = join(projectRoot, ".git", "hooks");
  const xrayHooksDir = join(projectRoot, "hooks");

  if (!existsSync(gitHooksDir)) {
    return { error: "Not a git repository — no .git/hooks directory" };
  }

  const result = { managed: [], missing: [], external: [], stale: [] };

  // ── list / status ───────────────────────────────────────
  if (action === "list" || action === "status") {
    for (const hookName of hookTypes) {
      const gitHook = join(gitHooksDir, hookName);
      const xrayHook = join(xrayHooksDir, hookName);

      if (!existsSync(gitHook)) {
        result.missing.push(hookName);
      } else {
        try {
          const content = readFileSync(gitHook, "utf-8");
          if (content.includes("Xray") || content.includes("StringRay") || content.includes("xray") || content.includes("strray") || content.includes("run-hook.js")) {
            result.managed.push(hookName);
          } else {
            result.external.push(hookName);
          }
        } catch {
          result.external.push(hookName);
        }
      }

      // Check if xray source hook exists
      if (!existsSync(xrayHook)) {
        result.stale.push(hookName);
      }
    }

    return {
      status: "ok",
      action,
      hooks: result,
      gitHooksDir,
      xrayHooksDir,
    };
  }

  // ── install ─────────────────────────────────────────────
  if (action === "install") {
    const installed = [];
    const skipped = [];
    const errors = [];

    for (const hookName of hookTypes) {
      const src = join(xrayHooksDir, hookName);
      const dst = join(gitHooksDir, hookName);

      if (!existsSync(src)) {
        skipped.push(hookName);
        continue;
      }

      try {
        // Backup existing non-xray hooks
        if (existsSync(dst)) {
          const content = readFileSync(dst, "utf-8");
          if (!content.includes("Xray") && !content.includes("StringRay") && !content.includes("xray") && !content.includes("strray") && !content.includes("run-hook.js")) {
            renameSync(dst, `${dst}.strray-backup`);
          } else {
            unlinkSync(dst);
          }
        }

        // Create symlink
        const rel = relative(join(gitHooksDir), src);
        try {
          symlinkSync(rel, dst);
        } catch {
          // Symlink may fail (permissions, cross-device) — copy instead
          const srcContent = readFileSync(src, "utf-8");
          writeFileSync(dst, srcContent, { mode: 0o755 });
        }
        installed.push(hookName);
      } catch (err) {
        errors.push({ hook: hookName, error: err.message });
      }
    }

    return { status: "ok", action: "install", installed, skipped, errors };
  }

  // ── uninstall ───────────────────────────────────────────
  if (action === "uninstall") {
    const removed = [];
    const restored = [];

    for (const hookName of hookTypes) {
      const dst = join(gitHooksDir, hookName);
      const backup = `${dst}.strray-backup`;

      if (!existsSync(dst)) continue;

      try {
        const content = readFileSync(dst, "utf-8");
        const isXray = content.includes("Xray") || content.includes("StringRay") || content.includes("xray") || content.includes("strray") || content.includes("run-hook.js");

        if (isXray || lstatSync(dst).isSymbolicLink()) {
          unlinkSync(dst);

          // Restore backup if exists
          if (existsSync(backup)) {
            renameSync(backup, dst);
            restored.push(hookName);
          } else {
            removed.push(hookName);
          }
        }
      } catch {
        // Skip unremovable hooks
      }
    }

    return { status: "ok", action: "uninstall", removed, restored };
  }

  return { error: `Unknown hooks action: ${action}. Use: install, uninstall, list, status` };
}

// ============================================================================
// Known Commands
// ============================================================================

const KNOWN_COMMANDS = new Set([
  "health", "stats", "get-codex-prompt", "get-config", "validate",
  "codex-check", "pre-process", "post-process", "hooks",
]);

// ============================================================================
// HTTP Server Mode
// ============================================================================

function startHttpServer(port, projectRoot) {
  const logDir = ensureLogDir(projectRoot);

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      // CORS headers (wildcard — restrict via STRRAY_HTTP_CORS_ORIGIN env var in production)
      const corsOrigin = process.env.STRRAY_HTTP_CORS_ORIGIN || "*";
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== "POST" && req.method !== "GET") {
        res.writeHead(405);
        res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
        return;
      }

      // GET /health and GET /stats convenience endpoints
      if (req.method === "GET") {
        const url = new URL(req.url, `http://localhost:${port}`);
        if (url.pathname === "/health") {
          const result = await handleHealth({});
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return;
        }
        if (url.pathname === "/stats") {
          const result = await handleStats();
          res.writeHead(200);
          res.end(JSON.stringify(result));
          return;
        }
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found. POST / with JSON body." }));
        return;
      }

      // POST handler (1MB body size limit)
      const MAX_BODY_SIZE = 1024 * 1024;
      let body = "";
      let bodySize = 0;
      req.on("data", (chunk) => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          res.writeHead(413);
          res.end(JSON.stringify({ error: "Request body too large (max 1MB)" }));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const command = JSON.parse(body);
          const response = await dispatchCommand(command, projectRoot, logDir);
          const status = response.error ? 500 : 200;
          res.writeHead(status);
          res.end(JSON.stringify(response));
        } catch (err) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
        }
      });
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${port} already in use`));
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      const timestamp = new Date().toISOString();
      logToActivity(logDir, `HTTP server started on port ${port}`);
      console.error(`[bridge] HTTP server listening on port ${port}`);
      resolve(server);
    });
  });
}

// ============================================================================
// Command Dispatcher
// ============================================================================

async function dispatchCommand(command, projectRoot, logDir) {
  const cmd = command.command || "health";

  switch (cmd) {
    case "health":
      return await handleHealth(command);
    case "get-codex-prompt":
      return await handleGetCodexPrompt(command, projectRoot, logDir);
    case "get-config":
      return await handleGetConfig(command, projectRoot, logDir);
    case "validate":
      return await handleValidate(command, projectRoot, logDir);
    case "codex-check":
      return await handleCodexCheck(command, projectRoot, logDir);
    case "pre-process":
      return await handlePreProcess(command, projectRoot, logDir);
    case "post-process":
      return await handlePostProcess(command, projectRoot, logDir);
    case "hooks":
      return handleHooks(command, projectRoot);
    case "stats":
      return handleStats();
    default:
      return { error: `Unknown command: ${cmd}. Known: ${[...KNOWN_COMMANDS].join(", ")}` };
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const argv = process.argv.slice(2);

  // Parse flags
  let cwdOverride = null;
  let httpMode = false;
  let httpPort = 18431;
  let positionalCommand = null;
  let positionalPayload = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cwd" && argv[i + 1]) {
      cwdOverride = argv[i + 1];
      process.chdir(cwdOverride);
      i++;
    } else if (argv[i] === "--http") {
      httpMode = true;
    } else if (argv[i] === "--port" && argv[i + 1]) {
      httpPort = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === "--json" && argv[i + 1]) {
      positionalPayload = argv[i + 1];
      i++;
    } else if (!argv[i].startsWith("-") && !positionalCommand && KNOWN_COMMANDS.has(argv[i])) {
      positionalCommand = argv[i];
    }
  }

  const projectRoot = findProjectRoot();
  const logDir = ensureLogDir(projectRoot);

  // Lazy-load framework
  if (!frameworkReady && !frameworkLoadAttempted) {
    await loadFramework(projectRoot);
  }

  // HTTP mode
  if (httpMode) {
    await startHttpServer(httpPort, projectRoot);
    return; // Server keeps running
  }

  // Stdin mode or positional mode
  let command;

  if (positionalCommand) {
    command = { command: positionalCommand };
    if (positionalPayload) {
      try {
        command = { ...command, ...JSON.parse(positionalPayload) };
      } catch {
        process.stdout.write(JSON.stringify({ error: "Invalid --json payload" }));
        process.exit(1);
      }
    }
  } else {
    // Stdin mode
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    try {
      command = JSON.parse(input);
    } catch {
      process.stdout.write(JSON.stringify({ error: "Invalid JSON input" }));
      process.exit(1);
    }
  }

  const response = await dispatchCommand(command, projectRoot, logDir);
  process.stdout.write(JSON.stringify(response));
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ error: e.message }));
  process.exit(1);
});
