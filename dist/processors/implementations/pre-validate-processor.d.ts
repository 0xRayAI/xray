import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
export declare class PreValidateProcessor extends PreProcessor {
    readonly name = "preValidate";
    readonly priority = 1;
    protected run(context: ProcessorContext): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=pre-validate-processor.d.ts.map