import { PreProcessor } from "../processor-interfaces.js";
import type { ProcessorContext } from "../processor-types.js";

export class PreValidateProcessor extends PreProcessor {
  readonly name = "preValidate";
  readonly priority = 1;

  protected async run(context: ProcessorContext): Promise<Record<string, unknown>> {
    const { data, filePath } = context;

    if (!data && !filePath) {
      return { validated: true, syntaxCheck: "skipped", reason: "no data provided" };
    }

    if (!data) {
      return { validated: true, syntaxCheck: "skipped", reason: "no data in context" };
    }

    if (typeof data === "string" && data.includes("undefined")) {
      throw new Error("Potential undefined usage detected");
    }

    return { validated: true, syntaxCheck: "passed" };
  }
}
