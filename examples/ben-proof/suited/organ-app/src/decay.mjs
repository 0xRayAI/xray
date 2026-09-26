import { DECAY_GRACE_DAYS, DECAY_HALF_LIFE_DAYS, MIN_CONFIDENCE_GATE } from './constants.mjs';

export function meetsConfidenceGate(confidence, gate = MIN_CONFIDENCE_GATE) {
  return confidence + 1e-9 >= gate;
}

export function decayFactorForAge(staleDays, grace = DECAY_GRACE_DAYS, halfLife = DECAY_HALF_LIFE_DAYS) {
  if (halfLife <= 0) return 1;
  const aged = Math.max(0, staleDays - grace);
  if (aged === 0) return 1;
  return 2 ** (-aged / halfLife);
}

export function daysSince(iso, now = new Date()) {
  if (!iso) return 0;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, (now.getTime() - then.getTime()) / 86400000);
}

/**
 * Excess-above-gate fade. A stored score on the floor is not demoted by age.
 */
export function effectiveConfidence(stored, lastSeen, now = new Date()) {
  const staleDays = daysSince(lastSeen, now);
  const factor = decayFactorForAge(staleDays);
  if (stored <= MIN_CONFIDENCE_GATE) {
    return {
      storedConfidence: stored,
      effectiveConfidence: meetsConfidenceGate(stored) ? MIN_CONFIDENCE_GATE : stored,
      decayFactor: factor,
      staleDays,
    };
  }
  const excess = stored - MIN_CONFIDENCE_GATE;
  return {
    storedConfidence: stored,
    effectiveConfidence: MIN_CONFIDENCE_GATE + excess * factor,
    decayFactor: factor,
    staleDays,
  };
}
