import type { InferenceEntry } from '../types.js';
export interface BatchPromptOptions {
    batchIndex: number;
    totalBatches: number;
    entries: InferenceEntry[];
    globalIndex: number;
    dynamoStats: {
        pass: number;
        reject: number;
        avgResonance: string;
        analyzedSoFar: number;
    };
}
export declare class SynthesisPromptBuilder {
    buildBatchPrompt(options: BatchPromptOptions): string;
    buildFinalSynthesisPrompt(entryCount: number, dynamoStats: {
        pass: number;
        reject: number;
        avgResonance: string;
    }, batchResults: string[], entries?: InferenceEntry[]): string;
}
//# sourceMappingURL=synthesis-prompt-builder.d.ts.map