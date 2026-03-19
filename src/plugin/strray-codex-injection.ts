/**
 * StrRay Codex Injection Plugin for OpenCode
 *
 * This plugin automatically injects the Universal Development Codex
 * into the system prompt for all AI agents, ensuring codex terms are
 * consistently enforced across the entire development session.
 *
 * @author StrRay Framework
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// Dynamic imports with absolute paths at runtime
let runQualityGateWithLogging: any;
let qualityGateDirectory: string = "";

async function importQualityGate(directory: string) {
  if (!runQualityGateWithLogging || qualityGateDirectory !== directory) {
    try {
      const qualityGatePath = path.join(directory, "dist", "plugin", "quality-gate.js");
      const module = await import(qualityGatePath);
      runQualityGateWithLogging = module.runQualityGateWithLogging;
      qualityGateDirectory = directory;
    } catch (e) {
      // Quality gate not available
    }
  }
}

// Direct activity logging - writes to activity.log without module isolation issues
let activityLogPath: string = "";
let activityLogInitialized: boolean = false;

function initializeActivityLog(directory: string): void {
  if (activityLogInitialized && activityLogPath) return;
  
  const logDir = path.join(directory, "logs", "framework");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  // Use a separate file for plugin tool events to avoid framework overwrites
  activityLogPath = path.join(logDir, "plugin-tool-events.log");
  activityLogInitialized = true;
}

function logToolActivity(
  directory: string,
  eventType: "start" | "complete" | "routing",
  tool: string,
  args: Record<string, unknown>,
  result?: unknown,
  error?: string,
  duration?: number
): void {
  initializeActivityLog(directory);
  
  const timestamp = new Date().toISOString();
  const jobId = `plugin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  if (eventType === "start") {
    const entry = `${timestamp} [${jobId}] [agent] tool-started - INFO | {"tool":"${tool}","args":${JSON.stringify(Object.keys(args || {}))}}\n`;
    fs.appendFileSync(activityLogPath, entry);
  } else if (eventType === "routing") {
    const entry = `${timestamp} [${jobId}] [agent] routing-detected - INFO | {"tool":"${tool}","routing":${JSON.stringify(args)}}\n`;
    fs.appendFileSync(activityLogPath, entry);
  } else {
    const success = !error;
    const level = success ? "SUCCESS" : "ERROR";
    const entry = `${timestamp} [${jobId}] [agent] tool-${success ? "complete" : "failed"} - ${level} | {"tool":"${tool}","duration":${duration || 0}${error ? `,"error":"${error}"` : ""}}\n`;
    fs.appendFileSync(activityLogPath, entry);
  }
}

// Import lean system prompt generator
let SystemPromptGenerator: any;

async function importSystemPromptGenerator() {
  if (!SystemPromptGenerator) {
    try {
      const module = await import("../core/system-prompt-generator.js");
      SystemPromptGenerator = module.generateLeanSystemPrompt;
    } catch (e) {
      // Fallback to original implementation - silent fail
    }
  }
}

let ProcessorManager: any;
let StrRayStateManager: any;
let featuresConfigLoader: any;
let detectTaskType: any;
let TaskSkillRouter: any;
let taskSkillRouterInstance: any;

async function loadStrRayComponents() {
  if (ProcessorManager && StrRayStateManager && featuresConfigLoader) {
    return;
  }

  const tempLogger = await getOrCreateLogger(process.cwd());
  tempLogger.log(`[StrRay] 🔄 loadStrRayComponents() called - attempting to load framework components`);

  // Try local dist first (for development)
  try {
    tempLogger.log(`[StrRay] 🔄 Attempting to load from ../../dist/`);
    const procModule = await import(
      "../../dist/processors/processor-manager.js" as any
    );
    const stateModule = await import(
      "../../dist/state/state-manager.js" as any
    );
    const featuresModule = await import(
      "../../dist/core/features-config.js" as any
    );
    ProcessorManager = procModule.ProcessorManager;
    StrRayStateManager = stateModule.StrRayStateManager;
    featuresConfigLoader = featuresModule.featuresConfigLoader;
    detectTaskType = featuresModule.detectTaskType;
    tempLogger.log(`[StrRay] ✅ Loaded from ../../dist/`);
    return;
  } catch (e: any) {
    tempLogger.error(`[StrRay] ❌ Failed to load from ../../dist/: ${e?.message || e}`);
  }

  // Try node_modules (for consumer installation)
  const pluginPaths = ["strray-ai", "strray-framework"];

  for (const pluginPath of pluginPaths) {
    try {
      tempLogger.log(
        `[StrRay] 🔄 Attempting to load from ../../node_modules/${pluginPath}/dist/`,
      );
      const pm = await import(
        `../../node_modules/${pluginPath}/dist/processors/processor-manager.js`
      );
      const sm = await import(
        `../../node_modules/${pluginPath}/dist/state/state-manager.js`
      );
      const fm = await import(
        `../../node_modules/${pluginPath}/dist/core/features-config.js`
      );
      ProcessorManager = pm.ProcessorManager;
      StrRayStateManager = sm.StrRayStateManager;
      featuresConfigLoader = fm.featuresConfigLoader;
      detectTaskType = fm.detectTaskType;
      tempLogger.log(`[StrRay] ✅ Loaded from ../../node_modules/${pluginPath}/dist/`);
      return;
    } catch (e: any) {
      tempLogger.error(
        `[StrRay] ❌ Failed to load from ../../node_modules/${pluginPath}/dist/: ${e?.message || e}`,
      );
      continue;
    }
  }
  
  tempLogger.error(`[StrRay] ❌ Could not load StrRay components from any path`);
}

/**
 * Extract task description from tool input
 */
