/**
 * GovernanceService
 *
 * Central orchestrator for governance.
 *
 * Architecture:
 *   - Internal Layer: 3 real skill MCPs (code-review, security-audit, researcher)
 *     → Internal deliberation based on knowledge and code patterns.
 *
 *   - External Filter: Dynamo Solar SSOT
 *     → Single Source of Truth governance signal based on sunlight physics,
 *       a neural net, and temporal first principles. This is a required check.
 *
 *   - Merge Layer: governance-core.ts (weighted voting + PHI/TAU matrix)
 *
 * Dynamo Solar SSOT is treated as a mandatory external filter (not optional, not a fallback).
 */

import { pluginRegistry } from '../nucleus/plugin-registry.js';
import {
  getGovernanceIntegration,
  type InferenceGovernanceIntegration,
} from '../integrations/governance/index.js';
import type { InferenceProposal } from '../inference/inference-cycle.js';
import {
  GovernanceProposal,
  GovernanceVote,
  GovernanceResult,
  GovernanceContext,
  GovernOptions,
  GovernanceRequest,
  GovernanceResponse,
} from './governance-types.js';
import { mergeVotes, calculateMetamorphosisScore } from './governance-core.js';
import { frameworkLogger } from '../core/framework-logger.js';

export class GovernanceService {
  constructor() {
    // We deliberately do *not* cache the integration here.
    // On Vercel / serverless, initializeGovernanceIntegration() may be called
    // after the first getGovernanceService() instance is created.
    // We always fetch fresh via getGovernanceIntegration() on each govern() call.
  }

  /**
   * Main entry point: Govern a set of proposals.
   *
   * Flow:
   *   1. Internal deliberation → 3 real skill MCPs (code-review, security-audit, researcher)
   *   2. External filter       → Dynamo Solar SSOT (via InferenceGovernanceIntegration)
   *   3. Merge                 → governance-core.ts (weighted + PHI/TAU logic)
   *
   * Dynamo Solar SSOT is treated as a hard requirement by default.
   */
  async govern(request: GovernanceRequest): Promise<GovernanceResponse> {
    const { proposals, context, options } = request;
    const requireExternal = options?.requireExternalDynamo ?? !process.env.XRAY_LOCAL_MODE;
    const timeoutMs = options?.timeoutMs ?? 90000;
    const maxAbstentionThreshold = options?.maxAbstentionThreshold ?? 1.0;

    frameworkLogger.log('governance-service', 'govern-start', 'info', {
      proposalCount: proposals.length,
      context,
      requireExternalDynamo: requireExternal,
      timeoutMs,
    });

    // Early validation: Dynamo Solar SSOT is a hard requirement
    if (requireExternal) {
      const integration = getGovernanceIntegration();
      if (!integration?.isAvailable?.()) {
        const message =
          'Dynamo Solar SSOT is required but InferenceGovernanceIntegration is not available. ' +
          'Call initializeGovernanceIntegration() early in application startup.';

        frameworkLogger.log('governance-service', 'dynamo-solar-ssot-unavailable', 'error', { message });
        throw new Error(message);
      }
    }

    // Run governance with end-to-end timeout
    const result = await this.runGovernanceWithTimeout(
      proposals, context, requireExternal, timeoutMs, options?.metamorphosisThreshold,
    );

    // Check abstention threshold
    if (result.results.length > 0 && maxAbstentionThreshold < 1.0) {
      const totalVotes = result.results.reduce((sum, r) => sum + r.votes.length, 0);
      const abstentions = result.results.reduce(
        (sum, r) => sum + r.votes.filter(v => v.decision === 'abstain').length, 0,
      );
      const abstentionRatio = totalVotes > 0 ? abstentions / totalVotes : 0;
      if (abstentionRatio > maxAbstentionThreshold) {
        const message =
          `Abstention ratio ${abstentionRatio.toFixed(2)} exceeds threshold ${maxAbstentionThreshold} — ` +
          'too many governance servers unavailable';
        frameworkLogger.log('governance-service', 'abstention-threshold-exceeded', 'error', {
          abstentionRatio,
          maxAbstentionThreshold,
        });
        throw new Error(message);
      }
    }

    const approved = result.results.filter(r => r.finalDecision === 'approve').length;
    const needsRevision = result.results.filter(r => r.finalDecision === 'needs_revision').length;
    const rejected = result.results.filter(r => r.finalDecision === 'reject').length;

    return {
      results: result.results,
      overallDecision: approved > proposals.length * 0.6
        ? 'approve'
        : rejected > approved ? 'reject' : 'needs_revision',
      summary: {
        total: proposals.length,
        approved,
        needsRevision,
        rejected,
      },
    };
  }

