import { PostProcessor } from "../processor-interfaces.js";
export class StateValidationProcessor extends PostProcessor {
    name = "stateValidation";
    priority = 12;
    stateManager;
    constructor(stateManager) {
        super();
        this.stateManager = stateManager;
    }
    async run(_context) {
        const currentState = this.stateManager.get("session:active");
        return { stateValid: !!currentState };
    }
}
//# sourceMappingURL=state-validation-processor.js.map