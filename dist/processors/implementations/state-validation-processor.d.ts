import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import type { ProcessorDependency } from "../processor-interfaces.js";
export declare class StateValidationProcessor extends PostProcessor {
    readonly name = "stateValidation";
    readonly priority = 12;
    static readonly dependencies: ProcessorDependency[];
    private stateManager;
    constructor(stateManager?: any);
    protected run(_context: ProcessorContext): Promise<Record<string, boolean>>;
}
//# sourceMappingURL=state-validation-processor.d.ts.map