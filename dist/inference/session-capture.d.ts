import { StructuralPattern } from "./semantic-patterns.js";
export interface SessionInference {
    sessionId: string;
    timestamp: string;
    span: {
        from: string;
        to: string;
    };
    problems: string[];
    approaches: string[];
    wrongTurns: string[];
    solutions: string[];
    reasoningChain: ReasoningLink[];
    patterns: StructuralPattern[];
    metrics: SessionMetrics;
}
export interface ReasoningLink {
    from: string;
    to: string;
    reasoning: string;
}
export interface SessionMetrics {
    commits: number;
    filesChanged: number;
    insertions: number;
    deletions: number;
    filesAdded: number;
    filesDeleted: number;
    uniqueDirs: number;
}
export declare function captureSessionInference(fromRef: string, toRef: string): SessionInference | null;
export declare function saveSessionInference(inference: SessionInference, outputDir?: string): string;
//# sourceMappingURL=session-capture.d.ts.map