/**
 * Configuration Validator
 *
 * Validates MCP server configurations for completeness and correctness.
 *
 * Extracted from mcp-client.ts as part of Phase 2 refactoring.
 */
import { IServerConfig } from '../types/index.js';
/**
 * Result of a configuration validation
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validates MCP server configurations
 */
export declare class ConfigValidator {
    /**
     * Validate a single server configuration
     */
    validate(config: IServerConfig): ValidationResult;
    /**
     * Validate multiple server configurations
     */
    validateAll(configs: IServerConfig[]): ValidationResult;
    /**
     * Validate and filter - returns only valid configs
     */
    filterValid(configs: IServerConfig[]): IServerConfig[];
    /**
     * Get validation errors for all invalid configs
     */
    getValidationErrors(configs: IServerConfig[]): Record<string, string[]>;
}
/**
 * Default singleton instance of the config validator
 */
export declare const defaultConfigValidator: ConfigValidator;
//# sourceMappingURL=config-validator.d.ts.map