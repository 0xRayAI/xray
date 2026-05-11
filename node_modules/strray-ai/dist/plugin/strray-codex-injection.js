/**
 * 0xRay Codex Injection Plugin for OpenCode
 *
 * This plugin automatically injects the Universal Development Codex v1.2.0
 * into the system prompt for all AI agents, ensuring codex terms are
 * consistently enforced across the entire development session.
 *
 * @version 1.0.0
 * @author 0xRay Framework
 */
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
// ---------------------------------------------------------------------------
// Dynamic module holders (loaded via candidate-based resolution)
// ---------------------------------------------------------------------------
let _resolveCodexPath = null;
let _resolveStateDir = null;
let _frameworkLogger = null;
let _systemPromptGenerator = null;
let _ProcessorManager = null;
let _StrRayStateManager = null;
let _featuresConfigLoader = null;
let _detectTaskType = null;
// ---------------------------------------------------------------------------
// Module loaders (candidate-based resolution for dev, dist, and consumer paths)
// ---------------------------------------------------------------------------
async function loadFrameworkLogger() {
    if (_frameworkLogger)
        return _frameworkLogger;
    const candidates = [
        "../core/framework-logger.js",
        "../../dist/core/framework-logger.js",
        "../../node_modules/strray-ai/dist/core/framework-logger.js",
    ];
    for (const p of candidates) {
        try {
            const mod = await import(p);
            _frameworkLogger = mod.frameworkLogger;
            return _frameworkLogger;
        }
        catch (_) {
            // try next candidate
        }
    }
    _frameworkLogger = {
        log: (_module, _event, _status, _data) => { },
    };
    return _frameworkLogger;
}
async function loadConfigPaths() {
    if (_resolveCodexPath && _resolveStateDir)
        return;
    const candidates = [
        "../core/config-paths.js",
        "../../dist/core/config-paths.js",
        "../../node_modules/strray-ai/dist/core/config-paths.js",
    ];
    for (const p of candidates) {
        try {
            const mod = await import(p);
            _resolveCodexPath = mod.resolveCodexPath;
            _resolveStateDir = mod.resolveStateDir;
            return;
        }
        catch (_) {
            // try next candidate
        }
    }
    const logger = await loadFrameworkLogger();
    logger.log("strray-codex-plugin", "config-paths-load-failed", "warning", { warning: "Failed to load config-paths module from any location" });
}
async function resolveCodexPath(root) {
    await loadConfigPaths();
    if (!_resolveCodexPath)
        throw new Error("resolveCodexPath not available after loading");
    return _resolveCodexPath(root);
}
async function resolveStateDir(root) {
    await loadConfigPaths();
    if (!_resolveStateDir)
        throw new Error("resolveStateDir not available after loading");
    return _resolveStateDir(root);
}
async function importSystemPromptGenerator() {
    if (_systemPromptGenerator)
        return;
    const candidates = [
        "../core/system-prompt-generator.js",
        "../../dist/core/system-prompt-generator.js",
        "../../node_modules/strray-ai/dist/core/system-prompt-generator.js",
    ];
    for (const p of candidates) {
        try {
            const module = await import(p);
            _systemPromptGenerator = module.generateLeanSystemPrompt;
            return;
        }
        catch (_) {
            // try next candidate
        }
    }
    const logger = await loadFrameworkLogger();
    logger.log("strray-codex-plugin", "system-prompt-generator-load-failed", "warning", { warning: "Failed to load lean system prompt generator, using fallback" });
}
async function loadStringRayComponents() {
    if (_ProcessorManager && _StrRayStateManager && _featuresConfigLoader)
        return;
    const logger = await getOrCreateLogger(process.cwd());
    try {
        logger.log(`🔄 Attempting to load from ../../dist/`);
        const procModule = await import("../../dist/processors/processor-manager.js");
        const stateModule = await import("../../dist/state/state-manager.js");
        const featuresModule = await import("../../dist/core/features-config.js");
        _ProcessorManager = procModule.ProcessorManager;
        _StrRayStateManager = stateModule.StrRayStateManager;
        _featuresConfigLoader = featuresModule.featuresConfigLoader;
        _detectTaskType = featuresModule.detectTaskType;
        logger.log(`✅ Loaded from ../../dist/`);
        return;
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.log(`❌ Failed to load from ../../dist/: ${message}`);
    }
    const pluginPaths = ["strray-ai", "strray-framework"];
    for (const pluginPath of pluginPaths) {
        try {
            logger.log(`🔄 Attempting to load from ../../node_modules/${pluginPath}/dist/`);
            const pm = await import(`../../node_modules/${pluginPath}/dist/processors/processor-manager.js`);
            const sm = await import(`../../node_modules/${pluginPath}/dist/state/state-manager.js`);
            const fm = await import(`../../node_modules/${pluginPath}/dist/core/features-config.js`);
            _ProcessorManager = pm.ProcessorManager;
            _StrRayStateManager = sm.StrRayStateManager;
            _featuresConfigLoader = fm.featuresConfigLoader;
            _detectTaskType = fm.detectTaskType;
            logger.log(`✅ Loaded from ../../node_modules/${pluginPath}/dist/`);
            return;
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            logger.log(`❌ Failed to load from ../../node_modules/${pluginPath}/dist/: ${message}`);
        }
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function spawnPromise(command, args, cwd) {
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
            }
            else {
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
        const today = new Date().toISOString().split("T")[0];
        this.logPath = path.join(logsDir, `strray-plugin-${today}.log`);
    }
    async logAsync(message) {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ${message}\n`;
            await fs.promises.appendFile(this.logPath, logEntry, "utf-8");
        }
        catch {
            // Silent fail - logging failure should not break plugin
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
    }
    catch {
        return "1.4.6";
    }
}
function getFrameworkIdentity() {
    const version = getFrameworkVersion();
    return `0xRay Framework v${version} - AI Orchestration

🔧 Core: enforcer, architect, orchestrator, code-reviewer, refactorer, testing-lead
📚 Codex: 5 Essential Terms (99.6% Error Prevention Target)
🎯 Goal: Progressive, production-ready development workflow

📖 Documentation: config dir (codex, config, agents docs) — resolved via config-paths
`;
}
// ---------------------------------------------------------------------------
// Enforcer quality gate
// ---------------------------------------------------------------------------
async function runEnforcerQualityGate(input, logger) {
    const violations = [];
    const { tool, args } = input;
    try {
        const { RuleEnforcer } = await import("../enforcement/rule-enforcer.js");
        const ruleEnforcer = new RuleEnforcer();
        const context = {
            operation: tool === "write" ? "write" : tool === "edit" ? "edit" : "read",
        };
        if (args?.filePath) {
            context.files = [args.filePath];
        }
        if (args?.content) {
            context.newCode = args.content;
        }
        const report = await ruleEnforcer.validateOperation(tool, context);
        const blockingViolations = [];
        const allViolations = [];
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
        }
        else {
            logger.log(`✅ Quality Gate PASSED (${allViolations.length} warning(s))`);
        }
        return { passed, violations };
    }
    catch (error) {
        logger.log(`Warning: RuleEnforcer unavailable, using fallback checks: ${error instanceof Error ? error.message : String(error)}`);
        if (tool === "write" && args?.filePath) {
            const filePath = args.filePath;
            if (filePath.endsWith(".ts") &&
                !filePath.includes(".test.") &&
                !filePath.includes(".spec.")) {
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
        }
        else {
            logger.log(`✅ Fallback Quality Gate PASSED`);
        }
        return { passed, violations };
    }
}
let cachedCodexContexts = null;
async function getCodexFileLocations(directory) {
    const root = directory || process.cwd();
    const resolved = await resolveCodexPath(root);
    resolved.push(path.join(root, ".opencode", "codex.codex"), path.join(root, ".strray", "agents_template.md"), path.join(root, ".opencode", "strray", "agents_template.md"), path.join(root, "AGENTS.md"));
    return resolved;
}
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8");
    }
    catch (error) {
        const logger = new PluginLogger(process.cwd());
        logger.error(`Failed to read file ${filePath}`, error);
        return null;
    }
}
function extractCodexMetadata(content) {
    if (content.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(content);
            const version = parsed.version || "1.6.0";
            const terms = parsed.terms || {};
            const termCount = Object.keys(terms).length;
            return { version, termCount };
        }
        catch {
            // Not valid JSON, try markdown format
        }
    }
    const versionMatch = content.match(/\*\*Version\*\*:\s*(\d+\.\d+\.\d+)/);
    const version = versionMatch?.[1] ?? "1.6.0";
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
            loadedAt: new Date().toISOString(),
        },
    };
}
async function loadCodexContext(directory) {
    if (cachedCodexContexts) {
        return cachedCodexContexts;
    }
    const codexContexts = [];
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
        void getOrCreateLogger(directory).then((l) => l.error(`No valid codex files found. Checked: ${locations.join(", ")}`));
    }
    return codexContexts;
}
function formatCodexContext(contexts) {
    if (contexts.length === 0) {
        return "";
    }
    const parts = [];
    for (const context of contexts) {
        parts.push(`# 0xRay Codex Context v${context.metadata.version}`, `Source: ${context.source}`, `Terms Loaded: ${context.metadata.termCount}`, `Loaded At: ${context.metadata.loadedAt}`, "", context.content, "", "---", "");
    }
    return parts.join("\n");
}
// ---------------------------------------------------------------------------
// Analytics and task classification
// ---------------------------------------------------------------------------
const INFERENCE_TUNE_INTERVAL = 100;
let _openCodeToolCallCount = 0;
let _lastTuneToolCallCount = 0;
const TOOL_AGENT_MAP = {
    write: { agent: "code-reviewer", skill: "write" },
    edit: { agent: "code-reviewer", skill: "edit" },
    multiedit: { agent: "code-reviewer", skill: "multiedit" },
    bash: { agent: "testing-lead", skill: "execution" },
    search: { agent: "researcher", skill: "search" },
    read: { agent: "researcher", skill: "read" },
    glob: { agent: "researcher", skill: "glob" },
    grep: { agent: "researcher", skill: "search" },
    ls: { agent: "researcher", skill: "list" },
};
function classifyTaskType(tool, args) {
    const cmd = String(args?.command ?? "").toLowerCase().trim();
    if (tool === "bash" && cmd) {
        if (/(npm|yarn|pnpm)\s+test|jest|vitest|mocha|pytest/.test(cmd))
            return "testing";
        if (/(npm|yarn|pnpm)\s+run|npx|cargo|go run|make\s/.test(cmd))
            return "build";
        if (/audit|security|snyk|owasp|bandit/.test(cmd))
            return "security";
        if (/eslint|prettier|black|ruff|lint|format/.test(cmd))
            return "lint";
        if (/git\s/.test(cmd))
            return "git";
        if (/(npm|yarn|pnpm)\s+install|pip install|cargo add/.test(cmd))
            return "install";
        if (/grep|rg |find |ls |cat |head |tail /.test(cmd))
            return "search";
    }
    if (tool === "write")
        return "write";
    if (tool === "edit" || tool === "multiedit")
        return "edit";
    if (tool === "read")
        return "read";
    if (tool === "search" || tool === "grep" || tool === "glob")
        return "search";
    return "unknown";
}
// ---------------------------------------------------------------------------
// Shared helpers extracted from duplicated plugin logic
// ---------------------------------------------------------------------------
function isWriteEditOperation(tool) {
    return tool === "write" || tool === "edit" || tool === "multiedit";
}
function isPublishOperation(tool) {
    return tool === "publish" || tool === "release" || tool === "npm-publish" || tool === "strray-release";
}
function resolveAgentName(input) {
    const globalAgent = globalThis.currentAgent;
    if (globalAgent?.agentType)
        return globalAgent.agentType;
    if (globalAgent?.type)
        return globalAgent.type;
    if (input?.agentType)
        return input.agentType;
    return "orchestrator";
}
function registerAllProcessors(pm) {
    pm.registerProcessor({ name: "preValidate", type: "pre", priority: 10, enabled: true });
    pm.registerProcessor({ name: "codexCompliance", type: "pre", priority: 20, enabled: true });
    pm.registerProcessor({ name: "versionCompliance", type: "pre", priority: 25, enabled: true });
    pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 5, enabled: true });
    pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
    pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}
