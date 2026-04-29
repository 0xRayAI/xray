import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";

export class ErrorBoundaryProcessor extends PreProcessor {
  readonly name = "errorBoundary";
  readonly priority = 5;

  protected async run(_context: ProcessorContext): Promise<Record<string, string>> {
    return { boundaries: "established" };
  }
}
