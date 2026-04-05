/**
 * Base Rule Loader
 *
 * Abstract base class for all rule loaders. Provides common functionality
 * for loading rules from various sources such as files, APIs, or databases.
 *
 * Phase 4 refactoring: Extracted from RuleEnforcer to separate loading logic
 * from rule execution.
 *
 * @module loaders/base-loader
 * @version 1.0.0
 */
import * as fs from "fs";
import { IRuleLoader, RuleDefinition } from "../types.js";
/**
 * Abstract base class implementing IRuleLoader interface.
 * Provides common file loading utilities and error handling.
 *
 * @example
 * ```typescript
 * class MyLoader extends BaseLoader {
 *   readonly name = 'my-loader';
 *
 *   async load(): Promise<RuleDefinition[]> {
 *     const data = await this.loadJsonFile('rules.json');
 *     return this.transformToRules(data);
 *   }
 *
 *   async isAvailable(): Promise<boolean> {
 *     return this.fileExists('rules.json');
 *   }
 * }
 * ```
 */
export declare abstract class BaseLoader implements IRuleLoader {
    /** Unique name identifier for this loader */
    abstract readonly name: string;
    /**
     * Load rules from the source.
     * Must be implemented by concrete loader classes.
     * @returns Promise resolving to array of rule definitions
     */
    abstract load(): Promise<RuleDefinition[]>;
    /**
     * Check if this loader's source is available.
     * Must be implemented by concrete loader classes.
     * @returns Promise resolving to true if source exists and is accessible
     */
    abstract isAvailable(): Promise<boolean>;
    /**
     * Load and parse a JSON file.
     * @param filePath - Path to the JSON file
     * @returns Promise resolving to parsed JSON data
     * @throws Error if file cannot be read or parsed
     */
    protected loadJsonFile<T = unknown>(filePath: string): Promise<T>;
    /**
     * Check if a file exists.
     * @param filePath - Path to check
     * @returns Promise resolving to true if file exists
     */
    protected fileExists(filePath: string): Promise<boolean>;
    /**
     * Read file content as string.
     * @param filePath - Path to the file
     * @returns Promise resolving to file content
     * @throws Error if file cannot be read
     */
    protected readFile(filePath: string): Promise<string>;
    /**
     * Resolve a path relative to the current working directory.
     * @param relativePath - Path relative to process.cwd()
     * @returns Absolute path
     */
    protected resolvePath(relativePath: string): string;
    /**
     * Get file stats.
     * @param filePath - Path to the file
     * @returns Promise resolving to file stats
     * @throws Error if file cannot be accessed
     */
    protected getFileStats(filePath: string): Promise<fs.Stats>;
}
//# sourceMappingURL=base-loader.d.ts.map