  private async runGovernanceWithTimeout(
    proposals: GovernanceProposal[],
    context: GovernanceContext | undefined,
    requireExternal: boolean,
    timeoutMs: number,
    metamorphosisThreshold?: number,
  ): Promise<{ results: GovernanceResult[] }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 1. Call the three real skill MCPs (one call per server, returns array of votes, one per proposal)
      const [codeReviewVotes, securityVotes, researcherVotes] = await Promise.all([
        this.callSkillServer("code-review", proposals, context),
        this.callSkillServer("security-audit", proposals, context),
        this.callSkillServer("researcher", proposals, context),
      ]);

      // 2. Always call external Dynamo (required) - returns array of arrays (one inner array per proposal)
      const externalVotes = await this.callExternalDynamo(proposals, requireExternal);

      // 3. Merge everything
      const results: GovernanceResult[] = proposals.map((proposal, index) => {
        const votes: GovernanceVote[] = [
          codeReviewVotes[index] || { server: "code-review", decision: "abstain", confidence: 0.3, reasoning: "missing" },
          securityVotes[index] || { server: "security-audit", decision: "abstain", confidence: 0.3, reasoning: "missing" },
          researcherVotes[index] || { server: "researcher", decision: "abstain", confidence: 0.3, reasoning: "missing" },
          ...(externalVotes[index] || []),
        ];

        const merged = mergeVotes(votes);
        const isMetamorphosis = proposal.type === 'metamorphosis' || proposal.source === 'metamorphosis';

        const result: GovernanceResult = {
          proposalId: proposal.id,
          finalDecision: merged.finalDecision,
          averageConfidence: merged.averageConfidence,
          votes,
          reasoningSummary: merged.reasoningSummary,
        };

        // Metamorphosis resonance scoring: only for self-evolution proposals
        if (isMetamorphosis) {
          const threshold = metamorphosisThreshold ?? 0.7;
          const metaInput: { averageConfidence: number; proposalType: string; historicalCoherence?: number; resonanceScore?: number } = {
            averageConfidence: merged.averageConfidence,
            proposalType: proposal.type,
          };
          const externalConfidence = externalVotes[index]?.[0]?.confidence;
          if (externalConfidence !== undefined) {
            metaInput.historicalCoherence = externalConfidence;
          }
          result.metamorphosisScore = calculateMetamorphosisScore(metaInput);

          // Reject metamorphosis proposals that don't meet the threshold
          if (result.metamorphosisScore < threshold && result.finalDecision === 'approve') {
            result.finalDecision = 'needs_revision';
            result.reasoningSummary += ` | Metamorphosis score ${result.metamorphosisScore} below threshold ${threshold}`;
          }
        }

        return result;
      });