function extractTaskDescription(input: { tool: string; args?: Record<string, unknown> }): string | null {
  const { tool, args } = input;
  
  // Extract meaningful task description from various inputs
  if (args?.content) {
    const content = String(args.content);
    // Get first 200 chars as description
    return content.slice(0, 200);
  }
  
  if (args?.filePath) {
    return `${tool} ${args.filePath}`;
  }
  
  if (args?.command) {
    return String(args.command);
  }
  
  // Fallback: Use tool name as task description for routing
  // This enables routing even when OpenCode doesn't pass args
  if (tool) {
    return `execute ${tool} tool`;
  }
  
  return null;
}

async function loadTaskSkillRouter(): Promise<void> {
  if (taskSkillRouterInstance) {
    return; // Already loaded
  }

  // Try local dist first (for development)
  try {
    const module = await import(
      "../../dist/delegation/task-skill-router.js" as any
    );
    TaskSkillRouter = module.TaskSkillRouter;
    taskSkillRouterInstance = new TaskSkillRouter();
  } catch (distError) {
    // Try node_modules (for consumer installs)
    try {
      const module = await import(
        "strray-ai/dist/delegation/task-skill-router.js" as any
      );
      TaskSkillRouter = module.TaskSkillRouter;
      taskSkillRouterInstance = new TaskSkillRouter();
    } catch (nmError) {
      // Task routing not available - continue without it
    }
  }
}

function spawnPromise(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
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
    } catch (error) {
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

/**
 * Get the current framework version from package.json
 */
function getFrameworkVersion(): string {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "1.4.6";
  } catch {
    return "1.4.6";
  }
}

/**
 * Get lean framework identity message (token-efficient version)
 */
function getFrameworkIdentity(): string {
  const version = getFrameworkVersion();
  return `StringRay Framework v${version} - AI Orchestration

🔧 Core: enforcer, architect, orchestrator, code-reviewer, refactorer, testing-lead
📚 Codex: 5 Essential Terms (99.6% Error Prevention Target)
🎯 Goal: Progressive, production-ready development workflow

📖 Documentation: .opencode/strray/ (codex, config, agents docs)
`;
}

/**
 * Run Enforcer quality gate check before operations
 */
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

/**
 * Global codex context cache (loaded once)
 */
