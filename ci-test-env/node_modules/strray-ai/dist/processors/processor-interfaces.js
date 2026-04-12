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
/**
 * Base processor class with common functionality
 */
export class BaseProcessor {
    enabled = true;
    /**
     * Execute the processor with error handling and metrics
     * @param context Processor execution context
     * @returns Processor result
     */
    async execute(context) {
        const startTime = Date.now();
        try {
            const data = await this.run(context);
            const duration = Date.now() - startTime;
            return {
                success: true,
                data,
                duration,
                processorName: this.name,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration,
                processorName: this.name,
            };
        }
    }
    /**
     * Safely extract file path from context
     */
    getFilePath(context) {
        return context.toolInput?.args?.filePath || context.filePath;
    }
    /**
     * Safely extract content from context
     */
    getContent(context) {
        return context.toolInput?.args?.content;
    }
}
/**
 * Pre-processor base class
 */
export class PreProcessor extends BaseProcessor {
    type = "pre";
}
/**
 * Post-processor base class
 */
export class PostProcessor extends BaseProcessor {
    type = "post";
}
/**
 * Processor registry for managing processor instances
 */
export class ProcessorRegistry {
    processors = new Map();
    /**
     * Register a processor
     * @param processor Processor instance
     */
    register(processor) {
        this.processors.set(processor.name, processor);
    }
    /**
     * Unregister a processor
     * @param name Processor name
     */
    unregister(name) {
        this.processors.delete(name);
    }
    /**
     * Get a processor by name
     * @param name Processor name
     * @returns Processor instance or undefined
     */
    get(name) {
        return this.processors.get(name);
    }
    /**
     * Get all registered processors
     * @returns Array of processors
     */
    getAll() {
        return Array.from(this.processors.values());
    }
    /**
     * Get processors by type
     * @param type Processor type
     * @returns Array of processors
     */
    getByType(type) {
        return this.getAll()
            .filter((p) => p.type === type)
            .sort((a, b) => a.priority - b.priority);
    }
    /**
     * Check if processor exists
     * @param name Processor name
     * @returns True if processor exists
     */
    has(name) {
        return this.processors.has(name);
    }
    /**
     * Clear all processors
     */
    clear() {
        this.processors.clear();
    }
}
// Singleton registry instance
export const processorRegistry = new ProcessorRegistry();
//# sourceMappingURL=processor-interfaces.js.map