import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";
import type { ProcessorDependency } from "../processor-interfaces.js";

export class StateValidationProcessor extends PostProcessor {
  readonly name = "stateValidation";
  readonly priority = 12;

  static readonly dependencies: ProcessorDependency[] = ["stateManager"];

  private stateManager: any;

  constructor(stateManager?: any) {
    super();
    this.stateManager = stateManager;
  }

  protected async run(_context: ProcessorContext): Promise<Record<string, boolean>> {
    const currentState = this.stateManager.get("session:active");
    return { stateValid: !!currentState };
  }
}
