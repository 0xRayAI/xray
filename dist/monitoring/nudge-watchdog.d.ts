/**
 * Nudge Watchdog - Detects and breaks stuck AI patterns
 *
 * Monitors agent actions and detects common failure patterns:
 * - think-loop: AI keeps outputting thinking tags but no progress
 * - syntax-loop: AI keeps trying to fix same file/error multiple times
 * - death-spiral: AI re-explains instead of fixing
 * - tool-loop: Same tool called with similar args repeatedly
 * - repair-failure: Processor indicates fix but error persists
 *
 * @module monitoring/nudge-watchdog
 * @version 1.0.0
 */
import { EventEmitter } from "events";
export interface NudgeConfig {
    enabled: boolean;
    think_loop_threshold: number;
    syntax_loop_threshold: number;
    tool_loop_threshold: number;
    death_spiral_threshold: number;
    cooldown_ms: number;
}
export type NudgeType = "think-loop" | "syntax-loop" | "death-spiral" | "tool-loop" | "repair-failure";
export interface StuckPattern {
    type: NudgeType;
    count: number;
    firstSeen: number;
    lastSeen: number;
    details: Record<string, unknown>;
}
export interface NudgeAction {
    type: NudgeType;
    message: string;
    suggestion: string;
    priority: number;
}
declare class NudgeWatchdog extends EventEmitter {
    private config;
    private patterns;
    private lastNudgeTime;
    private thinkTagCount;
    private lastThinkTagTime;
    private toolCallHistory;
    private fixAttempts;
    private explanationCount;
    private codeChangeCount;
    private listenersInitialized;
    constructor(config?: Partial<NudgeConfig>);
    private loadConfigFromFeatures;
    start(): void;
    stop(): void;
    recordThinkTag(): void;
    recordCodeChange(): void;
    recordToolCall(tool: string, args: string): void;
    recordFixAttempt(filePath: string, error: string): void;
    recordExplanation(): void;
    recordProcessorFix(filePath: string, fixed: boolean, errorPersisted: boolean): void;
    private checkThinkLoop;
    private checkToolLoop;
    private checkSyntaxLoop;
    private checkDeathSpiral;
    private checkRepairFailure;
    private checkCooldownAndNudge;
    private triggerNudge;
    getNudgeSuggestion(type: NudgeType, context?: Record<string, unknown>): string;
    private hashArgs;
    private isSimilarError;
    private cleanupOldToolCalls;
    reset(): void;
    getStats(): {
        thinkTags: number;
        codeChanges: number;
        explanations: number;
        activePatterns: number;
        lastNudgeAgo: number;
    };
    private log;
}
export declare const nudgeWatchdog: NudgeWatchdog;
export declare function recordThinkTag(): void;
export declare function recordCodeChange(): void;
export declare function recordToolCall(tool: string, args: string): void;
export declare function recordFixAttempt(filePath: string, error: string): void;
export declare function recordExplanation(): void;
export declare function getNudgeSuggestion(type: NudgeType, context?: Record<string, unknown>): string;
export declare function getNudgeWatchdog(): NudgeWatchdog;
export declare function recordProcessorFix(filePath: string, fixed: boolean, errorPersisted: boolean): void;
export {};
//# sourceMappingURL=nudge-watchdog.d.ts.map