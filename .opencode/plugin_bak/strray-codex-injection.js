"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var strray_codex_injection_exports = {};
__export(strray_codex_injection_exports, {
  default: () => strrayCodexPlugin
});
module.exports = __toCommonJS(strray_codex_injection_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
let ProcessorManager;
let StrRayStateManager;
let featuresConfigLoader;
let detectTaskType;
async function loadStrRayComponents() {
  if (ProcessorManager && StrRayStateManager && featuresConfigLoader) return;
  try {
    const procModule = await import("../../dist/processors/processor-manager.js");
    const stateModule = await import("../../dist/state/state-manager.js");
    const featuresModule = await import("../../dist/core/features-config.js");
    ProcessorManager = procModule.ProcessorManager;
    StrRayStateManager = stateModule.StrRayStateManager;
    featuresConfigLoader = featuresModule.featuresConfigLoader;
    detectTaskType = featuresModule.detectTaskType;
  } catch {
    console.debug?.("StrRay: Loading from node_modules...");
    const pluginPaths = ["strray-ai", "strray-framework"];
    for (const pluginPath of pluginPaths) {
      try {
        ({ ProcessorManager } = await import(`../../../../../node_modules/${pluginPath}/dist/processors/processor-manager.js`));
        ({ StrRayStateManager } = await import(`../../../../../node_modules/${pluginPath}/dist/state/state-manager.js`));
        const fm = await import(`../../../../../node_modules/${pluginPath}/dist/core/features-config.js`);
        featuresConfigLoader = fm.featuresConfigLoader;
        detectTaskType = fm.detectTaskType;
        break;
      } catch {
        continue;
      }
    }
  }
}
function spawnPromise(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)(command, args, {
      cwd,
      stdio: ["ignore", "inherit", "pipe"]
      // Original working stdio - stdout to terminal (ASCII visible)
    });
    let stdout = "";
    let stderr = "";
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
      console.error("Failed to write to log file:", error);
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
let cachedCodexContexts = null;
const CODEX_FILE_LOCATIONS = [".strray/agents_template.md", "AGENTS.md"];
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
  const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
  const version = versionMatch && versionMatch[1] ? versionMatch[1] : "1.2.20";
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
function loadCodexContext() {
  if (cachedCodexContexts) {
    return cachedCodexContexts;
  }
  const codexContexts = [];
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
    void getOrCreateLogger(process.cwd()).then(
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
      const codexContexts = loadCodexContext();
      if (codexContexts.length === 0) {
        const logger = await getOrCreateLogger(directory);
        logger.error(
          `No codex files found. Checked: ${CODEX_FILE_LOCATIONS.join(", ")}`
        );
        return;
      }
      const formattedCodex = formatCodexContext(codexContexts);
      const welcomeMessage = "\u2728 Welcome StrRay 1.0.0 Agentic Framework Successfully Loaded.";
      if (output.system && Array.isArray(output.system)) {
        output.system.unshift(welcomeMessage, formattedCodex);
      }
    },
    "tool.execute.before": async (input2, output) => {
      const logger = await getOrCreateLogger(directory);
      await loadStrRayComponents();
      if (featuresConfigLoader && detectTaskType) {
        try {
          const config = featuresConfigLoader.loadConfig();
          if (config.model_routing?.enabled) {
            const taskType = detectTaskType(input2.tool);
            const routing = config.model_routing.task_routing?.[taskType];
            if (routing?.model) {
              output.model = routing.model;
              logger.log(`Model routed: ${input2.tool} \u2192 ${taskType} \u2192 ${routing.model}`);
            }
          }
        } catch (e) {
          logger.error("Model routing error", e);
        }
      }
      const { tool, args } = input2;
      if (["write", "edit", "multiedit"].includes(tool)) {
        if (!ProcessorManager || !StrRayStateManager) return;
        const stateManager = new StrRayStateManager(path.join(directory, ".opencode", "state"));
        const processorManager = new ProcessorManager(stateManager);
        try {
          const result = await processorManager.executePreProcessors({
            tool,
            args,
            context: { directory, operation: "tool_execution" }
          });
          if (!result.success) {
            logger.error(`Pre-processor failed: ${result.results.find((r) => !r.success)?.error}`);
          }
        } catch (error) {
          logger.error(`Pre-processor error`, error);
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
