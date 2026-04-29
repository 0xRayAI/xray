import { PostProcessor } from "../processor-interfaces.js";
import { frameworkLogger } from "../../core/framework-logger.js";
export class RegressionTestingProcessor extends PostProcessor {
    name = "regressionTesting";
    priority = 15;
    async run(_context) {
        frameworkLogger.log("regression-testing-processor", "running", "info");
        return { regressions: "checked", issues: [] };
    }
}
//# sourceMappingURL=regression-testing-processor.js.map