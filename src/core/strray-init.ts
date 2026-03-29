/**
 * StringRay Framework Initialization
 *
 * This file integrates StringRay framework activation directly into OpenCode's
 * core initialization process.
 */

// Import and activate StringRay framework during OpenCode startup
import { activateStringRayFramework } from "./strray-activation.js";
import { frameworkLogger } from "../core/framework-logger.js";

// Initialize StringRay framework when OpenCode starts
export async function initializeStringRay(): Promise<void> {
  const jobId = `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await activateStringRayFramework();
    frameworkLogger.log(
      "stringray-init",
      "StringRay framework initialized successfully",
      "success",
      { jobId },
    );
  } catch (error: unknown) {
    frameworkLogger.log(
      "stringray-init",
      "StringRay framework initialization failed",
      "error",
      { jobId, error },
    );
    // Don't throw - allow OpenCode to continue without StringRay
    frameworkLogger.log("stringray-init", "init-failed-warning", "warning", {
      message: "⚠️ StringRay framework failed to initialize",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Auto-initialize when this module is imported
initializeStringRay();
