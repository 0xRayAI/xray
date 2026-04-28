/**
 * Regression Analysis Service
 *
 * Systematically analyzes PostProcessor operations to detect regressions,
 * AI code removal attempts, and other critical issues.
 * Triggers multi-agent conferences when analysis is required.
 *
 * @version 1.0.0
 * @since 2026-03-08
 */
import { PostProcessorContext } from '../types.js';
export interface AnalysisDecision {
    required: boolean;
    reason?: string;
    agents?: string[];
    depth?: 'shallow' | 'deep' | 'comprehensive';
    confidence?: number;
}
/**
 * Main service for systematic regression analysis
 */
export declare class RegressionAnalysisService {
    private kernel;
    /**
     * Determine if regression analysis is required for this context
     */
    shouldAnalyze(context: PostProcessorContext): Promise<AnalysisDecision>;
    /**
     * Invoke regression analysis with appropriate agents
     */
    invokeAnalysis(context: PostProcessorContext, decision: AnalysisDecision): Promise<void>;
    /**
     * Validate that no regression was introduced after operation
     */
    validateNoRegression(context: PostProcessorContext): Promise<void>;
    /**
     * Detect if operation is attempting to remove code
     */
    private isCodeRemovalAttempt;
}
//# sourceMappingURL=RegressionAnalysisService.d.ts.map