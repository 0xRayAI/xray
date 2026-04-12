/**
 * Complexity Handler
 *
 * Handles complexity analysis requests
 */
import type { OrchestrationTask } from '../types.js';
/**
 * Complexity Handler
 * Processes analyze-complexity requests
 */
export declare class ComplexityHandler {
    private planner;
    /**
     * Handle analyze-complexity request
     */
    handleAnalyzeComplexity(args: {
        tasks: OrchestrationTask[];
    }): Promise<{
        content: Array<{
            type: string;
            text: string;
        }>;
    }>;
    /**
     * Generate recommendations based on complexity analysis
     */
    private generateRecommendations;
    /**
     * Format complexity response
     */
    private formatComplexityResponse;
}
//# sourceMappingURL=complexity-handler.d.ts.map