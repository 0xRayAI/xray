/**
 * Consumer runtime compat shim from prior StringRay releases (1-line min per Scope Rule; primary xray paths + XRAY_||STRRAY_ env + .strray fallbacks).
 */

import { frameworkLogger } from "../core/framework-logger.js";
import { ensureCriticalComponents } from "../architect/architectural-integrity.js";
import { validateRegistryConsistency } from "../agents/registry.js";

export interface XrayActivationConfig {
  enableOrchestrator: boolean;
  enableBootOrchestrator: boolean;
  enableStateManagement: boolean;
  enableHooks: boolean;
  enableCodexInjection: boolean;
  enableProcessors: boolean;
  enablePostProcessor: boolean;
}

export const defaultXrayConfig: XrayActivationConfig = {
  enableOrchestrator: true,
  enableBootOrchestrator: true,
  enableStateManagement: true,
  enableHooks: true,
  enableCodexInjection: true,
  enableProcessors: true,
  enablePostProcessor: true,
};

export async function activateXrayFramework(
  config: Partial<XrayActivationConfig> = {},
): Promise<void> {
  const jobId = `activation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const activationConfig = { ...defaultXrayConfig, ...config };

  // Banner display moved to init.sh execution in plugin
  // Framework activation proceeds quietly

  frameworkLogger.log(
    "stringray-activation",
    "beginning xray framework activation",
    "info",
    { jobId, ...activationConfig },
  );

  const registryValidation = validateRegistryConsistency();
  if (!registryValidation.valid) {
    frameworkLogger.log(
      "stringray-activation",
      "registry-validation-failed",
      "warning",
      { errors: registryValidation.errors },
    );
  }

  try {
    if (activationConfig.enableCodexInjection) {
      await activateCodexInjection(jobId);
    }

    if (activationConfig.enableHooks) {
      await activateHooks(jobId);
    }

    if (activationConfig.enableOrchestrator) {
      await activateOrchestrator(jobId);
    }

    if (activationConfig.enableBootOrchestrator) {
      await activateBootOrchestrator(jobId);
    }

    if (activationConfig.enableStateManagement) {
      await activateStateManagement(jobId);
    }

    if (activationConfig.enableProcessors) {
      await activateProcessors(jobId);
    }

    if (activationConfig.enablePostProcessor) {
      await activatePostProcessor(jobId);
    }

    // Ensure architectural integrity - critical components must always be active
    await ensureCriticalComponents();

    // Loading display moved to init.sh for dramatic line-by-line presentation

    frameworkLogger.log(
      "stringray-activation",
      "xray framework activation completed successfully",
      "success",
      { jobId },
    );
  } catch (error) {
    await frameworkLogger.log(
      "stringray-activation",
      "framework-activation-failed",
      "error",
      { jobId, error: String(error) },
    );
    throw error;
  }
}

async function activateCodexInjection(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating codex injection",
    "info",
    { jobId },
  );

  const { createXrayCodexInjectorHook } = await import("./codex-injector.js");
  const hook = createXrayCodexInjectorHook();

  globalThis.xrayHooks = globalThis.xrayHooks || [];
  globalThis.xrayHooks.push(hook);

  frameworkLogger.log(
    "stringray-activation",
    "codex injection activated",
    "success",
    { jobId, hookName: hook.name },
  );
}

async function activateHooks(jobId: string): Promise<void> {
  try {
    frameworkLogger.log(
      "stringray-activation",
      "activating xray hooks",
      "info",
      { jobId },
    );

    // Create and register the Codex injector hook
    const { createXrayCodexInjectorHook } = await import("./codex-injector");
    const hook = createXrayCodexInjectorHook();
    
    // Store hook globally for OpenCode to pick up
    globalThis.xrayHooks = globalThis.xrayHooks || [];
    (globalThis.xrayHooks as Array<import("../types/global.js").XrayHook>).push(hook);

    frameworkLogger.log(
      "stringray-activation",
      "xray hooks activated",
      "success",
      { 
        jobId, 
        hookName: hook.name,
        hooksRegistered: globalThis.xrayHooks!.length 
      },
    );
  } catch (error) {
    await frameworkLogger.log(
      "stringray-activation",
      "hooks activation failed",
      "error",
      { jobId, error: String(error) },
    );
  }
}

async function activateBootOrchestrator(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating boot orchestrator",
    "info",
    { jobId },
  );

  const { bootOrchestrator } = await import("./boot-orchestrator");

  await bootOrchestrator.executeBootSequence();

  frameworkLogger.log(
    "stringray-activation",
    "boot orchestrator activated",
    "success",
    { jobId },
  );
}

async function activateStateManagement(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating state management",
    "info",
    { jobId },
  );

  const { XrayStateManager } = await import("../state/state-manager");
  const stateManager = new XrayStateManager();

  // Store the state manager instance globally for framework use
  globalThis.xrayStateManager = stateManager;
  globalThis.strRayStateManager = stateManager; // backward compat

  frameworkLogger.log(
    "stringray-activation",
    "state management activated",
    "success",
    { jobId },
  );
}

async function activateOrchestrator(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating xray orchestrator",
    "info",
    { jobId },
  );

  const { xrayOrchestrator } = await import("./orchestrator");

  // Also activate the multi-agent orchestration coordinator
  const { multiAgentOrchestrationCoordinator } =
    await import("../orchestrator/multi-agent-orchestration-coordinator");

  frameworkLogger.log(
    "stringray-activation",
    "xray orchestrator and multi-agent coordination activated",
    "success",
    { jobId },
  );
}

async function activateProcessors(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating processor pipeline",
    "info",
    { jobId },
  );

  const { ProcessorManager } = await import("../processors/processor-manager");
  const { XrayStateManager } = await import("../state/state-manager");

  const stateManager = new XrayStateManager();
  const processorManager = new ProcessorManager(stateManager);

  // Store the processor manager instance globally for framework use
  globalThis.xrayProcessorManager = processorManager;
  globalThis.strRayProcessorManager = processorManager; // backward compat

  frameworkLogger.log(
    "stringray-activation",
    "processor pipeline activated",
    "success",
    { jobId },
  );
}

async function activatePostProcessor(jobId: string): Promise<void> {
  frameworkLogger.log(
    "stringray-activation",
    "activating post-processor system",
    "info",
    { jobId },
  );

  const { PostProcessor } = await import("../postprocessor/PostProcessor");

  // Get existing state manager (should be initialized by boot orchestrator)
  const stateManager = globalThis.xrayStateManager;
  if (!stateManager) {
    throw new Error(
      "State manager not initialized - boot orchestrator must run first",
    );
  }

  const postProcessor = new PostProcessor(stateManager, null, {});

  globalThis.xrayPostProcessor = postProcessor;
  globalThis.strRayPostProcessor = postProcessor; // backward compat

  frameworkLogger.log(
    "stringray-activation",
    "post-processor system activated",
    "success",
    { jobId },
  );

  const { pathResolver } = await import("../utils/path-resolver.js");
  globalThis.xrayPathResolver = pathResolver;
  globalThis.strRayPathResolver = pathResolver; // backward compat

  frameworkLogger.log(
    "stringray-activation",
    "path resolver activated",
    "success",
    { jobId },
  );

  const { CodexInjector } = await import("./codex-injector.js");
  const codexInjector = new CodexInjector();
  globalThis.xrayCodexInjector = codexInjector;
  globalThis.strRayCodexInjector = codexInjector; // backward compat

  frameworkLogger.log(
    "stringray-activation",
    "codex injector activated",
    "success",
    { jobId },
  );
}
