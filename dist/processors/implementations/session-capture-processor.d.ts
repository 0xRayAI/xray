import { PostProcessor } from "../processor-interfaces.js";
import type { ProcessorContext, ProcessorResult } from "../processor-types.js";
export declare class SessionCaptureProcessor extends PostProcessor {
    name: string;
    priority: number;
    protected run(context: ProcessorContext): Promise<ProcessorResult>;
    private getLastTag;
}
//# sourceMappingURL=session-capture-processor.d.ts.map