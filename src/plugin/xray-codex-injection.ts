/**
 * Consumer runtime compat shim from prior StringRay releases (1-line min per Scope Rule; xray codex injection + XRAY_||STRRAY_ env + .strray fallbacks).
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

import type { ProcessorConfig, ProcessorResult } from "../processors/processor-manager.js";
import type { ProcessorContext } from "../processors/processor-types.js";
import type { StateManager } from "../state/state-manager.js";
import type { FeaturesConfig, TaskType } from "../core/features-config.js";
import type { RuleValidationContext } from "../enforcement/types.js";

// ---------------------------------------------------------------------------
// Local type definitions for dynamically loaded modules
// ---------------------------------------------------------------------------

interface FrameworkLoggerLike {
  log(module: string, event: string, status: string, data?: Record<string, string | number | boolean>): void;
}

interface ProcessorRegistrationConfig {
  name: string;
  type: "pre" | "post";
  priority: number;
  enabled: boolean;
}

interface PreProcessorInput {
  tool?: string;
  args?: unknown;
  context?: unknown;
}

interface PreProcessorContext {
  filePath?: string;
  operation?: string;
  content?: string;
  directory?: string;
  tool?: string;
}

interface PreProcessorResult {
  success: boolean;
  results: ProcessorResult[];
}

interface StateManagerLike {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

interface FeaturesConfigLoaderLike {
  loadConfig(): FeaturesConfig;
}

type ResolveCodexPathFn = (root: string) => string[];
type ResolveStateDirFn = (projectRoot?: string) => string;
type SystemPromptGeneratorFn = (config: SystemPromptConfigLike) => Promise<string>;

interface SystemPromptConfigLike {
  showWelcomeBanner?: boolean;
  showCodexContext?: boolean;
  enableTokenOptimization?: boolean;
  maxTokenBudget?: number;
  showCriticalTermsOnly?: boolean;
  showEssentialLinks?: boolean;
}

interface ToolExecuteAfterInput {
  tool: string;
  args?: ToolArguments;
  result?: ToolResult;
}

interface ToolExecuteBeforeOutput {
  model?: string;
}

interface ToolArguments {
  content?: string;
  filePath?: string;
  command?: string;
  prompt?: string;
  message?: string;
  directory?: string;
  replace?: boolean;
}

interface ToolResult {
  success?: boolean;
  error?: string;
  content?: string;
}

// ---------------------------------------------------------------------------
// Dynamic module holders (loaded via candidate-based resolution)
// ---------------------------------------------------------------------------

let _resolveCodexPath: ResolveCodexPathFn | null = null;
let _resolveStateDir: ResolveStateDirFn | null = null;
let _frameworkLogger: FrameworkLoggerLike | null = null;
let _systemPromptGenerator: SystemPromptGeneratorFn | null = null;

let _ProcessorManager: any = null;
let _StrRayStateManager: (new (persistencePath?: string) => StateManagerLike) | null = null;
let _featuresConfigLoader: FeaturesConfigLoaderLike | null = null;
let _detectTaskType: DetectTaskTypeFn | null = null;

interface ProcessorManagerLike {
  registerProcessor(config: ProcessorConfig): void;
  executePreProcessors(input: PreProcessorInput): Promise<PreProcessorResult>;
  executePostProcessors(operation: string, data: ProcessorContext, preResults: ProcessorResult[]): Promise<ProcessorResult[]>;
}

type DetectTaskTypeFn = (toolName: string, context?: { fileCount?: number; isComplex?: boolean }) => TaskType;

type ModuleWithProcessorManager = { ProcessorManager: new (sm: StateManagerLike) => ProcessorManagerLike };
type ModuleWithStateManager = { StrRayStateManager: new (persistencePath?: string) => StateManagerLike };
type ModuleWithFeaturesConfig = { featuresConfigLoader: FeaturesConfigLoaderLike; detectTaskType: DetectTaskTypeFn };
type ModuleWithSystemPrompt = { generateLeanSystemPrompt: SystemPromptGeneratorFn };

// ---------------------------------------------------------------------------
// Module loaders (candidate-based resolution for dev, dist, and consumer paths)
// ---------------------------------------------------------------------------

async function loadFrameworkLogger(): Promise<FrameworkLoggerLike> {
  if (_frameworkLogger) return _frameworkLogger;
  const candidates = [
    "../core/framework-logger.js",
    "../../node_modules/0xray/dist/core/framework-logger.js",
  ];
  for (const p of candidates) {
    try {
      const mod: { frameworkLogger: FrameworkLoggerLike } = await import(p) as { frameworkLogger: FrameworkLoggerLike };
      _frameworkLogger = mod.frameworkLogger;
      return _frameworkLogger;
    } catch (_) {
      // try next candidate
    }
  }
  _frameworkLogger = {
    log: (_module: string, _event: string, _status: string, _data?: Record<string, string | number | boolean>) => {},
  };
  return _frameworkLogger;
}

async function loadConfigPaths(): Promise<void> {
  if (_resolveCodexPath && _resolveStateDir) return;
  const candidates = [
    "../core/config-paths.js",
    "../../node_modules/0xray/dist/core/config-paths.js",
  ];
  for (const p of candidates) {
    try {
      const mod: { resolveCodexPath: ResolveCodexPathFn; resolveStateDir: ResolveStateDirFn } = await import(p) as { resolveCodexPath: ResolveCodexPathFn; resolveStateDir: ResolveStateDirFn };
      _resolveCodexPath = mod.resolveCodexPath;
      _resolveStateDir = mod.resolveStateDir;
      return;
    } catch (_) {
      // try next candidate
    }
  }
  const logger = await loadFrameworkLogger();
  logger.log("strray-codex-plugin", "config-paths-load-failed", "warning", { warning: "Failed to load config-paths module from any location" });
}

async function resolveCodexPath(root: string): Promise<string[]> {
  await loadConfigPaths();
  if (!_resolveCodexPath) throw new Error("resolveCodexPath not available after loading");
  return _resolveCodexPath(root);
}

async function resolveStateDir(root?: string): Promise<string> {
  await loadConfigPaths();
  if (!_resolveStateDir) throw new Error("resolveStateDir not available after loading");
  return _resolveStateDir(root);
}

async function importSystemPromptGenerator(): Promise<void> {
  if (_systemPromptGenerator) return;

  const candidates = [
    "../core/system-prompt-generator.js",
    "../../node_modules/0xray/dist/core/system-prompt-generator.js",
  ];
  for (const p of candidates) {
    try {
      const module: ModuleWithSystemPrompt = await import(p) as ModuleWithSystemPrompt;
      _systemPromptGenerator = module.generateLeanSystemPrompt;
      return;
    } catch (_) {
      // try next candidate
    }
  }
  const logger = await loadFrameworkLogger();
  logger.log("strray-codex-plugin", "system-prompt-generator-load-failed", "warning", { warning: "Failed to load lean system prompt generator, using fallback" });
}

function validateModulePath(resolvedPath: string, allowedPrefix: string): void {
  const normalized = path.resolve(resolvedPath);
  const allowed = path.resolve(allowedPrefix);
  if (!normalized.startsWith(allowed)) {
    throw new Error(
      `Module path validation failed: ${normalized} is outside allowed path ${allowed}`,
    );
  }
}

async function loadStringRayComponents(): Promise<void> {
  if (_ProcessorManager && _StrRayStateManager && _featuresConfigLoader) return;

  const logger = await getOrCreateLogger(process.cwd());

  try {
    // FIXED: Removed hardcoded ../../dist/ paths (source of dist/dist build corruption)
    // Using dynamic resolution instead
    const root = process.cwd();
    const distPrefix = path.join(root, 'dist');
    validateModulePath(`${root}/dist/processors/processor-manager.js`, distPrefix);
    validateModulePath(`${root}/dist/state/state-manager.js`, distPrefix);
    validateModulePath(`${root}/dist/core/features-config.js`, distPrefix);
    const procModule = await import(`${root}/dist/processors/processor-manager.js`);
    const stateModule = await import(`${root}/dist/state/state-manager.js`);
    const featuresModule = await import(`${root}/dist/core/features-config.js`);
    _ProcessorManager = procModule.ProcessorManager;
    _StrRayStateManager = stateModule.StrRayStateManager;
    _featuresConfigLoader = featuresModule.featuresConfigLoader;
    _detectTaskType = featuresModule.detectTaskType;
    logger.log(`✅ Loaded from cwd/dist/`);
    return;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.log(`❌ Failed to load from cwd/dist/: ${message}`);
  }

  const pluginPaths = ["0xray", "strray-framework"];

  for (const pluginPath of pluginPaths) {
    try {
      // FIXED: Avoided hardcoded /dist/ in node_modules paths to prevent build corruption
      const nodeModulesPrefix = path.join(process.cwd(), 'node_modules');
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/processors/processor-manager.js`, nodeModulesPrefix);
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/state/state-manager.js`, nodeModulesPrefix);
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/core/features-config.js`, nodeModulesPrefix);
      const pm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/processors/processor-manager.js`);
      const sm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/state/state-manager.js`);
      const fm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/core/features-config.js`);
      _ProcessorManager = pm.ProcessorManager;
      _StrRayStateManager = sm.StrRayStateManager;
      _featuresConfigLoader = fm.featuresConfigLoader;
      _detectTaskType = fm.detectTaskType;
      logger.log(`✅ Loaded from node_modules/${pluginPath}/dist/`);
      return;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      logger.log(`❌ Failed to load from node_modules/${pluginPath}/dist/: ${message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnPromise(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "inherit", "pipe"],
    });
    let stderr = "";

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout: "", stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

class PluginLogger {
  private logPath: string;

  constructor(directory: string) {
    const logsDir = path.join(directory, ".opencode", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const today = new Date().toISOString().split("T")[0];
    this.logPath = path.join(logsDir, `strray-plugin-${today}.log`);
  }

  async logAsync(message: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${message}\n`;
      await fs.promises.appendFile(this.logPath, logEntry, "utf-8");
    } catch {
      // Silent fail - logging failure should not break plugin
    }
  }

  log(message: string): void {
    void this.logAsync(message);
  }

  error(message: string, error?: unknown): void {
    const errorDetail = error instanceof Error ? `: ${error.message}` : "";
    this.log(`ERROR: ${message}${errorDetail}`);
  }
}

let loggerInstance: PluginLogger | null = null;
let loggerInitPromise: Promise<PluginLogger> | null = null;

async function getOrCreateLogger(directory: string): Promise<PluginLogger> {
  if (loggerInstance) {
    return loggerInstance;
  }

  if (loggerInitPromise) {
    return loggerInitPromise;
  }

  loggerInitPromise = (async () => {
    const logger = new PluginLogger(directory);
    loggerInstance = logger;
    return logger;
  })();

  return loggerInitPromise;
}

function getFrameworkVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "1.4.6";
  } catch {
    return "1.4.6";
  }
}

function getFrameworkIdentity(): string {
  const version = getFrameworkVersion();
  return `0xRay Framework v${version} - AI Orchestration

🔧 Core: architect, code-reviewer, refactorer, testing-lead, strategist
📚 Codex: 5 Essential Terms (99.6% Error Prevention Target)
🎯 Goal: Progressive, production-ready development workflow

📖 Documentation: config dir (codex, config, agents docs) — resolved via config-paths
`;
}

// ---------------------------------------------------------------------------
// Enforcer quality gate
// ---------------------------------------------------------------------------

async function runEnforcerQualityGate(
  input: { tool: string; args?: { content?: string; filePath?: string } },
  logger: PluginLogger,
): Promise<{ passed: boolean; violations: string[] }> {
  const violations: string[] = [];
  const { tool, args } = input;

  try {
    const { RuleEnforcer } = await import("../enforcement/rule-enforcer.js");
    const ruleEnforcer = new RuleEnforcer();

    const context: RuleValidationContext = {
      operation: tool === "write" ? "write" : tool === "edit" ? "edit" : "read",
    };

    if (args?.filePath) {
      context.files = [args.filePath];
    }

    if (args?.content) {
      context.newCode = args.content;
    }

    const report = await ruleEnforcer.validateOperation(tool, context);

    const blockingViolations: string[] = [];
    const allViolations: string[] = [];

    if (report.errors && report.errors.length > 0) {
      for (const error of report.errors) {
        allViolations.push(error);
        blockingViolations.push(error);
      }
    }

    if (report.results) {
      for (const result of report.results) {
        if (!result.passed) {
          const isBlocking = result.severity === "error" || result.severity === "blocking" || result.severity === "high";
          allViolations.push(result.message);
          if (isBlocking) {
            blockingViolations.push(result.message);
          }
        }
      }
    }

    if (allViolations.length > 0) {
      logger.log(`⚠️ ENFORCER: ${allViolations.length} rule violation(s) detected`);
      for (const v of allViolations.slice(0, 5)) {
        logger.log(`   - ${v}`);
      }
      if (allViolations.length > 5) {
        logger.log(`   ... and ${allViolations.length - 5} more`);
      }
    }

    const passed = blockingViolations.length === 0;
    violations.push(...blockingViolations);

    if (!passed) {
      logger.error(`🚫 Quality Gate FAILED with ${blockingViolations.length} blocking violation(s)`);
    } else {
      logger.log(`✅ Quality Gate PASSED (${allViolations.length} warning(s))`);
    }

    return { passed, violations };
  } catch (error) {
    logger.log(`Warning: RuleEnforcer unavailable, using fallback checks: ${error instanceof Error ? (error as Error).message : String(error)}`);

    if (tool === "write" && args?.filePath) {
      const filePath = args.filePath;
      if (
        filePath.endsWith(".ts") &&
        !filePath.includes(".test.") &&
        !filePath.includes(".spec.")
      ) {
        const testPath = filePath.replace(".ts", ".test.ts");
        const specPath = filePath.replace(".ts", ".spec.ts");
        if (!fs.existsSync(testPath) && !fs.existsSync(specPath)) {
          violations.push(`tests-required: No test file found for ${filePath}`);
        }
      }
    }

    if (args?.content) {
      const errorPatterns = [/console\.log\s*\(/g, /TODO\s*:/gi, /FIXME\s*:/gi];
      for (const pattern of errorPatterns) {
        if (pattern.test(args.content)) {
          violations.push(`resolve-all-errors: Found error pattern in code`);
          break;
        }
      }
    }

    const passed = violations.length === 0;
    if (!passed) {
      logger.error(`🚫 Fallback Quality Gate FAILED with ${violations.length} violation(s)`);
    } else {
      logger.log(`✅ Fallback Quality Gate PASSED`);
    }

    return { passed, violations };
  }
}

// ---------------------------------------------------------------------------
// Codex context loading
// ---------------------------------------------------------------------------

interface CodexContextEntry {
  id: string;
  source: string;
  content: string;
  priority: "critical" | "high" | "normal" | "low";
  metadata: {
    version: string;
    termCount: number;
    loadedAt: string;
  };
}

let cachedCodexContexts: CodexContextEntry[] | null = null;

async function getCodexFileLocations(directory?: string): Promise<string[]> {
  const root = directory || process.cwd();
  const resolved = await resolveCodexPath(root);
  resolved.push(
    path.join(root, ".opencode", "codex.codex"),
    path.join(root, ".strray", "agents_template.md"),
    path.join(root, ".opencode", "strray", "agents_template.md"),
    path.join(root, "AGENTS.md"),
  );
  return resolved;
}

function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    const logger = new PluginLogger(process.cwd());
    logger.error(`Failed to read file ${filePath}`, error);
    return null;
  }
}

function extractCodexMetadata(content: string): { version: string; termCount: number } {
  if (content.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(content);
      const version = parsed.version || "1.6.0";
      const terms = parsed.terms || {};
      const termCount = Object.keys(terms).length;
      return { version, termCount };
    } catch {
      // Not valid JSON, try markdown format
    }
  }

  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch?.[1] ?? "1.6.0";

  const termMatches = content.match(/####\s*\d+\.\s/g);
  const termCount = termMatches ? termMatches.length : 0;

  return { version, termCount };
}

function createCodexContextEntry(filePath: string, content: string): CodexContextEntry {
  const metadata = extractCodexMetadata(content);

  return {
    id: `strray-codex-${path.basename(filePath)}`,
    source: filePath,
    content,
    priority: "critical",
    metadata: {
      version: metadata.version,
      termCount: metadata.termCount,
      loadedAt: new Date().toISOString(),
    },
  };
}

async function loadCodexContext(directory: string): Promise<CodexContextEntry[]> {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }

  const codexContexts: CodexContextEntry[] = [];

  const locations = await getCodexFileLocations(directory);
  for (const fileLocation of locations) {
    const fullPath = path.isAbsolute(fileLocation) ? fileLocation : path.join(directory, fileLocation);
    const content = readFileContent(fullPath);

    if (content && content.trim().length > 0) {
      const entry = createCodexContextEntry(fullPath, content);
      if (entry.metadata.termCount > 0) {
        codexContexts.push(entry);
      }
    }
  }

  cachedCodexContexts = codexContexts;

  if (codexContexts.length === 0) {
    void getOrCreateLogger(directory).then((l) =>
      l.error(`No valid codex files found. Checked: ${locations.join(", ")}`),
    );
  }

  return codexContexts;
}

function formatCodexContext(contexts: CodexContextEntry[]): string {
  if (contexts.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const context of contexts) {
    parts.push(
      `# 0xRay Codex Context v${context.metadata.version}`,
      `Source: ${context.source}`,
      `Terms Loaded: ${context.metadata.termCount}`,
      `Loaded At: ${context.metadata.loadedAt}`,
      "",
      context.content,
      "",
      "---",
      "",
    );
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Analytics and task classification
// ---------------------------------------------------------------------------

const INFERENCE_TUNE_INTERVAL = 100;
let _openCodeToolCallCount = 0;
let _lastTuneToolCallCount = 0;

const TOOL_AGENT_MAP: Record<string, { agent: string; skill: string }> = {
  write:     { agent: "code-reviewer", skill: "write" },
  edit:      { agent: "code-reviewer", skill: "edit" },
  multiedit: { agent: "code-reviewer", skill: "multiedit" },
  bash:      { agent: "testing-lead", skill: "execution" },
  search:    { agent: "researcher",    skill: "search" },
  read:      { agent: "researcher",    skill: "read" },
  glob:      { agent: "researcher",    skill: "glob" },
  grep:      { agent: "researcher",    skill: "search" },
  ls:        { agent: "researcher",    skill: "list" },
};

function classifyTaskType(tool: string, args?: ToolArguments): string {
  const cmd = String(args?.command ?? "").toLowerCase().trim();

  if (tool === "bash" && cmd) {
    if (/(npm|yarn|pnpm)\s+test|jest|vitest|mocha|pytest/.test(cmd)) return "testing";
    if (/(npm|yarn|pnpm)\s+run|npx|cargo|go run|make\s/.test(cmd)) return "build";
    if (/audit|security|snyk|owasp|bandit/.test(cmd)) return "security";
    if (/eslint|prettier|black|ruff|lint|format/.test(cmd)) return "lint";
    if (/git\s/.test(cmd)) return "git";
    if (/(npm|yarn|pnpm)\s+install|pip install|cargo add/.test(cmd)) return "install";
    if (/grep|rg |find |ls |cat |head |tail /.test(cmd)) return "search";
  }

  if (tool === "write") return "write";
  if (tool === "edit" || tool === "multiedit") return "edit";
  if (tool === "read") return "read";
  if (tool === "search" || tool === "grep" || tool === "glob") return "search";

  return "unknown";
}

// ---------------------------------------------------------------------------
// Shared helpers extracted from duplicated plugin logic
// ---------------------------------------------------------------------------

function isWriteEditOperation(tool: string): boolean {
  return tool === "write" || tool === "edit" || tool === "multiedit";
}

function isPublishOperation(tool: string): boolean {
  return tool === "publish" || tool === "release" || tool === "npm-publish" || tool === "strray-release";
}

function resolveAgentName(input: { agentType?: string } | undefined): string {
  const globalAgent = globalThis.currentAgent;
  if (globalAgent?.agentType) return globalAgent.agentType;
  if (globalAgent?.type) return globalAgent.type;
  if (input?.agentType) return input.agentType;
  return "architect";
}

function registerAllProcessors(pm: ProcessorManagerLike): void {
  pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
  pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
  pm.registerProcessor({ name: "versionCompliance", type: "pre", priority: 25, enabled: true });
  pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 5, enabled: true });
  pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
  pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}

function registerAfterPostProcessors(pm: ProcessorManagerLike): void {
  pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 50, enabled: true });
  pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
  pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}

function logPreProcessorResults(results: PreProcessorResult, logger: PluginLogger): void {
  logger.log(
    `📊 Pre-processor result: ${results.success ? "SUCCESS" : "FAILED"} (${results.results.length} processors)`,
  );

  if (!results.success) {
    const failures = results.results.filter((r) => !r.success);
    for (const f of failures) {
      logger.error(`❌ Pre-processor ${f.processorName} failed: ${f.error}`);
    }
  } else {
    for (const r of results.results) {
      logger.log(`✅ Pre-processor ${r.processorName}: ${r.success ? "OK" : "FAILED"}`);
    }
  }
}

function logPostProcessorResults(results: ProcessorResult[], logger: PluginLogger): void {
  const allSuccess = results.every((r) => r.success);
  logger.log(
    `📊 Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${results.length} processors)`,
  );

  for (const r of results) {
    if (r.success) {
      logger.log(`✅ Post-processor ${r.processorName}: OK`);
    } else {
      logger.error(`❌ Post-processor ${r.processorName} failed: ${r.error}`);
    }
  }
}

function logTestAutoCreationResult(results: ProcessorResult[], logger: PluginLogger): void {
  const testAutoResult = results.find((r) => r.processorName === "testAutoCreation");
  if (testAutoResult) {
    const data = testAutoResult.data as { testCreated?: boolean; testFile?: string } | undefined;
    if (testAutoResult.success && data?.testCreated && data?.testFile) {
      logger.log(`✅ TEST AUTO-CREATION: Created ${data.testFile}`);
    } else if (!testAutoResult.success) {
      logger.log(`ℹ️ TEST AUTO-CREATION: ${testAutoResult.error ?? "skipped - no new files"}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main plugin function
// ---------------------------------------------------------------------------

export default async function strrayCodexPlugin(input: {
  client?: string;
  directory?: string;
  worktree?: string;
}) {
  const { directory: inputDirectory } = input;
  const directory = inputDirectory || process.cwd();

  return {
    "experimental.chat.system.transform": async (
      _input: Record<string, unknown>,
      output: { system?: string[] },
    ) => {
      try {
        await importSystemPromptGenerator();

        let leanPrompt = getFrameworkIdentity();

        if (_systemPromptGenerator) {
          leanPrompt = await _systemPromptGenerator({
            showWelcomeBanner: true,
            showCodexContext: false,
            enableTokenOptimization: true,
            maxTokenBudget: 8192,
            showCriticalTermsOnly: true,
            showEssentialLinks: true,
          });
        }

        if (output.system && Array.isArray(output.system)) {
          output.system = [leanPrompt];
        }
      } catch (error) {
        const logger = await getOrCreateLogger(directory);
        logger.error("System prompt injection failed:", error);
        const fallback = getFrameworkIdentity();
        if (output.system && Array.isArray(output.system)) {
          output.system = [fallback];
        }
      }
    },

    "tool.execute.before": async (
      input: {
        tool: string;
        args?: { content?: string; filePath?: string };
      },
      output: ToolExecuteBeforeOutput,
    ) => {
      const logger = await getOrCreateLogger(directory);
      logger.log(`🚀 TOOL EXECUTE BEFORE HOOK FIRED: ${input.tool}`);
      logger.log(`📥 Full input: ${JSON.stringify(input)}`);
      await loadStringRayComponents();

      if (_featuresConfigLoader && _detectTaskType) {
        try {
          const config = _featuresConfigLoader.loadConfig();
          if (config.model_routing?.enabled) {
            const taskType = _detectTaskType(input.tool);
            const routing = taskType !== "unknown" 
              ? config.model_routing.task_routing?.[taskType]
              : undefined;
            if (routing?.model) {
              output.model = routing.model;
              logger.log(`Model routed: ${input.tool} → ${taskType} → ${routing.model}`);
            }
          }
        } catch (e) {
          logger.error("Model routing error", e);
        }
      }

      const { tool, args } = input;

      const qualityGateResult = await runEnforcerQualityGate(input, logger);
      if (!qualityGateResult.passed) {
        logger.error(`🚫 Quality gate failed: ${qualityGateResult.violations.join(", ")}`);
        throw new Error(`ENFORCER BLOCKED: ${qualityGateResult.violations.join("; ")}`);
      }
      logger.log(`✅ Quality gate passed for ${tool}`);

      if (isWriteEditOperation(tool)) {
        if (!_ProcessorManager || !_StrRayStateManager) {
          logger.error("ProcessorManager or StrRayStateManager not loaded");
          return;
        }

        let stateManager: StateManagerLike;
        let processorManager: ProcessorManagerLike | null;

        const globalState = globalThis.strRayStateManager;
        if (globalState) {
          logger.log("🔗 Connecting to booted 0xRay framework");
          stateManager = globalState as StateManagerLike;
        } else {
          logger.log("🚀 0xRay framework not booted, initializing...");
          stateManager = new _StrRayStateManager(
            await resolveStateDir(directory),
          );
          globalThis.strRayStateManager = stateManager as typeof globalThis.strRayStateManager;
        }

        processorManager = stateManager.get<ProcessorManagerLike>("processor:manager") ?? null;

        if (!processorManager) {
          logger.log("⚙️ Creating and registering processors...");
          processorManager = new _ProcessorManager(stateManager) as ProcessorManagerLike;
          registerAllProcessors(processorManager);
          stateManager.set("processor:manager", processorManager);
          logger.log("✅ Processors registered successfully");
        } else {
          logger.log("✅ Using existing processor manager");
        }

        try {
          logger.log(`▶️ Executing pre-processors for ${tool}...`);
          const preProcessorInput = {
            tool,
            args: args as Record<string, string | number | boolean> | undefined,
            context: {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
            },
          };
          const result = await processorManager!.executePreProcessors(preProcessorInput as unknown as PreProcessorInput);

          logPreProcessorResults(result, logger);
        } catch (error) {
          logger.error(`💥 Pre-processor execution error`, error);
        }

        try {
          logger.log(`▶️ Executing post-processors for ${tool}...`);
          logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);

          const agentName = resolveAgentName(input as { agentType?: string });

          const postProcessorContext = {
            directory,
            operation: tool,
            filePath: args?.filePath,
            success: true,
            agentName,
            metadata: {
              isPublishing: isPublishOperation(tool),
              hook: "tool_execution",
              toolName: tool,
              timestamp: Date.now(),
              agentType: agentName,
            },
          } as unknown as ProcessorContext;

          const postResults = await processorManager!.executePostProcessors(
            tool,
            postProcessorContext,
            [],
          );

          logPostProcessorResults(postResults, logger);
        } catch (error) {
          logger.error(`💥 Post-processor execution error`, error);
        }
      }
    },

    "tool.execute.after": async (
      input: ToolExecuteAfterInput,
      _output: Record<string, unknown>,
    ) => {
      const logger = await getOrCreateLogger(directory);
      await loadStringRayComponents();

      const { tool, args, result } = input;

      try {
        const { routingOutcomeTracker } = await import(
          "../delegation/analytics/outcome-tracker.js"
        );
        const mapping = TOOL_AGENT_MAP[tool];
        const taskType = classifyTaskType(tool, args as Record<string, unknown> | undefined);
        const rawDesc = args?.content
          ? String(args.content).slice(0, 150)
          : args?.filePath
            ? String(args.filePath)
            : args?.command
              ? String(args.command).slice(0, 150)
              : tool;
        const description = `[${taskType}] ${rawDesc}`;
        const outcomeFields: Record<string, unknown> = {
          taskId: `opencode-${_openCodeToolCallCount}`,
          taskDescription: description,
          routedAgent: mapping?.agent ?? "direct",
          routedSkill: mapping?.skill ?? tool,
          confidence: mapping ? 0.8 : 0.5,
          success: result?.error == null,
          routingMethod: mapping ? "keyword" : "default",
        };
        if (taskType !== "unknown") outcomeFields.taskType = taskType;
        routingOutcomeTracker.recordOutcome(
          outcomeFields as Parameters<typeof routingOutcomeTracker.recordOutcome>[0]
        );
      } catch {
        // Outcome tracker not available — skip silently
      }

      logger.log(
        `📥 After hook input: ${JSON.stringify({ tool, hasArgs: !!args, args, hasResult: !!result }).slice(0, 200)}`,
      );

      if (isWriteEditOperation(tool)) {
        if (!_ProcessorManager || !_StrRayStateManager) return;

        const stateManager = new _StrRayStateManager(
          await resolveStateDir(directory),
        );
        const processorManager = new _ProcessorManager(stateManager);

        registerAfterPostProcessors(processorManager);

        try {
          logger.log(`📝 Post-processor tool: ${tool}`);
          logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
          logger.log(`📝 Post-processor directory: ${directory}`);

          const postProcessorContext = {
            directory,
            operation: tool,
            filePath: args?.filePath,
            success: result?.success !== false,
            metadata: {
              isPublishing: isPublishOperation(tool),
              hook: "tool_execution",
              toolName: tool,
              timestamp: Date.now(),
            },
          };

          const postResults = await processorManager.executePostProcessors(
            tool,
            postProcessorContext,
            [],
          );

          logPostProcessorResults(postResults, logger);
          logTestAutoCreationResult(postResults, logger);
        } catch (error) {
          logger.error(`💥 Post-processor error`, error);
        }
      }

      _openCodeToolCallCount++;
      if (
        _openCodeToolCallCount - _lastTuneToolCallCount >= INFERENCE_TUNE_INTERVAL
      ) {
        _lastTuneToolCallCount = _openCodeToolCallCount;
        try {
          const { inferenceTuner } = await import(
            "../services/inference-tuner.js"
          );
          inferenceTuner
            .runTuningCycle()
            .then(() => {
              logger.log(
                `🔄 Inference tuning cycle completed (call #${_openCodeToolCallCount})`,
              );
            })
            .catch((err: unknown) => {
              logger.log(
                `⚠️ Inference tuning cycle skipped: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        } catch {
          // Tuner not available in this environment — skip silently
        }

        // DISABLED: Auto governance proposal voting causes runaway token consumption
        // See bug fix: inference cycle auto-trigger disabled to prevent recursive
        // opencode process spawning via invokeViaOpencode() → architect → task subagents
        //
        // try {
        //   const { InferenceCycle } = await import(
        //     "../inference/inference-cycle.js"
        //   );
        //   const cycle = new InferenceCycle(directory);
        //   cycle.maybeRunCycle()...
        // } catch {}
      }
    },

    "chat.message": async (
      input: { parts?: Array<{ type?: string; text?: string }> },
      output: { parts?: Array<{ type?: string; text?: string }> },
    ) => {
      const logger = await getOrCreateLogger(directory);

      if (!output.parts) {
        return;
      }

      const textContent = input.parts?.find(p => p.type === "text")?.text ?? "";
      if (!textContent) {
        return;
      }

      const agentMentionRegex = /@(\w+)(?:\s+(.+?))?(?=$|\n\n|\r\r)/g;
      let match;
      let hasAgentMention = false;
      let transformedText = textContent;

      const knownAgents: Record<string, string> = {
        "architect": "architect",
        "strategist": "strategist",
        "testing-lead": "testing-lead",
        "bug-triage-specialist": "bug-triage-specialist",
        "code-reviewer": "code-reviewer",
        "security-auditor": "security-auditor",
        "refactorer": "refactorer",
        "researcher": "researcher",
        "code-analyzer": "code-analyzer",
        "frontend-engineer": "frontend-engineer",
        "frontend-ui-ux-engineer": "frontend-ui-ux-engineer",
        "backend-engineer": "backend-engineer",
        "database-engineer": "database-engineer",
        "devops-engineer": "devops-engineer",
        "performance-engineer": "performance-engineer",
        "mobile-developer": "mobile-developer",
        "content-creator": "content-creator",
        "growth-strategist": "growth-strategist",
        "seo-consultant": "seo-consultant",
        "tech-writer": "tech-writer",
        "multimodal-looker": "multimodal-looker",
        "log-monitor": "log-monitor",
      };

      while ((match = agentMentionRegex.exec(textContent)) !== null) {
        const agentName = match[1]!.toLowerCase().replace(/-/g, "");
        const taskPart = match[2]?.trim() ?? "";

        if (knownAgents[agentName]) {
          hasAgentMention = true;
          const canonicalAgent = knownAgents[agentName];

          logger.log(`🎯 Agent mention detected: @${canonicalAgent}`);

          const prefix = `\n[DELEGATE TO AGENT: ${canonicalAgent}]\n`;
          transformedText = prefix + (taskPart || textContent.replace(`@${match[1]}`, "").trim());

          break;
        }
      }

      if (hasAgentMention) {
        const textPart = output.parts.find(p => p.type === "text");
        if (textPart) {
          textPart.text = transformedText;
          logger.log(`✅ Transformed prompt for agent routing`);
        }
      }
    },

    config: async (_config: Record<string, unknown>) => {
      const lockFile = path.join(directory, ".opencode", "logs", ".strray-init.lock");
      const now = Date.now();
      try {
        if (fs.existsSync(lockFile)) {
          const stat = fs.statSync(lockFile);
          if (now - stat.mtimeMs < 15000) {
            return;
          }
        }
        fs.writeFileSync(lockFile, String(now));
      } catch {
        // lock check failed — proceed anyway
      }

      const logger = await getOrCreateLogger(directory);
      logger.log("🔧 Plugin config hook triggered - initializing 0xRay integration");

      let initScriptPath = path.join(directory, ".opencode", "init.sh");
      const pkgInitPath = path.join(directory, "node_modules", "0xray", ".opencode", "init.sh");
      if (!fs.existsSync(initScriptPath) && fs.existsSync(pkgInitPath)) {
        initScriptPath = pkgInitPath;
      }
      if (fs.existsSync(initScriptPath)) {
        try {
          const { stderr } = await spawnPromise(
            "bash",
            [initScriptPath],
            directory,
          );

          if (stderr) {
            logger.error(`Framework init error: ${stderr}`);
          } else {
            logger.log("✅ 0xRay Framework initialized successfully");
          }
        } catch (error: unknown) {
          logger.error("Framework initialization failed", error);
        }
      }

      logger.log("✅ Plugin config hook completed");
    },
  };
}