function registerAfterPostProcessors(pm) {
    pm.registerProcessor({ name: "testAutoCreation", type: "post", priority: 50, enabled: true });
    pm.registerProcessor({ name: "testExecution", type: "post", priority: 10, enabled: true });
    pm.registerProcessor({ name: "coverageAnalysis", type: "post", priority: 20, enabled: true });
}
function logPreProcessorResults(results, logger) {
    logger.log(`📊 Pre-processor result: ${results.success ? "SUCCESS" : "FAILED"} (${results.results.length} processors)`);
    if (!results.success) {
        const failures = results.results.filter((r) => !r.success);
        for (const f of failures) {
            logger.error(`❌ Pre-processor ${f.processorName} failed: ${f.error}`);
        }
    }
    else {
        for (const r of results.results) {
            logger.log(`✅ Pre-processor ${r.processorName}: ${r.success ? "OK" : "FAILED"}`);
        }
    }
}
function logPostProcessorResults(results, logger) {
    const allSuccess = results.every((r) => r.success);
    logger.log(`📊 Post-processor result: ${allSuccess ? "SUCCESS" : "FAILED"} (${results.length} processors)`);
    for (const r of results) {
        if (r.success) {
            logger.log(`✅ Post-processor ${r.processorName}: OK`);
        }
        else {
            logger.error(`❌ Post-processor ${r.processorName} failed: ${r.error}`);
        }
    }
}
function logTestAutoCreationResult(results, logger) {
    const testAutoResult = results.find((r) => r.processorName === "testAutoCreation");
    if (testAutoResult) {
        const data = testAutoResult.data;
        if (testAutoResult.success && data?.testCreated && data?.testFile) {
            logger.log(`✅ TEST AUTO-CREATION: Created ${data.testFile}`);
        }
        else if (!testAutoResult.success) {
            logger.log(`ℹ️ TEST AUTO-CREATION: ${testAutoResult.error ?? "skipped - no new files"}`);
        }
    }
}
// ---------------------------------------------------------------------------
// Main plugin function
// ---------------------------------------------------------------------------
export default async function strrayCodexPlugin(input) {
    const { directory: inputDirectory } = input;
    const directory = inputDirectory || process.cwd();
    return {
        "experimental.chat.system.transform": async (_input, output) => {
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
            }
            catch (error) {
                const logger = await getOrCreateLogger(directory);
                logger.error("System prompt injection failed:", error);
                const fallback = getFrameworkIdentity();
                if (output.system && Array.isArray(output.system)) {
                    output.system = [fallback];
                }
            }
        },
        "tool.execute.before": async (input, output) => {
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
                }
                catch (e) {
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
                let stateManager;
                let processorManager;
                const globalState = globalThis.strRayStateManager;
                if (globalState) {
                    logger.log("🔗 Connecting to booted 0xRay framework");
                    stateManager = globalState;
                }
                else {
                    logger.log("🚀 0xRay framework not booted, initializing...");
                    stateManager = new _StrRayStateManager(await resolveStateDir(directory));
                    globalThis.strRayStateManager = stateManager;
                }
                processorManager = stateManager.get("processor:manager") ?? null;
                if (!processorManager) {
                    logger.log("⚙️ Creating and registering processors...");
                    processorManager = new _ProcessorManager(stateManager);
                    registerAllProcessors(processorManager);
                    stateManager.set("processor:manager", processorManager);
                    logger.log("✅ Processors registered successfully");
                }
                else {
                    logger.log("✅ Using existing processor manager");
                }
                try {
                    logger.log(`▶️ Executing pre-processors for ${tool}...`);
                    const preProcessorInput = {
                        tool,
                        args: args,
                        context: {
                            directory,
                            operation: "tool_execution",
                            filePath: args?.filePath,
                        },
                    };
                    const result = await processorManager.executePreProcessors(preProcessorInput);
                    logPreProcessorResults(result, logger);
                }
                catch (error) {
                    logger.error(`💥 Pre-processor execution error`, error);
                }
                try {
                    logger.log(`▶️ Executing post-processors for ${tool}...`);
                    logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
                    const agentName = resolveAgentName(input);
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
                    };
                    const postResults = await processorManager.executePostProcessors(tool, postProcessorContext, []);
                    logPostProcessorResults(postResults, logger);
                }
                catch (error) {
                    logger.error(`💥 Post-processor execution error`, error);
                }
            }
        },
        "tool.execute.after": async (input, _output) => {
            const logger = await getOrCreateLogger(directory);
            await loadStringRayComponents();
            const { tool, args, result } = input;
            try {
                const { routingOutcomeTracker } = await import("../delegation/analytics/outcome-tracker.js");
                const mapping = TOOL_AGENT_MAP[tool];
                const taskType = classifyTaskType(tool, args);
                const rawDesc = args?.content
                    ? String(args.content).slice(0, 150)
                    : args?.filePath
                        ? String(args.filePath)
                        : args?.command
                            ? String(args.command).slice(0, 150)
                            : tool;
                const description = `[${taskType}] ${rawDesc}`;
                const outcomeFields = {
                    taskId: `opencode-${_openCodeToolCallCount}`,
                    taskDescription: description,
                    routedAgent: mapping?.agent ?? "direct",
                    routedSkill: mapping?.skill ?? tool,
                    confidence: mapping ? 0.8 : 0.5,
                    success: result?.error == null,
                    routingMethod: mapping ? "keyword" : "default",
                };
                if (taskType !== "unknown")
                    outcomeFields.taskType = taskType;
                routingOutcomeTracker.recordOutcome(outcomeFields);
            }
            catch {
                // Outcome tracker not available — skip silently
            }
            logger.log(`📥 After hook input: ${JSON.stringify({ tool, hasArgs: !!args, args, hasResult: !!result }).slice(0, 200)}`);
            if (isWriteEditOperation(tool)) {
                if (!_ProcessorManager || !_StrRayStateManager)
                    return;
                const stateManager = new _StrRayStateManager(await resolveStateDir(directory));
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
                    const postResults = await processorManager.executePostProcessors(tool, postProcessorContext, []);
                    logPostProcessorResults(postResults, logger);
                    logTestAutoCreationResult(postResults, logger);
                }
                catch (error) {
                    logger.error(`💥 Post-processor error`, error);
                }
            }
            _openCodeToolCallCount++;
            if (_openCodeToolCallCount - _lastTuneToolCallCount >= INFERENCE_TUNE_INTERVAL) {
                _lastTuneToolCallCount = _openCodeToolCallCount;
                try {
                    const { inferenceTuner } = await import("../services/inference-tuner.js");
                    inferenceTuner
                        .runTuningCycle()
                        .then(() => {
                        logger.log(`🔄 Inference tuning cycle completed (call #${_openCodeToolCallCount})`);
                    })
                        .catch((err) => {
                        logger.log(`⚠️ Inference tuning cycle skipped: ${err instanceof Error ? err.message : String(err)}`);
                    });
                }
                catch {
                    // Tuner not available in this environment — skip silently
                }
            }
        },
        "chat.message": async (input, output) => {
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
            const knownAgents = {
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
                const agentName = match[1].toLowerCase().replace(/-/g, "");
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
        config: async (_config) => {
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
            }
            catch {
                // lock check failed — proceed anyway
            }
            const logger = await getOrCreateLogger(directory);
            logger.log("🔧 Plugin config hook triggered - initializing 0xRay integration");
            let initScriptPath = path.join(directory, ".opencode", "init.sh");
            const pkgInitPath = path.join(directory, "node_modules", "strray-ai", ".opencode", "init.sh");
            if (!fs.existsSync(initScriptPath) && fs.existsSync(pkgInitPath)) {
                initScriptPath = pkgInitPath;
            }
            if (fs.existsSync(initScriptPath)) {
                try {
                    const { stderr } = await spawnPromise("bash", [initScriptPath], directory);
                    if (stderr) {
                        logger.error(`Framework init error: ${stderr}`);
                    }
                    else {
                        logger.log("✅ 0xRay Framework initialized successfully");
                    }
                }
                catch (error) {
                    logger.error("Framework initialization failed", error);
                }
            }
            logger.log("✅ Plugin config hook completed");
        },
    };
}
//# sourceMappingURL=strray-codex-injection.js.map