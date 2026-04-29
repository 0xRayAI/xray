import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { StringRayStateManager } from "../../state/state-manager.js";
export declare class StateValidationProcessor extends PostProcessor {
    readonly name = "stateValidation";
    readonly priority = 12;
    private stateManager;
    constructor(stateManager: StringRayStateManager);
    protected run(_context: ProcessorContext): Promise<Record<string, boolean>>;
}
//# sourceMappingURL=state-validation-processor.d.ts.map