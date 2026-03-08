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

import { getKernel } from '../../core/kernel-patterns.js';
import { createAgentDelegator } from '../../delegation/agent-delegator.js';
import { frameworkLogger } from '../../core/framework-logger.js';
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
export class RegressionAnalysisService {
  private kernel = getKernel();

  /**
   * Determine if regression analysis is required for this context
   */
  async shouldAnalyze(context: PostProcessorContext): Promise<AnalysisDecision> {
    // Check kernel patterns first
    const kernelAnalysis = this.kernel.analyze(JSON.stringify(context));
    
     // Check for fatal assumptions that require analysis
    const fatalAssumptions = kernelAnalysis.fatalAssumptions;
    if (fatalAssumptions && fatalAssumptions.length > 0) {
      return {
        required: true,
        reason: `Fatal assumption detected: ${fatalAssumptions[0].reason}`,
        agents: ['bug-triage-specialist', 'code-analyzer', 'enforcer'],
        depth: 'comprehensive',
        confidence: 0.95
      };
    }
    
    // Check for cascade patterns that require analysis
    if (kernelAnalysis.patterns && kernelAnalysis.patterns.length > 0) {
      return {
        required: true,
        reason: `Cascade pattern detected: ${kernelAnalysis.patterns[0].pattern}`,
        agents: ['bug-triage-specialist', 'code-analyzer', 'enforcer'],
        depth: 'comprehensive',
        confidence: 0.9
      };
    }
    
    // Check for cascade patterns that require analysis
    if (kernelAnalysis.patterns && kernelAnalysis.patterns.length > 0) {
      return {
        required: true,
        reason: `Cascade pattern detected: ${kernelAnalysis.patterns[0].pattern}`,
        agents: ['bug-triage-specialist', 'code-analyzer', 'enforcer'],
        depth: 'comprehensive',
        confidence: 0.9
      };
    }
    
    // Check for code removal attempts
    if (this.isCodeRemovalAttempt(context)) {
      return {
        required: true,
        reason: 'Code removal attempt detected - systematic analysis required',
        agents: ['bug-triage-specialist', 'code-analyzer', 'enforcer'],
        depth: 'comprehensive',
        confidence: 0.95
      };
    }
    
    // Check for AI degradation patterns
    if (kernelAnalysis.patterns && kernelAnalysis.patterns.length > 0) {
      const aiDegradationPattern = kernelAnalysis.patterns.find(p => p.id === 'A10' || p.id === 'A15');
      
      if (aiDegradationPattern) {
        return {
          required: true,
          reason: 'AI degradation pattern detected - quality check required',
          agents: ['bug-triage-specialist', 'code-analyzer', 'enforcer'],
          depth: 'comprehensive',
          confidence: 0.9
        };
      }
    }
    
    // No analysis required
    return {
      required: false,
      confidence: 0.8
    };
  }

  /**
   * Invoke regression analysis with appropriate agents
   */
  async invokeAnalysis(
    context: PostProcessorContext,
    decision: AnalysisDecision
  ): Promise<void> {
    await frameworkLogger.log(
      'regression-analysis-service',
      'invoking-analysis',
      'info',
      {
        reason: decision.reason,
        agents: decision.agents,
        depth: decision.depth,
        confidence: decision.confidence
      }
    );

    // Create delegation request for multi-agent conference
    const delegationRequest = {
      operation: 'regression-analysis',
      description: `Systematic regression analysis: ${decision.reason}`,
      context: {
        ...context,
        analysisDepth: decision.depth
      },
      conferenceType: 'regression-investigation'
    };

    // Create agent delegator for this operation
    const agentDelegator = createAgentDelegator();

    // Analyze delegation strategy
    const analysis = await agentDelegator.analyzeDelegation(delegationRequest);

    // Execute delegation
    const result = await agentDelegator.executeDelegation(analysis, delegationRequest);

    if (!result.success) {
      await frameworkLogger.log(
        'regression-analysis-service',
        'analysis-failed',
        'error',
        {
          error: result.errors?.join(', '),
          agents: analysis.agents
        }
      );

      // If analysis fails, block the operation
      throw new Error(`Regression analysis failed: ${result.errors?.join(', ')}`);
    }

    await frameworkLogger.log(
      'regression-analysis-service',
      'analysis-completed',
      'success',
      {
        agents: analysis.agents,
        executionTime: result.totalTime
      }
    );
  }

  /**
   * Validate that no regression was introduced after operation
   */
  async validateNoRegression(context: PostProcessorContext): Promise<void> {
    // Run regression validation tests
    await frameworkLogger.log(
      'regression-analysis-service',
      'post-operation-validation',
      'info',
      { context: context.operation }
    );
  }

  /**
   * Detect if operation is attempting to remove code
   */
  private isCodeRemovalAttempt(context: PostProcessorContext): boolean {
    const operation = context.operation?.toLowerCase() || '';
    const removalKeywords = ['delete', 'remove', 'eliminate', 'strip', 'prune'];

    return removalKeywords.some(keyword => operation.includes(keyword));
  }
}
