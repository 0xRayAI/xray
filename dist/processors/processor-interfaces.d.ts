/**
 * Processor Interface and Base Classes
 *
 * Defines the contract for all processors in the 0xRay framework.
 * Replaces the switch statement anti-pattern in ProcessorManager with
 * polymorphic processor classes.
 *
 * @module processors/interfaces
 * @version 1.0.0
 */
import { ProcessorContext, ProcessorResult, LogProtectionProcessorResult, TestExecutionResult, CodexComplianceProcessorResult, VersionComplianceProcessorResult, TestAutoCreationResult, CoverageAnalysisResult } from "./processor-types.js";
/**
 * Union of all known processor result types for type safety
 */
export type ProcessorResultData = LogProtectionProcessorResult | TestExecutionResult | CodexComplianceProcessorResult | VersionComplianceProcessorResult | TestAutoCreationResult | CoverageAnalysisResult;
/**
 * Processor interface - all processors must implement this
 */
export interface IProcessor {
    /** Unique processor identifier */
    readonly name: string;
    /** Processor type: pre or post */
    readonly type: "pre" | "post";
    /** Execution priority (lower = earlier) */
    readonly priority: number;
    /** Whether processor is enabled */
    enabled: boolean;
    /**
     * Execute the processor
     * @param context Processor execution context
     * @returns Processor result
     */
    execute(context: ProcessorContext): Promise<ProcessorResult>;
}
/**
 * Base processor class with common functionality
 */
export declare abstract class BaseProcessor implements IProcessor {
    abstract readonly name: string;
    abstract readonly type: "pre" | "post";
    abstract readonly priority: number;
    enabled: boolean;
    /**
     * Execute the processor with error handling and metrics
     * @param context Processor execution context
     * @returns Processor result
     */
    execute(context: ProcessorContext): Promise<ProcessorResult>;
    /**
     * Override this method in subclasses to implement processor logic
     * @param context Processor execution context
     * @returns Processor data
     */
    protected abstract run(context: ProcessorContext): Promise<unknown>;
    /**
     * Safely extract file path from context
     */
    protected getFilePath(context: ProcessorContext): string | undefined;
    /**
     * Safely extract content from context
     */
    protected getContent(context: ProcessorContext): string | undefined;
}
/**
 * Pre-processor base class
 */
export declare abstract class PreProcessor extends BaseProcessor {
    readonly type: "pre";
}
/**
 * Post-processor base class
 */
export declare abstract class PostProcessor extends BaseProcessor {
    readonly type: "post";
}
/**
 * Processor registry for managing processor instances
 */
export declare class ProcessorRegistry {
    private processors;
    /**
     * Register a processor
     * @param processor Processor instance
     */
    register(processor: IProcessor): void;
    /**
     * Unregister a processor
     * @param name Processor name
     */
    unregister(name: string): void;
    /**
     * Get a processor by name
     * @param name Processor name
     * @returns Processor instance or undefined
     */
    get(name: string): IProcessor | undefined;
    /**
     * Get all registered processors
     * @returns Array of processors
     */
    getAll(): IProcessor[];
    /**
     * Get processors by type
     * @param type Processor type
     * @returns Array of processors
     */
    getByType(type: "pre" | "post"): IProcessor[];
    /**
     * Check if processor exists
     * @param name Processor name
     * @returns True if processor exists
     */
    has(name: string): boolean;
    /**
     * Clear all processors
     */
    clear(): void;
}
export type { ProcessorContext, ProcessorResult } from "./processor-types.js";
export declare const processorRegistry: ProcessorRegistry;
//# sourceMappingURL=processor-interfaces.d.ts.map