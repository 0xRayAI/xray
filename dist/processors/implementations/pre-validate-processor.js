import { PreProcessor } from "../processor-interfaces.js";
export class PreValidateProcessor extends PreProcessor {
    name = "preValidate";
    priority = 1;
    async run(context) {
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
//# sourceMappingURL=pre-validate-processor.js.map