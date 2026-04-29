import { StringRayStateManager } from "../state/state-manager.js";
import { ProcessorRegistration, ProcessorHook } from "./processor-types.js";
export interface ProcessorConfig {
    name: string;
    type: "pre" | "post";
    priority: number;
    enabled: boolean;
    timeout?: number;
    retryAttempts?: number;
    hook?: ProcessorHook;
}
export interface ProcessorResult {
    success: boolean;
    data?: unknown;
    error?: string;
    duration: number;
    processorName: string;
}
export interface ProcessorHealth {
    name: string;
    status: "healthy" | "degraded" | "failed";
    lastExecution: number;
    successRate: number;
    averageDuration: number;
    errorCount: number;
}
export interface ProcessorMetrics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    lastExecutionTime: number;
    healthStatus: ProcessorHealth["status"];
}
type ProcessorFactory = {
    execute: (context: Record<string, unknown>) => Promise<unknown>;
    init?: () => Promise<void>;
};
export declare class ProcessorManager {
    private processors;
    private metrics;
    private stateManager;
    private activeProcessors;
    private factories;
    constructor(stateManager: StringRayStateManager);
    private registerBuiltInFactories;
    registerFactory(name: string, factory: ProcessorFactory): void;
    registerProcessorWithHook(registration: ProcessorRegistration): void;
    registerProcessor(config: ProcessorConfig): void;
    unregisterProcessor(name: string): void;
    getProcessors(): Map<string, ProcessorConfig>;
    initializeProcessors(): Promise<boolean>;
    private initializeProcessor;
    executePreProcessors(input: {
        tool: string;
        args?: Record<string, unknown>;
        context?: Record<string, unknown>;
    }): Promise<{
        success: boolean;
        results: ProcessorResult[];
    }>;
    executePostProcessors(operation: string, data: any, preResults: ProcessorResult[]): Promise<ProcessorResult[]>;
    private executeProcessor;
    private updateMetrics;
    getProcessorHealth(): ProcessorHealth[];
    private validateProcessorContext;
    resolveProcessorConflicts(conflicts: ProcessorResult[]): ProcessorResult;
    cleanupProcessors(): Promise<void>;
    private cleanupProcessor;
}
export {};
//# sourceMappingURL=processor-manager.d.ts.map