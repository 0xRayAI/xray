/**
 * StringRay Lean System Prompt Generator
 *
 * Generates optimized, token-efficient system prompts by implementing
 * selective injection and smart compression strategies.
 *
 * @version 1.0.0
 * @since 2026-03-03
 */
/**
 * System prompt configuration options
 */
export interface SystemPromptConfig {
    showWelcomeBanner?: boolean;
    showCodexContext?: boolean;
    enableTokenOptimization?: boolean;
    maxTokenBudget?: number;
    showCriticalTermsOnly?: boolean;
    showEssentialLinks?: boolean;
}
/**
 * Generate optimized system prompt with bloat prevention
 */
export declare function generateLeanSystemPrompt(config?: SystemPromptConfig): Promise<string>;
/**
 * Smart context injection based on available tokens
 */
export declare function injectContextIntelligently(basePrompt: string, additionalContext: string, maxTokens?: number): string;
/**
 * System prompt validation
 */
export declare function validateSystemPrompt(prompt: string): {
    valid: boolean;
    warnings: string[];
};
//# sourceMappingURL=system-prompt-generator.d.ts.map