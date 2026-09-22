import type { CuratedSignal } from '../types.js';
/** Days of full-strength excess before exponential fade starts. */
export declare const DEFAULT_DECAY_GRACE_DAYS = 14;
/** Half-life of conviction *above* the 0.55 gate after the grace window. */
export declare const DEFAULT_DECAY_HALF_LIFE_DAYS = 60;
/**
 * Established factory / field corpora are not demoted by calendar age.
 * Project-local signals below this count can lose `validated` when raw decay
 * drops them under the gate.
 */
export declare const DEFAULT_DEMOTION_MIN_OBSERVATIONS = 100;
export interface DecayOptions {
    graceDays?: number;
    halfLifeDays?: number;
    minGate?: number;
    now?: Date;
}
export interface EffectiveConfidence {
    storedConfidence: number;
    effectiveConfidence: number;
    decayFactor: number;
    staleDays: number;
}
/**
 * Excess-above-gate fade: `gate + (avg - gate) * 2^(-(age-grace)/halfLife)`.
 *
 * Factory seed sits on the 0.55 floor — decay must not kill those primitives.
 * Fresh field conviction still outranks stale high scores when ranking.
 */
export declare function decayFactorForAge(staleDays: number, options?: DecayOptions): number;
/** Float-safe gate. Averaging 0.55 can store 0.5499999999999999. */
export declare function meetsConfidenceGate(confidence: number, gate?: number): boolean;
export declare function effectiveObservationConfidence(storedConfidence: number, lastSeen: string | undefined, options?: DecayOptions): EffectiveConfidence;
export declare function effectiveSignalConfidence(signal: CuratedSignal, options?: DecayOptions): EffectiveConfidence | null;
/** Raw (unfloored) decay — used only for demotion, never for routing. */
export declare function rawDecayedConfidence(storedConfidence: number, lastSeen: string | undefined, options?: DecayOptions): number;
export declare function shouldDemoteValidatedSignal(signal: CuratedSignal, options?: DecayOptions & {
    minObservations?: number;
}): boolean;
//# sourceMappingURL=confidence-decay.d.ts.map