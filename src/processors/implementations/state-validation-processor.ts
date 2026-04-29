import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import { StringRayStateManager } from "../../state/state-manager.js";

export class StateValidationProcessor extends PostProcessor {
  readonly name = "stateValidation";
  readonly priority = 12;

  private stateManager: StringRayStateManager;

  constructor(stateManager: StringRayStateManager) {
    super();
    this.stateManager = stateManager;
  }

  protected async run(_context: ProcessorContext): Promise<Record<string, boolean>> {
    const currentState = this.stateManager.get("session:active");
    return { stateValid: !!currentState };
  }
}
