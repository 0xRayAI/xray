/**
 * Pure governance decision logic.
 * This module contains the PHI/TAU matrix and merging rules.
 * It has no side effects and does not call any MCPs.
 *
 * This is the shared "pure logic" that both the Governance MCP
 * and any HTTP deployment (Vercel) can use.
 */

import type { GovernanceVote, GovernanceResult } from './governance-types.js';

// Blurrn constants (from chrono-warp-drive)
const PHI = 1.666;
const TAU = 0.865;

export interface DecisionMatrixInput {
  resonance: number;
  isotopicRatio: number;
  vortexVolume?: number;
  historicalCoherence?: number;
  solarActivity?: 'quiet' | 'moderate' | 'active' | 'storm';
  moralTension?: 'Aligned' | 'Mild' | 'Significant' | 'Critical';
  moralScore?: number;
  moralFusion?: number;
}

export interface DecisionMatrixOutput {
  recommendation: 'PASS' | 'NEEDS_REVISION' | 'REJECT';
  confidence: number;
  voteWeight: number;
  reasons: string[];
  moralOverride?: 'rejected_critical' | 'downgraded_significant' | 'none';
}

export const MORAL_OVERRIDE_LEVELS = {
  Critical: 'rejected_critical' as const,
  Significant: 'downgraded_significant' as const,
  Mild: 'none' as const,
  Aligned: 'none' as const,
};

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

export type MoralOverrideThreshold = 'Critical' | 'Significant' | 'Mild' | 'Aligned' | 'disabled';

/**
 * The core PHI/TAU decision matrix.
 * Extracted so it can be shared between local MCP and deployed HTTP versions.
 */
export function applyDecisionMatrix(input: DecisionMatrixInput): DecisionMatrixOutput {
  const {
    resonance,
    isotopicRatio,
    vortexVolume = Number.MAX_VALUE, // large default so the low-mass check only triggers on explicit small values
    historicalCoherence = 0.8,
    solarActivity = 'quiet',
    moralTension,
    moralScore,
    moralFusion,
  } = input;

  const reasons: string[] = [];
  let recommendation: DecisionMatrixOutput['recommendation'] = 'NEEDS_REVISION';
  let confidence = 0.75;
  let voteWeight = 1.0;
  let moralOverride: DecisionMatrixOutput['moralOverride'] = 'none';

  // Log moral fusion if present — weighted signal for transparency
  if (moralFusion != null) {
    reasons.push(`Moral-numerological fusion: ${(moralFusion * 100).toFixed(0)}%`);
  }

  // Trinitarium Moral Overlay override
  // Critical tension always rejects — proposal violates moral alignment regardless of physics
  if (moralTension === 'Critical') {
    recommendation = 'REJECT';
    confidence = 0.92;
    voteWeight = 1.6;
    moralOverride = 'rejected_critical';
    reasons.push(`Critical moral tension — proposal violates moral alignment (score: ${moralScore != null ? (moralScore * 100).toFixed(0) + '%' : 'unknown'})`);
    return {
      recommendation,
      confidence: Math.min(0.99, Math.max(0.5, confidence)),
      voteWeight: Math.max(0.5, Math.min(1.8, voteWeight)),
      reasons,
      moralOverride,
    };
  }

  // Significant tension downgrades PASS → NEEDS_REVISION
  let moralDowngrade = false;
  if (moralTension === 'Significant') {
    moralDowngrade = true;
    moralOverride = 'downgraded_significant';
    voteWeight *= 0.85;
    reasons.push(`Significant moral tension — proceed with caution (score: ${moralScore != null ? (moralScore * 100).toFixed(0) + '%' : 'unknown'})`);
  }

  // Aligned tension boosts confidence slightly
  if (moralTension === 'Aligned' && moralScore != null) {
    confidence += 0.03;
    voteWeight *= 1.05;
    reasons.push(`Moral alignment confirmed (score: ${(moralScore * 100).toFixed(0)}%)`);
  }

  if (resonance >= 0.92 && isotopicRatio >= 0.95) {
    recommendation = 'PASS';
    confidence = 0.97;
    voteWeight = 1.4;
    reasons.push('High symbiotic resonance (PHI-aligned)');
  } else if (resonance >= 0.82 && isotopicRatio >= 0.88) {
    recommendation = 'PASS';
    confidence = 0.89;
    voteWeight = 1.15;
    reasons.push('Solid alignment above TAU threshold');
  } else if (resonance < 0.75 || isotopicRatio < 0.80) {
    recommendation = 'REJECT';
    confidence = 0.84;
    reasons.push('Signal below critical threshold (1 - TAU)');
  } else {
    reasons.push('Moderate resonance - requires refinement');
  }

  // Moral downgrade: Significant tension demotes PASS → NEEDS_REVISION
  if (moralDowngrade && recommendation === 'PASS') {
    recommendation = 'NEEDS_REVISION';
    reasons.push('Moral tension downgraded recommendation from PASS to NEEDS_REVISION');
  }

  if (vortexVolume < 2.5e25) {
    reasons.push('Low inertial mass (W x M = V)');
    if (recommendation === 'PASS') recommendation = 'NEEDS_REVISION';
  }

  if (historicalCoherence < 0.70) {
    reasons.push('Weak historical alignment with past decisions');
    if (recommendation === 'PASS') recommendation = 'NEEDS_REVISION';
  } else if (historicalCoherence > 0.90) {
    reasons.push('Strong continuity with previous governance');
    voteWeight *= 1.1;
  }

  // Solar adjustment (from chrono-warp-drive)
  if (solarActivity === 'active' || solarActivity === 'storm') {
    voteWeight *= 0.92;
    reasons.push('Elevated solar activity - increased caution applied');
  }

  return {
    recommendation,
    confidence: Math.min(0.99, Math.max(0.5, confidence)),
    voteWeight: Math.max(0.5, Math.min(1.8, voteWeight)),
    reasons,
    moralOverride,
  };
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
