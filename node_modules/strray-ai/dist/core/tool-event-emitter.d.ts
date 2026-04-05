/**
 * Tool Event Emitter
 *
 * Simple event system to capture all tool calls and route them
 * through the activity logger and skills router.
 *
 * @version 1.0.0
 */
import { EventEmitter } from "events";
export interface ToolEvent {
    tool: string;
    args: Record<string, unknown>;
    result?: unknown;
    error?: string;
    duration: number;
    timestamp: number;
    sessionId?: string;
}
declare class ToolEventEmitter extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): ToolEventEmitter;
    private setupLogging;
    emitToolStart(tool: string, args: Record<string, unknown>): void;
    emitToolComplete(tool: string, args: Record<string, unknown>, result?: unknown, error?: string, duration?: number): void;
}
export declare const toolEvents: ToolEventEmitter;
export declare function logToolStart(tool: string, args?: Record<string, unknown>): void;
export declare function logToolComplete(tool: string, args?: Record<string, unknown>, result?: unknown, error?: string, duration?: number): void;
export {};
//# sourceMappingURL=tool-event-emitter.d.ts.map