      return { results };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callSkillServer(
    serverName: string,
    proposals: GovernanceProposal[],
    context?: GovernanceContext
  ): Promise<GovernanceVote[]> {
    const votes: GovernanceVote[] = [];

    // Phase 4: all skills go through pluginRegistry. No MCP fallback.
    if (!pluginRegistry.has(serverName)) {
      frameworkLogger.log('governance-service', 'skill-not-registered', 'warning', {
        server: serverName,
        message: 'Skill not found in pluginRegistry — returning abstain',
      });
      for (const proposal of proposals) {
        votes.push({
          server: serverName,
          decision: 'abstain',
          confidence: 0.3,
          reasoning: `No plugin registered for ${serverName}`,
        });
      }
      return votes;
    }

    for (const proposal of proposals) {
      try {
        const result = await pluginRegistry.callSkill(serverName, {
          proposalTitle: proposal.title,
          proposalDescription: proposal.description,
          evidence: proposal.evidence || [],
          proposalType: proposal.type,
        });
        const text = result?.content?.[0]?.text || '';
        const vote = this.parseVoteFromText(serverName, text);
        votes.push(vote);
      } catch (error) {
        frameworkLogger.log('governance-service', 'plugin-skill-error', 'error', {
          server: serverName,
          proposal: proposal.title,
          error: error instanceof Error ? error.message : String(error),
          mode: 'plugin-registry',
        });
        votes.push({
          server: serverName,
          decision: 'abstain',
          confidence: 0.3,
          reasoning: `Plugin skill ${serverName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return votes;
  }

  private async callExternalDynamo(
    proposals: GovernanceProposal[],
    requireExternal: boolean
  ): Promise<GovernanceVote[][]> {
    const results: GovernanceVote[][] = [];
    const integration = getGovernanceIntegration();

    const integrationAvailable = integration?.isAvailable?.() === true;

    if (!integrationAvailable) {
      const message =
        'Dynamo Solar SSOT is required but InferenceGovernanceIntegration is not available or not initialized. ' +
        'Call initializeGovernanceIntegration() early during application bootstrap.';

      frameworkLogger.log('governance-service', 'dynamo-solar-ssot-unavailable', 'error', {
        requireExternal,
        message,
      });

      if (requireExternal) {
        throw new Error(message);
      }

      // If external is not strictly required, return abstain votes
      for (const proposal of proposals) {
        results.push([{
          server: 'external-dynamo',
          decision: 'abstain',
          confidence: 0.2,
          reasoning: 'InferenceGovernanceIntegration not available',
        }]);
      }
      return results;
    }

    // Integration is available — use it exclusively (no fallback)
    for (const proposal of proposals) {
      try {
        const inferenceType = (
          proposal.type === 'strategic' || proposal.type === 'compliance'
            ? 'refactor'
            : proposal.type
        ) as InferenceProposal['type'];
        const inferenceProposal: InferenceProposal = {
          id: proposal.id,
          type: inferenceType,
          title: proposal.title,
          description: proposal.description,
          evidence: proposal.evidence || [],
          confidence: proposal.confidence || 0.8,
          source: 'recurring_pattern',
          status: 'pending',
        };

        const result = await integration!.checkProposal(inferenceProposal);

        results.push([{
          server: 'external-dynamo',
          decision: result.vote === 'YES' ? 'approve' : result.vote === 'NO' ? 'reject' : 'needs_revision',
          confidence: result.governanceResponse?.confidence ?? 0.85,
          reasoning: result.reason || 'Dynamo Solar SSOT filter decision',
          weight: 1.1,
          moralTension: result.moralTension,
          moralScore: result.moralScore,
          moralFusion: result.moralFusion,
          detectedVirtues: result.detectedVirtues,
          detectedConcerns: result.detectedConcerns,
        }]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        frameworkLogger.log('governance-service', 'external-dynamo-error', 'error', { error: msg });

        if (requireExternal) {
          throw new Error(`External Dynamo governance is required but failed: ${msg}`);
        }

        results.push([{
          server: 'external-dynamo',
          decision: 'abstain',
          confidence: 0.3,
          reasoning: `External governance call failed: ${msg}`,
        }]);
      }
    }

    return results;
  }

  private parseVoteFromText(server: string, text: string): GovernanceVote {
    const decisionMatch = text.match(/DECISION:\s*(approve|reject|abstain|needs_revision)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*([0-9.]+)/);
    const reasoningMatch = text.match(/REASONING:\s*([\s\S]+)/);

    return {
      server,
      decision: (decisionMatch?.[1]?.toLowerCase() as GovernanceVote['decision']) || 'abstain',
      confidence: parseFloat(confidenceMatch?.[1] || '0.5'),
      reasoning: reasoningMatch?.[1]?.trim() || 'No reasoning provided',
    };
  }

}

// Singleton for convenience
let governanceServiceInstance: GovernanceService | null = null;

/**
 * Get the singleton GovernanceService instance.
 *
 * @deprecated Use `handleGovernRequest` from `src/nucleus/index.js` instead.
 * All callers should go through the nucleus surface. Direct use of
 * GovernanceService bypasses nucleus lifecycle, logging, and future
 * governance pipeline enhancements.
 */
export function getGovernanceService(): GovernanceService {
  if (!governanceServiceInstance) {
    governanceServiceInstance = new GovernanceService();
  }
  return governanceServiceInstance;
}
