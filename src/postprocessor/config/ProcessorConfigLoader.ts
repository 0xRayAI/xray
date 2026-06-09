import { frameworkLogger } from "../../core/framework-logger.js";
import { resolveConfigPath } from "../../core/config-paths.js";

export class ProcessorConfigLoader {
  async loadProcessorConfig(): Promise<{
    preValidate?: { enabled?: boolean };
    codexCompliance?: { enabled?: boolean };
    testAutoCreation?: { enabled?: boolean };
    versionCompliance?: { enabled?: boolean };
    errorBoundary?: { enabled?: boolean };
    agentsMdValidation?: { enabled?: boolean };
    stateValidation?: { enabled?: boolean };
    post_processors?: { enabled?: boolean; priority_order?: string[] };
    storytellingTrigger?: { enabled?: boolean };
    sessionSummary?: { enabled?: boolean };
    testExecution?: { enabled?: boolean };
    regressionTesting?: { enabled?: boolean };
    inferenceImprovement?: { enabled?: boolean };
  }> {
    const fs = await import("fs");
    const path = await import("path");

    try {
      const configPath = resolveConfigPath("features.json") ?? path.join(process.cwd(), "xray", "features.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        return config.processors || {};
      }
    } catch (error) {
      frameworkLogger.log("postprocessor", "processor-config-load-failed", "info", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {};
  }
}
