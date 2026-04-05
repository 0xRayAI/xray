/**
 * StringRay Context Size Validator
 *
 * Prevents system prompt bloat by validating and rejecting context-injection attempts
 * that would exceed token budgets.
 *
 * @version 1.0.0
 * @since 2026-03-03
 */
/**
 * Context size configuration
 */
export interface ContextSizeConfig {
    maxSystemPromptLength: number;
    maxCodexContextLength: number;
    maxTotalPromptLength: number;
    enableCompression: boolean;
    preventDuplicateContent: boolean;
}
/**
 * Context validation result
 */
export interface ValidationResult {
    isValid: boolean;
    sizeInTokens: number;
    exceedsBudget: boolean;
    warnings: string[];
    compressionApplied: boolean;
    optimizedContent?: string;
}
/**
 * Validate context size and detect bloat
 */
export declare function validateContext(context: string, config?: Partial<ContextSizeConfig>): ValidationResult;
/**
 * Validate context collection (multiple contexts combined)
 */
export declare function validateContextCollection(contexts: string[], config?: Partial<ContextSizeConfig>): ValidationResult;
/**
 * Prevent system prompt bloat middleware
 */
export declare function preventSystemPromptBloat(context: string, onWarning?: (warning: string) => void): string;
/**
 * Utility function to check if a prompt is likely to cause overflow
 */
export declare function isPromptLikelyToOverflow(prompt: string): boolean;
/**
 * Generate a safe system prompt template
 */
export declare function generateSafeSystemPrompt(baseTemplate: string, additionalContext: string, maxTokens?: number): {
    prompt: string;
    safe: boolean;
};
//# sourceMappingURL=context-validator.d.ts.map