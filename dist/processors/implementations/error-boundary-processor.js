import { PreProcessor } from "../processor-interfaces.js";
export class ErrorBoundaryProcessor extends PreProcessor {
    name = "errorBoundary";
    priority = 5;
    async run(_context) {
        return { boundaries: "established" };
    }
}
//# sourceMappingURL=error-boundary-processor.js.map