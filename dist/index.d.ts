/**
 * 0xRay Framework - Main Entry Point
 *
 * This is the main entry point for the 0xRay framework.
 * It exports the core initialization function and key components.
 */
export { StringRayOrchestrator } from "./orchestrator/orchestrator.js";
export { StringRayStateManager } from "./state/index.js";
export { AgentDelegator } from "./delegation/index.js";
export { frameworkLogger } from "./core/framework-logger.js";
export { BUILTIN_CODEX } from "./core/codex-formatter.js";
import { defaultStringRayConfig } from "./core/index.js";
export { defaultStringRayConfig };
export { OpenClawIntegration, initializeOpenClawIntegration, getOpenClawIntegration, shutdownOpenClawIntegration } from "./integrations/openclaw/index.js";
export type { OpenClawIntegrationConfig } from "./integrations/openclaw/types.js";
export declare function initializeStringRay(config?: {}): {
    success: boolean;
    config: {
        enableOrchestrator: boolean;
        enableBootOrchestrator: boolean;
        enableStateManagement: boolean;
        enableHooks: boolean;
        enableCodexInjection: boolean;
        enableProcessors: boolean;
        enablePostProcessor: boolean;
    };
    message: string;
};
//# sourceMappingURL=index.d.ts.map