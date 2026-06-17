import * as path from "path";
import type {
  FrameworkLoggerLike,
  ResolveCodexPathFn,
  ResolveStateDirFn,
  SystemPromptGeneratorFn,
  StateManagerLike,
  ProcessorManagerLike,
  FeaturesConfigLoaderLike,
  DetectTaskTypeFn,
  ModuleWithSystemPrompt,
} from "./plugin-types.js";
import { getOrCreateLogger } from "./plugin-logger.js";

let _resolveCodexPath: ResolveCodexPathFn | null = null;
let _resolveStateDir: ResolveStateDirFn | null = null;
let _frameworkLogger: FrameworkLoggerLike | null = null;
let _systemPromptGenerator: SystemPromptGeneratorFn | null = null;

let _ProcessorManager: any = null;
let _XrayStateManager: (new (persistencePath?: string) => StateManagerLike) | null = null;
let _featuresConfigLoader: FeaturesConfigLoaderLike | null = null;
let _detectTaskType: DetectTaskTypeFn | null = null;

export function getProcessorManager(): any { return _ProcessorManager; }
export function getXrayStateManager(): (new (persistencePath?: string) => StateManagerLike) | null { return _XrayStateManager; }
export function getFeaturesConfigLoader(): FeaturesConfigLoaderLike | null { return _featuresConfigLoader; }
export function getDetectTaskType(): DetectTaskTypeFn | null { return _detectTaskType; }
export function getSystemPromptGenerator(): SystemPromptGeneratorFn | null { return _systemPromptGenerator; }

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
  logger.log("xray-codex-plugin", "config-paths-load-failed", "warning", { warning: "Failed to load config-paths module from any location" });
}

export async function resolveCodexPath(root: string): Promise<string[]> {
  await loadConfigPaths();
  if (!_resolveCodexPath) throw new Error("resolveCodexPath not available after loading");
  return _resolveCodexPath(root);
}

export async function resolveStateDir(root?: string): Promise<string> {
  await loadConfigPaths();
  if (!_resolveStateDir) throw new Error("resolveStateDir not available after loading");
  return _resolveStateDir(root);
}

export async function importSystemPromptGenerator(): Promise<void> {
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
  logger.log("xray-codex-plugin", "system-prompt-generator-load-failed", "warning", { warning: "Failed to load lean system prompt generator, using fallback" });
}

export function validateModulePath(resolvedPath: string, allowedPrefix: string): void {
  const normalized = path.resolve(resolvedPath);
  const allowed = path.resolve(allowedPrefix);
  if (!normalized.startsWith(allowed)) {
    throw new Error(
      `Module path validation failed: ${normalized} is outside allowed path ${allowed}`,
    );
  }
}

export async function loadXrayComponents(): Promise<void> {
  if (_ProcessorManager && _XrayStateManager && _featuresConfigLoader) return;

  const logger = await getOrCreateLogger(process.cwd());

  try {
    const root = process.cwd();
    const distPrefix = path.join(root, 'dist');
    validateModulePath(`${root}/dist/processors/processor-manager.js`, distPrefix);
    validateModulePath(`${root}/dist/state/state-manager.js`, distPrefix);
    validateModulePath(`${root}/dist/core/features-config.js`, distPrefix);
    const procModule = await import(`${root}/dist/processors/processor-manager.js`);
    const stateModule = await import(`${root}/dist/state/state-manager.js`);
    const featuresModule = await import(`${root}/dist/core/features-config.js`);
    _ProcessorManager = procModule.ProcessorManager;
    _XrayStateManager = stateModule.XrayStateManager;
    _featuresConfigLoader = featuresModule.featuresConfigLoader;
    _detectTaskType = featuresModule.detectTaskType;
    logger.log(`✅ Loaded from cwd/dist/`);
    return;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.log(`❌ Failed to load from cwd/dist/: ${message}`);
  }

  const pluginPaths = ["0xray"];

  for (const pluginPath of pluginPaths) {
    try {
      const nodeModulesPrefix = path.join(process.cwd(), 'node_modules');
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/processors/processor-manager.js`, nodeModulesPrefix);
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/state/state-manager.js`, nodeModulesPrefix);
      validateModulePath(`${process.cwd()}/node_modules/${pluginPath}/dist/core/features-config.js`, nodeModulesPrefix);
      const pm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/processors/processor-manager.js`);
      const sm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/state/state-manager.js`);
      const fm = await import(`${process.cwd()}/node_modules/${pluginPath}/dist/core/features-config.js`);
      _ProcessorManager = pm.ProcessorManager;
      _XrayStateManager = sm.XrayStateManager;
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
