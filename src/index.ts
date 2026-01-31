/**
 * StringRay Framework - Main Entry Point
 *
 * This is the main entry point for the StringRay framework.
 * It exports the core initialization function and key components.
 */

export { StringRayOrchestrator } from "./orchestrator/orchestrator.js";
export { defaultStringRayConfig } from "./core/index.js";
export { StringRayStateManager } from "./state/index.js";
export { AgentDelegator } from "./delegation/index.js";
export { frameworkLogger } from "./core/framework-logger.js";

// Main initialization function
export function initializeStrRay(config = {}) {
  const { defaultStringRayConfig } = require("./core");
  const mergedConfig = { ...defaultStringRayConfig, ...config };

  // Return a standardized initialization result
  return {
    success: true,
    config: mergedConfig,
    message: "StringRay framework initialized successfully",
  };
}
