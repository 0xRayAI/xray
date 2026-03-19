import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { runQualityGateWithLogging } from "../../dist/plugin/quality-gate.js";
let logToolStart;
let logToolComplete;
async function importToolEventEmitter() {
  if (!logToolStart) {
    try {
      const module = await import("../core/tool-event-emitter.js");
      logToolStart = module.logToolStart;
      logToolComplete = module.logToolComplete;
    } catch (e) {
    }
  }
}
let SystemPromptGenerator;
async function importSystemPromptGenerator() {
  if (!SystemPromptGenerator) {
    try {
      const module = await import("../core/system-prompt-generator.js");
      SystemPromptGenerator = module.generateLeanSystemPrompt;
    } catch (e) {
    }
  }
}
let ProcessorManager;
let StrRayStateManager;
let featuresConfigLoader;
let detectTaskType;
let TaskSkillRouter;
let taskSkillRouterInstance;
async function loadStrRayComponents() {
  if (ProcessorManager && StrRayStateManager && featuresConfigLoader) {
    return;
  }
  const tempLogger = await getOrCreateLogger(process.cwd());
  tempLogger.log(`[StrRay] \u{1F504} loadStrRayComponents() called - attempting to load framework components`);
  try {
    tempLogger.log(`[StrRay] \u{1F504} Attempting to load from ../../dist/`);
    const procModule = await import("../../dist/processors/processor-manager.js");
    const stateModule = await import("../../dist/state/state-manager.js");
    const featuresModule = await import("../../dist/core/features-config.js");
    ProcessorManager = procModule.ProcessorManager;
    StrRayStateManager = stateModule.StrRayStateManager;
    featuresConfigLoader = featuresModule.featuresConfigLoader;
    detectTaskType = featuresModule.detectTaskType;
    tempLogger.log(`[StrRay] \u2705 Loaded from ../../dist/`);
    return;
  } catch (e) {
    tempLogger.error(`[StrRay] \u274C Failed to load from ../../dist/: ${e?.message || e}`);
  }
  const pluginPaths = ["strray-ai", "strray-framework"];
  for (const pluginPath of pluginPaths) {
    try {
      tempLogger.log(
        `[StrRay] \u{1F504} Attempting to load from ../../node_modules/${pluginPath}/dist/`
      );
      const pm = await import(`../../node_modules/${pluginPath}/dist/processors/processor-manager.js`);
      const sm = await import(`../../node_modules/${pluginPath}/dist/state/state-manager.js`);
      const fm = await import(`../../node_modules/${pluginPath}/dist/core/features-config.js`);
      ProcessorManager = pm.ProcessorManager;
      StrRayStateManager = sm.StrRayStateManager;
      featuresConfigLoader = fm.featuresConfigLoader;
      detectTaskType = fm.detectTaskType;
      tempLogger.log(`[StrRay] \u2705 Loaded from ../../node_modules/${pluginPath}/dist/`);
      return;
    } catch (e) {
      tempLogger.error(
        `[StrRay] \u274C Failed to load from ../../node_modules/${pluginPath}/dist/: ${e?.message || e}`
      );
      continue;
    }
  }
  tempLogger.error(`[StrRay] \u274C Could not load StrRay components from any path`);
}
function extractTaskDescription(input) {
  const { tool, args } = input;
  if (args?.content) {
    const content = String(args.content);
    return content.slice(0, 200);
  }
  if (args?.filePath) {
    return `${tool} ${args.filePath}`;
  }
  if (args?.command) {
    return String(args.command);
  }
  return null;
}
async function loadTaskSkillRouter() {
  if (taskSkillRouterInstance) {
    return;
  }
  try {
    const module = await import("../../dist/delegation/task-skill-router.js");
    TaskSkillRouter = module.TaskSkillRouter;
    taskSkillRouterInstance = new TaskSkillRouter();
  } catch (distError) {
    try {
      const module = await import("strray-ai/dist/delegation/task-skill-router.js");
      TaskSkillRouter = module.TaskSkillRouter;
      taskSkillRouterInstance = new TaskSkillRouter();
    } catch (nmError) {
    }
  }
}
function spawnPromise(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
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
  logPath;
  constructor(directory) {
    const logsDir = path.join(directory, ".opencode", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    this.logPath = path.join(logsDir, `strray-plugin-${today}.log`);
  }
  async logAsync(message) {
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const logEntry = `[${timestamp}] ${message}
`;
      await fs.promises.appendFile(this.logPath, logEntry, "utf-8");
    } catch (error) {
    }
  }
  log(message) {
    void this.logAsync(message);
  }
  error(message, error) {
    const errorDetail = error instanceof Error ? `: ${error.message}` : "";
    this.log(`ERROR: ${message}${errorDetail}`);
  }
}
let loggerInstance = null;
let loggerInitPromise = null;
async function getOrCreateLogger(directory) {
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
function getFrameworkVersion() {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "1.4.6";
  } catch {
    return "1.4.6";
  }
}
function getFrameworkIdentity() {
  const version = getFrameworkVersion();
  return `StringRay Framework v${version} - AI Orchestration

\u{1F527} Core: enforcer, architect, orchestrator, code-reviewer, refactorer, testing-lead
\u{1F4DA} Codex: 5 Essential Terms (99.6% Error Prevention Target)
\u{1F3AF} Goal: Progressive, production-ready development workflow

\u{1F4D6} Documentation: .opencode/strray/ (codex, config, agents docs)
`;
}
let cachedCodexContexts = null;
const CODEX_FILE_LOCATIONS = [
  ".opencode/strray/codex.json",
  ".opencode/codex.codex",
  ".opencode/strray/agents_template.md",
  "AGENTS.md"
];
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    const logger = new PluginLogger(process.cwd());
    logger.error(`Failed to read file ${filePath}`, error);
    return null;
  }
}
function extractCodexMetadata(content) {
  if (content.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(content);
      const version2 = parsed.version || "1.6.0";
      const terms = parsed.terms || {};
      const termCount2 = Object.keys(terms).length;
      return { version: version2, termCount: termCount2 };
    } catch {
    }
  }
  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch && versionMatch[1] ? versionMatch[1] : "1.6.0";
  const termMatches = content.match(/####\s*\d+\.\s/g);
  const termCount = termMatches ? termMatches.length : 0;
  return { version, termCount };
}
function createCodexContextEntry(filePath, content) {
  const metadata = extractCodexMetadata(content);
  return {
    id: `strray-codex-${path.basename(filePath)}`,
    source: filePath,
    content,
    priority: "critical",
    metadata: {
      version: metadata.version,
      termCount: metadata.termCount,
      loadedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
function loadCodexContext(directory) {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }
  const codexContexts = [];
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
    void getOrCreateLogger(directory).then(
      (l) => l.error(
        `No valid codex files found. Checked: ${CODEX_FILE_LOCATIONS.join(", ")}`
      )
    );
  }
  return codexContexts;
}
function formatCodexContext(contexts) {
  if (contexts.length === 0) {
    return "";
  }
  const parts = [];
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
      ""
    );
  }
  return parts.join("\n");
}
async function strrayCodexPlugin(input) {
  const { directory: inputDirectory } = input;
  const directory = inputDirectory || process.cwd();
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      try {
        await importSystemPromptGenerator();
        let leanPrompt = getFrameworkIdentity();
        if (SystemPromptGenerator) {
          leanPrompt = await SystemPromptGenerator({
            showWelcomeBanner: true,
            showCodexContext: false,
            enableTokenOptimization: true,
            maxTokenBudget: 3e3,
            showCriticalTermsOnly: true,
            showEssentialLinks: true
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
    "tool.execute.before": async (input2, output) => {
      const logger = await getOrCreateLogger(directory);
      logger.log(`\u{1F680} TOOL EXECUTE BEFORE HOOK FIRED: ${input2.tool}`);
      logger.log(`\u{1F4E5} Full input: ${JSON.stringify(input2)}`);
      await importToolEventEmitter();
      if (logToolStart) {
        logToolStart(input2.tool, input2.args || {});
      }
      await loadStrRayComponents();
      if (featuresConfigLoader && detectTaskType) {
        try {
          const config = featuresConfigLoader.loadConfig();
          if (config.model_routing?.enabled) {
            const taskType = detectTaskType(input2.tool);
            const routing = config.model_routing.task_routing?.[taskType];
            if (routing?.model) {
              output.model = routing.model;
              logger.log(
                `Model routed: ${input2.tool} \u2192 ${taskType} \u2192 ${routing.model}`
              );
            }
          }
        } catch (e) {
          logger.error("Model routing error", e);
        }
      }
      const { tool, args } = input2;
      const taskDescription = extractTaskDescription(input2);
      if (taskDescription && featuresConfigLoader) {
        try {
          await loadTaskSkillRouter();
          if (taskSkillRouterInstance) {
            const routingResult = taskSkillRouterInstance.routeTask(taskDescription, {
              toolName: tool
            });
            if (routingResult && routingResult.agent) {
              logger.log(
                `\u{1F3AF} Task routed: "${taskDescription.slice(0, 50)}..." \u2192 ${routingResult.agent} (confidence: ${routingResult.confidence})`
              );
              output._strrayRouting = routingResult;
              if (routingResult.context?.complexity > 50) {
                logger.log(
                  `\u26A0\uFE0F High complexity task detected (${routingResult.context.complexity}) - consider multi-agent orchestration`
                );
              }
            }
          }
        } catch (e) {
          logger.error("Task routing error:", e);
        }
      }
      const qualityGateResult = await runQualityGateWithLogging(
        { tool, args },
        logger
      );
      if (!qualityGateResult.passed) {
        logger.error(
          `\u{1F6AB} Quality gate failed: ${qualityGateResult.violations.join(", ")}`
        );
        throw new Error(
          `ENFORCER BLOCKED: ${qualityGateResult.violations.join("; ")}`
        );
      }
      if (ProcessorManager || StrRayStateManager) {
        let stateManager;
        let processorManager;
        const globalState = globalThis.strRayStateManager;
        if (globalState) {
          logger.log("\u{1F517} Connecting to booted StrRay framework");
          stateManager = globalState;
        } else {
          logger.log("\u{1F680} StrRay framework not booted, initializing...");
          stateManager = new StrRayStateManager(
            path.join(directory, ".opencode", "state")
          );
          globalThis.strRayStateManager = stateManager;
        }
        processorManager = stateManager.get("processor:manager");
        if (!processorManager) {
          logger.log("\u2699\uFE0F Creating and registering processors...");
          processorManager = new ProcessorManager(stateManager);
          processorManager.registerProcessor({
            name: "preValidate",
            type: "pre",
            priority: 10,
            enabled: true
          });
          processorManager.registerProcessor({
            name: "codexCompliance",
            type: "pre",
            priority: 20,
            enabled: true
          });
          processorManager.registerProcessor({
            name: "versionCompliance",
            type: "pre",
            priority: 25,
            enabled: true
          });
          processorManager.registerProcessor({
            name: "testAutoCreation",
            type: "post",
            priority: 5,
            // FIX: Run BEFORE testExecution so tests exist when we run them
            enabled: true
          });
          processorManager.registerProcessor({
            name: "testExecution",
            type: "post",
            priority: 10,
            enabled: true
          });
          processorManager.registerProcessor({
            name: "coverageAnalysis",
            type: "post",
            priority: 20,
            enabled: true
          });
          stateManager.set("processor:manager", processorManager);
          logger.log("\u2705 Processors registered successfully");
        } else {
          logger.log("\u2705 Using existing processor manager");
        }
        try {
          if (!processorManager || typeof processorManager.executePreProcessors !== "function") {
            logger.log(`\u23ED\uFE0F Pre-processors skipped: processor manager not available`);
            return;
          }
          logger.log(`\u25B6\uFE0F Executing pre-processors for ${tool}...`);
          const result = await processorManager.executePreProcessors({
            tool,
            args,
            context: {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath
            }
          });
          logger.log(
            `\u{1F4CA} Pre-processor result: ${result.success ? "SUCCESS" : "FAILED"} (${result.results?.length || 0} processors)`
          );
          if (!result.success) {
            const failures = result.results?.filter((r) => !r.success) || [];
            failures.forEach((f) => {
              logger.error(
                `\u274C Pre-processor ${f.processorName} failed: ${f.error}`
              );
            });
          } else {
            result.results?.forEach((r) => {
              logger.log(
                `\u2705 Pre-processor ${r.processorName}: ${r.success ? "OK" : "FAILED"}`
              );
            });
          }
        } catch (error) {
          logger.error(`\u{1F4A5} Pre-processor execution error`, error);
        }
        try {
          if (!processorManager || typeof processorManager.executePostProcessors !== "function") {
            logger.log(`\u23ED\uFE0F Post-processors skipped: processor manager not available`);
            return;
          }
          logger.log(`\u25B6\uFE0F Executing post-processors for ${tool}...`);
          logger.log(`\u{1F4DD} Post-processor args: ${JSON.stringify(args)}`);
          const postResults = await processorManager.executePostProcessors(
            tool,
            {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
              success: true
            },
            []
          );
          const allSuccess = postResults.every((r) => r.success);
          logger.log(
            `\u{1F4CA} Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${postResults.length} processors)`
          );
          for (const r of postResults) {
            if (r.success) {
              logger.log(`\u2705 Post-processor ${r.processorName}: OK`);
            } else {
              logger.error(
                `\u274C Post-processor ${r.processorName} failed: ${r.error}`
              );
            }
          }
        } catch (error) {
          logger.error(`\u{1F4A5} Post-processor execution error`, error);
        }
      }
    },
    // Execute POST-processors AFTER tool completes (this is the correct place!)
    "tool.execute.after": async (input2, _output) => {
      const logger = await getOrCreateLogger(directory);
      const { tool, args, result } = input2;
      await importToolEventEmitter();
      if (logToolComplete) {
        logToolComplete(tool, args || {}, result, result?.error, result?.duration);
      }
      await loadStrRayComponents();
      logger.log(
        `\u{1F4E5} After hook input: ${JSON.stringify({ tool, hasArgs: !!args, args, hasResult: !!result }).slice(0, 200)}`
      );
      if (ProcessorManager || StrRayStateManager) {
        const stateManager = new StrRayStateManager(
          path.join(directory, ".opencode", "state")
        );
        const processorManager = new ProcessorManager(stateManager);
        processorManager.registerProcessor({
          name: "testAutoCreation",
          type: "post",
          priority: 50,
          enabled: true
        });
        processorManager.registerProcessor({
          name: "testExecution",
          type: "post",
          priority: 10,
          enabled: true
        });
        processorManager.registerProcessor({
          name: "coverageAnalysis",
          type: "post",
          priority: 20,
          enabled: true
        });
        try {
          if (!processorManager || typeof processorManager.executePostProcessors !== "function") {
            logger.log(`\u23ED\uFE0F Post-processors skipped: processor manager not available`);
            return;
          }
          logger.log(`\u{1F4DD} Post-processor tool: ${tool}`);
          logger.log(`\u{1F4DD} Post-processor args: ${JSON.stringify(args)}`);
          logger.log(`\u{1F4DD} Post-processor directory: ${directory}`);
          const postResults = await processorManager.executePostProcessors(
            tool,
            {
              directory,
              operation: "tool_execution",
              filePath: args?.filePath,
              success: result?.success !== false
            },
            []
          );
          const allSuccess = postResults.every((r) => r.success);
          logger.log(
            `\u{1F4CA} Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${postResults.length} processors)`
          );
          for (const r of postResults) {
            if (r.success) {
              logger.log(`\u2705 Post-processor ${r.processorName}: OK`);
            } else {
              logger.error(
                `\u274C Post-processor ${r.processorName} failed: ${r.error}`
              );
            }
          }
          const testAutoResult = postResults.find(
            (r) => r.processorName === "testAutoCreation"
          );
          if (testAutoResult) {
            if (testAutoResult.success && testAutoResult.testCreated) {
              logger.log(
                `\u2705 TEST AUTO-CREATION: Created ${testAutoResult.testFile}`
              );
            } else if (!testAutoResult.success) {
              logger.log(
                `\u2139\uFE0F TEST AUTO-CREATION: ${testAutoResult.message || "skipped - no new files"}`
              );
            }
          }
        } catch (error) {
          logger.error(`\u{1F4A5} Post-processor error`, error);
        }
      }
    },
    config: async (_config) => {
      const logger = await getOrCreateLogger(directory);
      logger.log(
        "\u{1F527} Plugin config hook triggered - initializing StrRay integration"
      );
      const initScriptPath = path.join(directory, ".opencode", "init.sh");
      if (fs.existsSync(initScriptPath)) {
        try {
          const { stderr } = await spawnPromise(
            "bash",
            [initScriptPath],
            directory
          );
          if (stderr) {
            logger.error(`Framework init error: ${stderr}`);
          } else {
            logger.log("\u2705 StrRay Framework initialized successfully");
          }
        } catch (error) {
          logger.error("Framework initialization failed", error);
        }
      }
      logger.log("\u2705 Plugin config hook completed");
    }
  };
}
export {
  strrayCodexPlugin as default
};
