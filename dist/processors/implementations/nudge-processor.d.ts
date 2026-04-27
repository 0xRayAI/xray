/**
 * Nudge Processor - Integrates Nudge Watchdog with processor system
 *
 * Post-processor that monitors agent actions and triggers nudges
 * when stuck patterns are detected.
 *
 * @module processors/implementations
 * @version 1.0.0
 */
import { PostProcessor } from "../processor-interfaces.js";
import { ProcessorContext, ProcessorResult } from "../processor-types.js";
export declare class NudgeProcessor extends PostProcessor {
    readonly name = "nudge";
    readonly priority = 100;
    private nudgeEnabled;
    constructor();
    private loadConfig;
    protected run(context: ProcessorContext): Promise<unknown>;
    private detectMostUrgentNudge;
}
export declare const nudgeProcessor: NudgeProcessor;
export declare function executeNudgeProcessor(context: ProcessorContext): Promise<ProcessorResult>;
//# sourceMappingURL=nudge-processor.d.ts.map