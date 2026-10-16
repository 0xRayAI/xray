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
  /** Present only when a real moralFusion number was supplied. Absent is not 0.5. */
  isotopicRatio?: number;
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

  // Cutoffs stay the literals the tests lock (0.92/0.95, 0.82/0.88, 0.75/0.80).
  // PHI and TAU are not those cutoffs, so reasons do not claim them.
  const ratio = typeof isotopicRatio === 'number' && Number.isFinite(isotopicRatio) ? isotopicRatio : undefined;
  const highBand = resonance >= 0.92 && (ratio === undefined || ratio >= 0.95);
  const solidBand = resonance >= 0.82 && (ratio === undefined || ratio >= 0.88);
  const belowCutoff = resonance < 0.75 || (ratio !== undefined && ratio < 0.80);

  if (highBand) {
    recommendation = 'PASS';
    confidence = 0.97;
    voteWeight = 1.4;
    reasons.push('High symbiotic resonance');
  } else if (solidBand) {
    recommendation = 'PASS';
    confidence = 0.89;
    voteWeight = 1.15;
    reasons.push('Solid alignment above the resonance cutoff');
  } else if (belowCutoff) {
    recommendation = 'REJECT';
    confidence = 0.84;
    reasons.push('Signal below the critical resonance or isotopic cutoff');
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

  const weightOf = (vote: GovernanceVote): number => vote.weight ?? 1;

  const approveWeight = votes
    .filter(v => v.decision === 'approve')
    .reduce((sum, v) => sum + weightOf(v) * v.confidence, 0);

  const weightedConfidenceSum = votes.reduce((sum, v) => sum + weightOf(v) * v.confidence, 0);
  const weightSum = votes.reduce((sum, v) => sum + weightOf(v), 0);

  const rawMean = weightSum > 0 ? weightedConfidenceSum / weightSum : 0.5;
  const avgConfidence = Math.min(1, Math.max(0, rawMean));

  let finalDecision: GovernanceResult['finalDecision'] = 'needs_revision';
  if (weightedConfidenceSum > 0) {
    const approveRatio = approveWeight / weightedConfidenceSum;
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

export interface MetamorphosisInput {
  averageConfidence: number;
  proposalType: 'fix' | 'automate' | 'codify' | 'compliance';
  historicalCoherence?: number;
  resonanceScore?: number;
}

export function calculateMetamorphosisScore(input: MetamorphosisInput): number {
  let score = input.averageConfidence;

  if (input.proposalType === 'automate' || input.proposalType === 'codify') {
    score += 0.10;
  } else if (input.proposalType === 'compliance') {
    score -= 0.15;
  }

  if (input.historicalCoherence != null && input.historicalCoherence >= 0.8) {
    score += 0.05;
  }

  if (input.resonanceScore != null && input.resonanceScore >= 0.8) {
    score += 0.05;
  }

  return Math.round(Math.min(1.0, Math.max(0.0, score)) * 100) / 100;
}
