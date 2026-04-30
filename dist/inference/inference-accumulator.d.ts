import { SessionInference } from "./session-capture.js";
export interface InferenceCorpus {
    sessions: SessionInference[];
    totalCommits: number;
    recurringPatterns: RecurringPattern[];
    recurringProblems: RecurringProblem[];
    uniqueApproaches: string[];
    allWrongTurns: string[];
    collectedAt: string;
}
export interface RecurringPattern {
    name: string;
    occurrences: number;
    avgConfidence: number;
    sessions: string[];
    evidence: string[];
    description: string;
}
export interface RecurringProblem {
    pattern: string;
    occurrences: number;
    sessions: string[];
}
export declare function shouldTriggerCycle(inferenceDir: string, lastCycleFile: string): {
    trigger: boolean;
    reason: string;
};
export declare function accumulateCorpus(inferenceDir: string): InferenceCorpus;
export declare function loadSessionInferences(dir: string): SessionInference[];
//# sourceMappingURL=inference-accumulator.d.ts.map