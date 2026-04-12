/**
 * 0xRay Framework Initialization
 *
 * This file integrates 0xRay framework activation directly into OpenCode's
 * core initialization process.
 */
// Import and activate 0xRay framework during OpenCode startup
import { activateStringRayFramework } from "./strray-activation.js";
import { frameworkLogger } from "../core/framework-logger.js";
// Initialize 0xRay framework when OpenCode starts
export async function initializeStringRay() {
    const jobId = `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        await activateStringRayFramework();
        frameworkLogger.log("stringray-init", "0xRay framework initialized successfully", "success", { jobId });
    }
    catch (error) {
        frameworkLogger.log("stringray-init", "0xRay framework initialization failed", "error", { jobId, error });
        // Don't throw - allow OpenCode to continue without 0xRay
        frameworkLogger.log("stringray-init", "init-failed-warning", "warning", {
            message: "⚠️ 0xRay framework failed to initialize",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
// Auto-initialize when this module is imported
initializeStringRay();
//# sourceMappingURL=strray-init.js.map