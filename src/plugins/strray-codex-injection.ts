/**
 * StrRay Codex Injection Plugin for OpenCode
 *
 * This plugin automatically injects the Universal Development Codex v1.2.0
 * into the system prompt for all AI agents, ensuring codex terms are
 * consistently enforced across the entire development session.
 *
 * @version 1.0.0
 * @author StrRay Framework
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

let ProcessorManager: any;
let StrRayStateManager: any;
let featuresConfigLoader: any;
let detectTaskType: any;

async function loadStrRayComponents() {
  if (ProcessorManager && StrRayStateManager && featuresConfigLoader) return;

  try {
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
  } catch {
    const pluginPaths = ["strray-ai", "strray-framework"];

    for (const pluginPath of pluginPaths) {
      try {
        ({ ProcessorManager } = await import(
          `../../../../../node_modules/${pluginPath}/dist/processors/processor-manager.js`
        ));
        ({ StrRayStateManager } = await import(
          `../../../../../node_modules/${pluginPath}/dist/state/state-manager.js`
        ));
        const fm = await import(
          `../../../../../node_modules/${pluginPath}/dist/core/features-config.js`
        );
        featuresConfigLoader = fm.featuresConfigLoader;
        detectTaskType = fm.detectTaskType;
        break;
      } catch {
        continue;
      }
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
      stdio: ["ignore", "inherit", "pipe"], // Original working stdio - stdout to terminal (ASCII visible)
    });
    let stdout = "";
    let stderr = "";

    // Capture stderr only (stdout goes to inherit/terminal)
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
      console.error("Failed to write to log file:", error);
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
 * Codex context entry with metadata
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
const CODEX_FILE_LOCATIONS = [".strray/agents_template.md", "AGENTS.md"];

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
  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch && versionMatch[1] ? versionMatch[1] : "1.2.20";

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
function loadCodexContext(): CodexContextEntry[] {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }

  const codexContexts: CodexContextEntry[] = [];

  for (const relativePath of CODEX_FILE_LOCATIONS) {
    const fullPath = path.join(process.cwd(), relativePath);
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
    void getOrCreateLogger(process.cwd()).then((l) =>
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
      const codexContexts = loadCodexContext();

      if (codexContexts.length === 0) {
        const logger = await getOrCreateLogger(directory);
        logger.error(
          `No codex files found. Checked: ${CODEX_FILE_LOCATIONS.join(", ")}`,
        );
        return;
      }

      const formattedCodex = formatCodexContext(codexContexts);

      const welcomeMessage =
        "✨ Welcome StrRay 1.0.0 Agentic Framework Successfully Loaded.";

      if (output.system && Array.isArray(output.system)) {
        output.system.unshift(welcomeMessage, formattedCodex);
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

      if (["write", "edit", "multiedit"].includes(tool)) {
        if (!ProcessorManager || !StrRayStateManager) {
          logger.error("ProcessorManager or StrRayStateManager not loaded");
          return;
        }

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
            type: "pre",
            priority: 30,
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
          logger.log(`▶️ Executing pre-processors for ${tool}...`);
          const result = await processorManager.executePreProcessors({
            tool,
            args,
            context: { directory, operation: "tool_execution", filePath: args?.filePath },
          });

          logger.log(`📊 Pre-processor result: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.results?.length || 0} processors)`);

          if (!result.success) {
            const failures = result.results?.filter((r: any) => !r.success) || [];
            failures.forEach((f: any) => {
              logger.error(`❌ Pre-processor ${f.processorName} failed: ${f.error}`);
            });
          } else {
            result.results?.forEach((r: any) => {
              logger.log(`✅ Pre-processor ${r.processorName}: ${r.success ? 'OK' : 'FAILED'}`);
            });
          }
        } catch (error) {
          logger.error(`💥 Pre-processor execution error`, error);
        }

        // PHASE 3: Execute post-processors after tool completion
        try {
          logger.log(`▶️ Executing post-processors for ${tool}...`);
          const postResult = await processorManager.executePostProcessors(
            tool,
            { directory, operation: "tool_execution", filePath: args?.filePath, success: true },
            []
          );

          logger.log(`📊 Post-processor result: ${postResult.success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          logger.error(`💥 Post-processor execution error`, error);
        }
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
