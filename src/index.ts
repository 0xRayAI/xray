/**
 * 0xRay Framework - Main Entry Point
 *
 * This is the main entry point for the 0xRay framework.
 * It exports the core initialization function and key components.
 */

export { XrayOrchestrator } from "./orchestrator/orchestrator.js";
export { XrayStateManager } from "./state/index.js";
export { AgentDelegator } from "./delegation/index.js";
export { frameworkLogger } from "./core/framework-logger.js";
export { BUILTIN_CODEX } from "./core/codex-formatter.js";

import { defaultXrayConfig } from "./core/index.js";
export { defaultXrayConfig };

export { OpenClawIntegration, initializeOpenClawIntegration, getOpenClawIntegration, shutdownOpenClawIntegration } from "./integrations/openclaw/index.js";
export type { OpenClawIntegrationConfig } from "./integrations/openclaw/types.js";

// Main initialization function
export function initializeXray(config = {}) {
  const mergedConfig = { ...defaultXrayConfig, ...config };

  // Return a standardized initialization result
  return {
    success: true,
    config: mergedConfig,
    message: "0xRay framework initialized successfully",
  };
}