let cachedCodexContexts: CodexContextEntry[] | null = null;

/**
 * Codex file locations to search
 */
const CODEX_FILE_LOCATIONS = [
  ".opencode/strray/codex.json",
  ".opencode/codex.codex",
  ".opencode/strray/agents_template.md",
  "AGENTS.md",
];

/**
 * Read file content safely
 */
function readFileContent(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    const logger = new PluginLogger(process.cwd());
    logger.error(`Failed to read file ${filePath}`, error);
    return null;
  }
}

/**
 * Extract codex metadata from content
 */
function extractCodexMetadata(content: string): {
  version: string;
  termCount: number;
} {
  // Try JSON format first (codex.json)
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

  // Markdown format (AGENTS.md, .opencode/strray/agents_template.md)
  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch && versionMatch[1] ? versionMatch[1] : "1.6.0";

  const termMatches = content.match(/####\s*\d+\.\s/g);
  const termCount = termMatches ? termMatches.length : 0;

  return { version, termCount };
}

/**
 * Create codex context entry
 */
function createCodexContextEntry(
  filePath: string,
  content: string,
): CodexContextEntry {
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

/**
 * Load codex context (cached globally, loaded once)
 */
function loadCodexContext(directory: string): CodexContextEntry[] {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }

  const codexContexts: CodexContextEntry[] = [];

  for (const relativePath of CODEX_FILE_LOCATIONS) {
    const fullPath = path.join(directory, relativePath);
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
      l.error(
        `No valid codex files found. Checked: ${CODEX_FILE_LOCATIONS.join(", ")}`,
      ),
    );
  }

  return codexContexts;
}

/**
 * Format codex context for injection
 */
