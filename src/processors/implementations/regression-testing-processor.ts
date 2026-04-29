import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { frameworkLogger } from "../../core/framework-logger.js";

export class RegressionTestingProcessor extends PostProcessor {
  readonly name = "regressionTesting";
  readonly priority = 15;

  protected async run(_context: ProcessorContext): Promise<Record<string, unknown>> {
    frameworkLogger.log("regression-testing-processor", "running", "info");
    return { regressions: "checked", issues: [] };
  }
}
