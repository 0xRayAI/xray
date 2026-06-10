/**
 * Pure governance decision logic.
 * This module contains the merging rules and metamorphosis scoring.
 * It has no side effects and does not call any MCPs.
 *
 * This is the shared "pure logic" that both the Governance MCP
 * and any HTTP deployment (Vercel) can use.
 */

import type { GovernanceVote, GovernanceResult } from './governance-types.js';

/**
 * Calculate metamorphosis resonance score for self-evolution proposals.
 *
 * Evaluates whether a proposal increases the system's capacity to govern
 * complex future states. Uses the existing Dynamo resonance signal plus
 * checks for self-improvement indicators.
 *
 * Scoring rubric (0-1):
 * - Base: governance vote confidence (averageConfidence)
 * - Boost: +0.1 if proposal adds new capacity (type=automate/codify)
 * - Boost: +0.05 if historical coherence is strong (>0.8)
 * - Penalty: -0.15 if proposal removes existing capacity (type=compliance-only)
 * - Floor: 0.0, Ceiling: 1.0
 * - Threshold for approval: ≥ 0.7 (configurable via GovernOptions.metamorphosisThreshold)
 *
 * Only meaningful when proposal.type === 'metamorphosis' or source === 'metamorphosis'.
 */
export function calculateMetamorphosisScore(input: {
  averageConfidence: number;
  proposalType: string;
  historicalCoherence?: number;
  resonanceScore?: number;
}): number {
  let score = input.averageConfidence;

  // Self-improvement capacity: proposals that add automation or codification boost the score
  if (input.proposalType === 'automate' || input.proposalType === 'codify') {
    score += 0.10;
  }

  // Compliance-only proposals (guard type with no new capacity) get a penalty
  if (input.proposalType === 'compliance') {
    score -= 0.15;
  }

  // Strong historical coherence means the system is stable enough for self-evolution
  if (input.historicalCoherence != null && input.historicalCoherence > 0.8) {
    score += 0.05;
  }

  // High Dynamo resonance (Solar signal) supports self-evolution
  if (input.resonanceScore != null && input.resonanceScore >= 0.82) {
    score += 0.05;
  }

  return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));
}

/**
 * Simple weighted merge of votes from multiple servers + external.
 */
export function mergeVotes(votes: GovernanceVote[]): {
  finalDecision: GovernanceResult['finalDecision'];
  averageConfidence: number;
  reasoningSummary: string;
} {
  if (votes.length === 0) {
    return {
      finalDecision: 'abstain',
      averageConfidence: 0.5,
      reasoningSummary: 'No votes received',
    };
  }

  const approveWeight = votes
    .filter(v => v.decision === 'approve')
    .reduce((sum, v) => sum + (v.weight ?? 1) * v.confidence, 0);

  const totalWeight = votes.reduce((sum, v) => sum + (v.weight ?? 1) * v.confidence, 0);

  const avgConfidence = totalWeight > 0 ? totalWeight / votes.length : 0.5;

  let finalDecision: GovernanceResult['finalDecision'] = 'needs_revision';
  if (totalWeight > 0) {
    const approveRatio = approveWeight / totalWeight;
    if (approveRatio > 0.66) {
      finalDecision = 'approve';
    } else if (approveRatio < 0.33) {
      finalDecision = 'reject';
    }
  } else {
    // All votes had zero confidence — default to needs_revision
    finalDecision = 'needs_revision';
  }

  const reasons = votes.map(v => `${v.server}: ${v.reasoning}`).join(' | ');

  return {
    finalDecision,
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    reasoningSummary: reasons,
  };
}
