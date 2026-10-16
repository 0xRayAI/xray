/**
 * Metamorphosis scoring port from xray governance-core.ts
 */

/**
 * @param {object} input
 * @param {number} input.averageConfidence
 * @param {"fix"|"automate"|"codify"|"compliance"} input.proposalType
 * @param {number} [input.historicalCoherence]
 * @param {number} [input.resonanceScore]
 */
export function calculateMetamorphosisScore(input) {
  let score = input.averageConfidence;

  if (input.proposalType === "automate" || input.proposalType === "codify") {
    score += 0.1;
  } else if (input.proposalType === "compliance") {
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
