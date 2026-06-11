export { XrayOrchestrator } from "./orchestrator/orchestrator.js";
export { XrayStateManager } from "./state/index.js";
export { AgentDelegator } from "./delegation/index.js";
export { frameworkLogger } from "./core/framework-logger.js";
export { BUILTIN_CODEX } from "./core/codex-formatter.js";
import { defaultXrayConfig } from "./core/index.js";
export { defaultXrayConfig };
export { OpenClawIntegration, initializeOpenClawIntegration, getOpenClawIntegration, shutdownOpenClawIntegration } from "./integrations/openclaw/index.js";
export type { OpenClawIntegrationConfig } from "./integrations/openclaw/types.js";

export { XrayService } from "./public/XrayService.js";
export type { XrayServiceConfig } from "./public/XrayService.js";
export { beforeToolHook, afterToolHook } from "./integrations/enforcement-gate.js";
export type { BeforeHookResult, AfterHookResult, GateViolation } from "./integrations/enforcement-gate.js";

export function initializeXray(config = {}) {
  const mergedConfig = { ...defaultXrayConfig, ...config };
  return { success: true, config: mergedConfig, message: "0xRay framework initialized successfully" };
}
