/**
 * PHI/TAU decision matrix port from xray governance-core (simplified for lesson intake).
 */

const PHI = 1.666;
const TAU = 0.865;

/**
 * @param {object} input
 * @param {number} input.resonance
 * @param {number} [input.isotopicRatio]
 * @param {number} [input.vortexVolume]
 * @param {number} [input.historicalCoherence]
 * @param {"quiet"|"moderate"|"active"|"storm"} [input.solarActivity]
 * @param {"Aligned"|"Mild"|"Significant"|"Critical"} [input.moralTension]
 */
export function applyDecisionMatrix(input) {
  const {
    resonance,
    isotopicRatio,
    vortexVolume = Number.MAX_VALUE,
    historicalCoherence = 0.8,
    solarActivity = "quiet",
    moralTension,
    moralScore,
  } = input;

  const reasons = [];
  let recommendation = "NEEDS_REVISION";
  let confidence = 0.75;
  let voteWeight = 1.0;

  if (moralTension === "Critical") {
    return {
      recommendation: "REJECT",
      confidence: 0.92,
      voteWeight: 1.6,
      reasons: [
        `Critical moral tension (score: ${moralScore != null ? `${(moralScore * 100).toFixed(0)}%` : "unknown"})`,
      ],
      moralOverride: "rejected_critical",
      constants: { phi: PHI, tau: TAU },
    };
  }

  let moralDowngrade = false;
  if (moralTension === "Significant") {
    moralDowngrade = true;
    voteWeight *= 0.85;
    reasons.push("Significant moral tension — proceed with caution");
  }

  const ratio =
    typeof isotopicRatio === "number" && Number.isFinite(isotopicRatio)
      ? isotopicRatio
      : undefined;
  const highBand = resonance >= 0.92 && (ratio === undefined || ratio >= 0.95);
  const solidBand = resonance >= 0.82 && (ratio === undefined || ratio >= 0.88);
  const belowCutoff = resonance < 0.75 || (ratio !== undefined && ratio < 0.8);

  if (highBand) {
    recommendation = "PASS";
    confidence = 0.97;
    voteWeight = 1.4;
    reasons.push("High symbiotic resonance");
  } else if (solidBand) {
    recommendation = "PASS";
    confidence = 0.89;
    voteWeight = 1.15;
    reasons.push("Solid alignment above resonance cutoff");
  } else if (belowCutoff) {
    recommendation = "REJECT";
    confidence = 0.84;
    reasons.push("Signal below critical resonance or isotopic cutoff");
  } else {
    reasons.push("Moderate resonance — requires refinement");
  }

  if (moralDowngrade && recommendation === "PASS") {
    recommendation = "NEEDS_REVISION";
    reasons.push("Moral tension downgraded PASS to NEEDS_REVISION");
  }

  if (vortexVolume < 2.5e25) {
    reasons.push("Low inertial mass (W x M = V)");
    if (recommendation === "PASS") recommendation = "NEEDS_REVISION";
  }

  if (historicalCoherence < 0.7) {
    reasons.push("Weak historical alignment");
    if (recommendation === "PASS") recommendation = "NEEDS_REVISION";
  } else if (historicalCoherence > 0.9) {
    reasons.push("Strong continuity with previous governance");
    voteWeight *= 1.1;
  }

  if (solarActivity === "active" || solarActivity === "storm") {
    voteWeight *= 0.92;
    reasons.push("Elevated solar activity — increased caution");
  }

  return {
    recommendation,
    confidence: Math.min(0.99, Math.max(0.5, confidence)),
    voteWeight: Math.max(0.5, Math.min(1.8, voteWeight)),
    reasons,
    moralOverride: moralDowngrade ? "downgraded_significant" : "none",
    constants: { phi: PHI, tau: TAU },
  };
}

/**
 * @param {import("./types.js").GovernanceVote[]} votes
 */
export function mergeVotes(votes) {
  if (!votes.length) {
    return {
      finalDecision: "abstain",
      averageConfidence: 0.5,
      reasoningSummary: "No votes received",
    };
  }

  const weightOf = (vote) => vote.weight ?? 1;
  const approveWeight = votes
    .filter((v) => v.decision === "approve")
    .reduce((sum, v) => sum + weightOf(v) * v.confidence, 0);
  const weightedConfidenceSum = votes.reduce(
    (sum, v) => sum + weightOf(v) * v.confidence,
    0,
  );
  const weightSum = votes.reduce((sum, v) => sum + weightOf(v), 0);
  const avgConfidence =
    weightSum > 0
      ? Math.min(1, Math.max(0, weightedConfidenceSum / weightSum))
      : 0.5;

  let finalDecision = "needs_revision";
  if (weightedConfidenceSum > 0) {
    const approveRatio = approveWeight / weightedConfidenceSum;
    if (approveRatio > 0.66) finalDecision = "approve";
    else if (approveRatio < 0.33) finalDecision = "reject";
  }

  const reasoningSummary = votes.map((v) => `${v.server}:${v.decision}`).join("; ");
  return { finalDecision, averageConfidence: avgConfidence, reasoningSummary };
}
