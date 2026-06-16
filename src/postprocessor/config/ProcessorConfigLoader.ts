import { featuresConfigLoader } from "../../core/features-config.js";
import { frameworkLogger } from "../../core/framework-logger.js";

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
    try {
      const config = featuresConfigLoader.loadConfig();
      return config.processors ?? {};
    } catch (error) {
      frameworkLogger.log("postprocessor", "processor-config-load-failed", "info", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {};
  }
}