function formatCodexContext(contexts: CodexContextEntry[]): string {
  if (contexts.length === 0) {
    return "";
  }

  const parts: string[] = [];

  for (const context of contexts) {
    parts.push(
      `# StrRay Codex Context v${context.metadata.version}`,
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

/**
 * Main plugin function
 *
 * This plugin hooks into experimental.chat.system.transform event
 * to inject codex terms into system prompt before it's sent to LLM.
 * 
 * OpenCode expects hooks to be nested under a "hooks" key.
 */
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

          if (SystemPromptGenerator) {
            leanPrompt = await SystemPromptGenerator({
              showWelcomeBanner: true,
              showCodexContext: false,
              enableTokenOptimization: true,
              maxTokenBudget: 3000,
              showCriticalTermsOnly: true,
              showEssentialLinks: true
            });
          }

          // ============================================================
          // PROMPT-LEVEL ROUTING: Route user prompts to best agent
          // ============================================================
          const userPrompt = String(_input.prompt || _input.message || _input.content || "");
          
          if (userPrompt && userPrompt.length > 0) {
            try {
              await loadTaskSkillRouter();
              
              if (taskSkillRouterInstance) {
                const routingResult = taskSkillRouterInstance.routeTask(userPrompt, {
                  source: "prompt",
                });
                
                if (routingResult && routingResult.agent) {
                  const logger = await getOrCreateLogger(directory);
                  logger.log(
                    `🎯 Prompt routed: "${userPrompt.slice(0, 50)}${userPrompt.length > 50 ? "..." : ""}" → ${routingResult.agent} (confidence: ${routingResult.confidence})`,
                  );
                  
                  // Add routing context to system prompt
                  leanPrompt += `\n\n🎯 Recommended Agent: @${routingResult.agent}\n`;
                  leanPrompt += `📊 Confidence: ${Math.round(routingResult.confidence * 100)}%\n`;
                  
                  if (routingResult.context?.complexity > 50) {
                    leanPrompt += `⚠️ High complexity detected - consider using @orchestrator\n`;
                  }
                }
              }
            } catch (e) {
              const logger = await getOrCreateLogger(directory);
              logger.error("Prompt routing error:", e);
            }
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
      output: any,
    ) => {
      const logger = await getOrCreateLogger(directory);
      
      // Log tool start to activity logger (direct write - no module isolation issues)
      logToolActivity(directory, "start", input.tool, input.args || {});
      
      await loadStrRayComponents();

      if (featuresConfigLoader && detectTaskType) {
        try {
          const config = featuresConfigLoader.loadConfig();
          if (config.model_routing?.enabled) {
            const taskType = detectTaskType(input.tool);
            const routing = config.model_routing.task_routing?.[taskType];
            if (routing?.model) {
              output.model = routing.model;
              logger.log(
                `Model routed: ${input.tool} → ${taskType} → ${routing.model}`,
              );
            }
          }
        } catch (e) {
          logger.error("Model routing error", e);
        }
      }

      const { tool, args } = input;

      // ============================================================
      // TASK ROUTING: Analyze task and route to best agent
      // Enabled in v1.10.5 - provides analytics data
      // ============================================================
      const taskDescription = extractTaskDescription(input);
      
      if (taskDescription && featuresConfigLoader) {
        try {
          await loadTaskSkillRouter();
          
          if (taskSkillRouterInstance) {
            const routingResult = taskSkillRouterInstance.routeTask(taskDescription, {
              toolName: tool,
            });
            
            if (routingResult && routingResult.agent) {
              logger.log(
                `🎯 Task routed: "${taskDescription.slice(0, 50)}..." → ${routingResult.agent} (confidence: ${routingResult.confidence})`,
              );
              
              // Store routing result for downstream processing
              output._strrayRouting = routingResult;
              
              // If complexity is high, log a warning
              if (routingResult.context?.complexity > 50) {
                logger.log(
                  `⚠️ High complexity task detected (${routingResult.context.complexity}) - consider multi-agent orchestration`,
                );
              }
            }
          }
        } catch (e) {
          logger.error("Task routing error:", e);
        }
      }

      // ENFORCER QUALITY GATE CHECK - Block on violations
      await importQualityGate(directory);
      if (!runQualityGateWithLogging) {
        logger.log("Quality gate not available, skipping");
      } else {
        const qualityGateResult = await runQualityGateWithLogging(
          { tool, args },
          logger,
        );
        if (!qualityGateResult.passed) {
          logger.error(
            `🚫 Quality gate failed: ${qualityGateResult.violations.join(", ")}`,
          );
          throw new Error(
            `ENFORCER BLOCKED: ${qualityGateResult.violations.join("; ")}`,
          );
        }
      }

      // Run processors for ALL tools (not just write/edit)
      if (ProcessorManager || StrRayStateManager) {
        // PHASE 1: Connect to booted framework or boot if needed
        let stateManager: any;
        let processorManager: any;

        // Check if framework is already booted (global state exists)
        const globalState = (globalThis as any).strRayStateManager;
        if (globalState) {
          logger.log("🔗 Connecting to booted StrRay framework");
          stateManager = globalState;
        } else {
          logger.log("🚀 StrRay framework not booted, initializing...");
          // Create new state manager (framework not booted yet)
          stateManager = new StrRayStateManager(
            path.join(directory, ".opencode", "state"),
          );
          // Store globally for future use
          (globalThis as any).strRayStateManager = stateManager;
        }

        // Get processor manager from state
        processorManager = stateManager.get("processor:manager");

        if (!processorManager) {
          logger.log("⚙️ Creating and registering processors...");
          processorManager = new ProcessorManager(stateManager);

          // Register the same processors as boot-orchestrator
          processorManager.registerProcessor({
            name: "preValidate",
            type: "pre",
            priority: 10,
            enabled: true,
          });
          processorManager.registerProcessor({
            name: "codexCompliance",
            type: "pre",
            priority: 20,
            enabled: true,
          });
          processorManager.registerProcessor({
            name: "versionCompliance",
            type: "pre",
            priority: 25,
            enabled: true,
          });
          processorManager.registerProcessor({
            name: "testAutoCreation",
            type: "post",
            priority: 5, // FIX: Run BEFORE testExecution so tests exist when we run them
            enabled: true,
          });
          processorManager.registerProcessor({
            name: "testExecution",
            type: "post",
            priority: 10,
            enabled: true,
          });
          processorManager.registerProcessor({
            name: "coverageAnalysis",
            type: "post",
            priority: 20,
            enabled: true,
          });

          // Store for future use
          stateManager.set("processor:manager", processorManager);
          logger.log("✅ Processors registered successfully");
        } else {
          logger.log("✅ Using existing processor manager");
        }

        // PHASE 2: Execute pre-processors with detailed logging
        try {
          // Check if processorManager and method exist
          if (!processorManager || typeof processorManager.executePreProcessors !== 'function') {
            logger.log(`⏭️ Pre-processors skipped: processor manager not available`);
            return;
          }
          
          logger.log(`▶️ Executing pre-processors for ${tool}...`);
          const result = await processorManager.executePreProcessors({
            tool,
            args,
            context: {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
            },
          });

          logger.log(
            `📊 Pre-processor result: ${result.success ? "SUCCESS" : "FAILED"} (${result.results?.length || 0} processors)`,
          );

          if (!result.success) {
            const failures =
              result.results?.filter((r: any) => !r.success) || [];
            failures.forEach((f: any) => {
              logger.error(
                `❌ Pre-processor ${f.processorName} failed: ${f.error}`,
              );
            });
          } else {
            result.results?.forEach((r: any) => {
              logger.log(
                `✅ Pre-processor ${r.processorName}: ${r.success ? "OK" : "FAILED"}`,
              );
            });
          }
        } catch (error) {
          logger.error(`💥 Pre-processor execution error`, error);
        }

        // PHASE 3: Execute post-processors after tool completion
        try {
          // Check if processorManager and method exist
          if (!processorManager || typeof processorManager.executePostProcessors !== 'function') {
            logger.log(`⏭️ Post-processors skipped: processor manager not available`);
            return;
          }
          
          logger.log(`▶️ Executing post-processors for ${tool}...`);
          logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
          const postResults = await processorManager.executePostProcessors(
            tool,
            {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
              success: true,
            },
            [],
          );

          // postResults is an array of ProcessorResult
          const allSuccess = postResults.every((r: any) => r.success);
          logger.log(
            `📊 Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${postResults.length} processors)`,
          );

          // Log each post-processor result for debugging
          for (const r of postResults) {
            if (r.success) {
              logger.log(`✅ Post-processor ${r.processorName}: OK`);
            } else {
              logger.error(
                `❌ Post-processor ${r.processorName} failed: ${r.error}`,
              );
            }
          }
        } catch (error) {
          logger.error(`💥 Post-processor execution error`, error);
        }
      }
    },

    // Execute POST-processors AFTER tool completes (this is the correct place!)
    "tool.execute.after": async (
      input: {
        tool: string;
        args?: { content?: string; filePath?: string };
        result?: any;
      },
      _output: any,
    ) => {
      const logger = await getOrCreateLogger(directory);
      
      const { tool, args, result } = input;
      
      // Log tool completion to activity logger (direct write - no module isolation issues)
      logToolActivity(
        directory, 
        "complete", 
        tool, 
        args || {}, 
        result, 
        result?.error,
        result?.duration
      );
      
      await loadStrRayComponents();

      // Debug: log full input
      logger.log(
        `📥 After hook input: ${JSON.stringify({ tool, hasArgs: !!args, args, hasResult: !!result }).slice(0, 200)}`,
      );

      // Run post-processors for ALL tools AFTER tool completes
      if (ProcessorManager || StrRayStateManager) {
        const stateManager = new StrRayStateManager(
          path.join(directory, ".opencode", "state"),
        );
        const processorManager = new ProcessorManager(stateManager);

        // Register post-processors
        processorManager.registerProcessor({
          name: "testAutoCreation",
          type: "post",
          priority: 50,
          enabled: true,
        });
        processorManager.registerProcessor({
          name: "testExecution",
          type: "post",
          priority: 10,
          enabled: true,
        });
        processorManager.registerProcessor({
          name: "coverageAnalysis",
          type: "post",
          priority: 20,
          enabled: true,
        });

        try {
          // Check if processorManager and method exist
          if (!processorManager || typeof processorManager.executePostProcessors !== 'function') {
            logger.log(`⏭️ Post-processors skipped: processor manager not available`);
            return;
          }
          
          // Execute post-processors AFTER tool - with actual filePath for testAutoCreation
          logger.log(`📝 Post-processor tool: ${tool}`);
          logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
          logger.log(`📝 Post-processor directory: ${directory}`);

          const postResults = await processorManager.executePostProcessors(
            tool,
            {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
              success: result?.success !== false,
            },
            [],
          );

          // postResults is an array of ProcessorResult
          const allSuccess = postResults.every((r: any) => r.success);
          logger.log(
            `📊 Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${postResults.length} processors)`,
          );

          // Log each post-processor result for debugging
          for (const r of postResults) {
            if (r.success) {
              logger.log(`✅ Post-processor ${r.processorName}: OK`);
            } else {
              logger.error(
                `❌ Post-processor ${r.processorName} failed: ${r.error}`,
              );
            }
          }

          // Log testAutoCreation results specifically
          const testAutoResult = postResults.find(
            (r: any) => r.processorName === "testAutoCreation",
          );
          if (testAutoResult) {
            if (testAutoResult.success && testAutoResult.testCreated) {
              logger.log(
                `✅ TEST AUTO-CREATION: Created ${testAutoResult.testFile}`,
              );
            } else if (!testAutoResult.success) {
              logger.log(
                `ℹ️ TEST AUTO-CREATION: ${testAutoResult.message || "skipped - no new files"}`,
              );
            }
          }
        } catch (error) {
          logger.error(`💥 Post-processor error`, error);
        }
      }
    },

    /**
     * experimental.chat.user.before - Intercept user messages for routing
     * This hook fires before the user's message is sent to the LLM
     */
    "experimental.chat.user.before": async (
      input: { content?: string; message?: string; prompt?: string },
      output: { content?: string; message?: string },
    ) => {
      const logger = await getOrCreateLogger(directory);
      
      // Get user message
      const userContent = String(input.content || input.message || input.prompt || "");
      
      if (!userContent || userContent.length === 0) {
        return;
      }
      
      logger.log(`👤 User message received: "${userContent.slice(0, 50)}${userContent.length > 50 ? "..." : ""}"`);
      
      try {
        await loadTaskSkillRouter();
        
        if (taskSkillRouterInstance) {
          // Route based on user content
          const routingResult = taskSkillRouterInstance.routeTask(userContent, {
            source: "user_message",
          });
          
          if (routingResult && routingResult.agent) {
            logger.log(
              `🎯 User message routed to: @${routingResult.agent} (confidence: ${Math.round(routingResult.confidence * 100)}%)`,
            );
            
            // Add routing hint to user's message
            const routingHint = `[Suggested Agent: @${routingResult.agent}]\n`;
            
            // Modify output to include routing hint
            if (output.content !== undefined) {
              output.content = routingHint + output.content;
            } else if (output.message !== undefined) {
              output.message = routingHint + output.message;
            }
            
            // Log routing outcome
            logToolActivity(directory, "routing", "user_message", {
              agent: routingResult.agent,
              confidence: routingResult.confidence,
              skill: routingResult.skill,
            });
          }
        }
      } catch (e) {
        logger.error("User message routing error:", e);
      }
    },

    config: async (_config: Record<string, unknown>) => {
      const logger = await getOrCreateLogger(directory);
      logger.log(
        "🔧 Plugin config hook triggered - initializing StrRay integration",
      );

      // Initialize StrRay framework
      const initScriptPath = path.join(directory, ".opencode", "init.sh");
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
            logger.log("✅ StrRay Framework initialized successfully");
          }
        } catch (error: unknown) {
          logger.error("Framework initialization failed", error);
        }
      }

      logger.log("✅ Plugin config hook completed");
    },
  };
}
