import { MIN_CONFIDENCE_GATE, TRAP_CAPABLE_AGENTS } from './constants.mjs';
import { effectiveConfidence, meetsConfidenceGate } from './decay.mjs';

export function confidenceForTask(taskText, laws, now = new Date()) {
  const lowered = taskText.toLowerCase();
  const trapDetected = /ontological-trap/.test(lowered);
  const signals = [];

  for (const law of laws) {
    const nameHit = lowered.includes(law.name.replaceAll('-', ' ')) || lowered.includes(law.name);
    const tagHit = law.tags.some((tag) => lowered.includes(tag.replaceAll('-', ' ')));
    if (!nameHit && !tagHit) continue;
    const decayed = effectiveConfidence(law.storedConfidence, law.lastSeen, now);
    if (!meetsConfidenceGate(decayed.effectiveConfidence)) continue;
    signals.push({
      name: law.name,
      confidence: decayed.effectiveConfidence,
      storedConfidence: decayed.storedConfidence,
      decayFactor: decayed.decayFactor,
      staleDays: decayed.staleDays,
      trap: law.tags.includes('ontological-trap'),
    });
  }

  signals.sort((a, b) => b.confidence - a.confidence);
  const avgConfidence = signals.length
    ? signals.reduce((sum, entry) => sum + entry.confidence, 0) / signals.length
    : 0;
  const maxConfidence = signals.length ? signals[0].confidence : 0;
  const highConfidenceTrapPresent = trapDetected && signals.some((entry) => entry.trap);

  let complexityBoost = 0;
  if (highConfidenceTrapPresent) complexityBoost += Math.round(10 + maxConfidence * 10);
  const excess = Math.max(0, maxConfidence - MIN_CONFIDENCE_GATE);
  if (excess > 0) complexityBoost += Math.round(excess * 20);

  return {
    matchedSignals: signals.map((entry) => entry.name),
    avgConfidence,
    maxConfidence,
    highConfidenceTrapPresent,
    ontologicalTrapDetected: trapDetected,
    complexityBoost,
    recommendedAgent: highConfidenceTrapPresent ? TRAP_CAPABLE_AGENTS[0] : null,
    signals,
  };
}
