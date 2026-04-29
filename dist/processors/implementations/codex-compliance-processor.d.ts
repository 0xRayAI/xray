import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class CodexComplianceProcessor extends PreProcessor {
    readonly name = "codexCompliance";
    readonly priority = 2;
    protected run(context: ProcessorContext): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=codex-compliance-processor.d.ts.map