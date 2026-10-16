import { DEFAULT_PROMOTION_MIN_CONFIDENCE, } from '../registry/CuratedSignalsManager.js';
import { effectiveSignalConfidence, meetsConfidenceGate } from '../registry/confidence-decay.js';
export const DEFAULT_MIN_CONFIDENCE_GATE = DEFAULT_PROMOTION_MIN_CONFIDENCE;
export const TRAP_CAPABLE_AGENTS = ['architect', 'security-auditor', 'researcher'];
export function resolveSignalConfidence(signalName, signalsManager, metadataConfidence) {
    if (typeof metadataConfidence === 'number') {
        return metadataConfidence;
    }
    const signal = signalsManager.getByName(signalName);
    const decayed = signal ? effectiveSignalConfidence(signal) : null;
    if (decayed) {
        return decayed.effectiveConfidence;
    }
    return null;
}
export function getConfidenceForTask(task, signalsManager) {
    const text = `${task.description} ${task.type}`;
    const textMatches = signalsManager.matchByText(text, 2);
    const trapDetected = /TYPE:\s*ontological-trap/i.test(text) ||
        Boolean(task.metadata?.ontologicalTrapDetected) ||
        textMatches.some((match) => match.signal.tags.includes('ontological-trap'));
    const metadataConfidences = task.metadata?.memorySignalConfidences ?? {};
    const signals = textMatches
        .map((match) => {
        const metadata = metadataConfidences[match.signal.name];
        if (typeof metadata === 'number') {
            return {
                name: match.signal.name,
                confidence: metadata,
                source: 'task-metadata',
                matchedVia: match.matchedOn,
                storedConfidence: metadata,
                decayFactor: 1,
                staleDays: 0,
            };
        }
        const decayed = effectiveSignalConfidence(match.signal);
        if (!decayed)
            return null;
        return {
            name: match.signal.name,
            confidence: decayed.effectiveConfidence,
            source: 'registry',
            matchedVia: match.matchedOn,
            storedConfidence: decayed.storedConfidence,
            decayFactor: decayed.decayFactor,
            staleDays: decayed.staleDays,
        };
    })
        .filter((entry) => entry !== null)
        .filter((entry) => meetsConfidenceGate(entry.confidence, DEFAULT_MIN_CONFIDENCE_GATE));
    const trapSignals = signals.filter((entry) => signalsManager.getByName(entry.name)?.tags.includes('ontological-trap'));
    const highConfidenceTrapPresent = trapDetected &&
        trapSignals.some((entry) => meetsConfidenceGate(entry.confidence, DEFAULT_MIN_CONFIDENCE_GATE));
    signals.sort((a, b) => b.confidence - a.confidence);
    const avgConfidence = signals.length > 0
        ? signals.reduce((sum, entry) => sum + entry.confidence, 0) / signals.length
        : 0;
    const maxConfidence = signals.length > 0 ? Math.max(...signals.map((entry) => entry.confidence)) : 0;
    let complexityBoost = 0;
    if (highConfidenceTrapPresent) {
        complexityBoost += Math.round(10 + maxConfidence * 10);
    }
    const excess = Math.max(0, maxConfidence - DEFAULT_MIN_CONFIDENCE_GATE);
    if (excess > 0) {
        complexityBoost += Math.round(excess * 20);
    }
    const highConfidenceCount = signals.length;
    if (highConfidenceCount >= 2)
        complexityBoost += 5;
    return {
        signals,
        matchedSignals: signals.map((entry) => entry.name),
        avgConfidence,
        maxConfidence,
        highConfidenceTrapPresent,
        ontologicalTrapDetected: trapDetected,
        minConfidenceGate: DEFAULT_MIN_CONFIDENCE_GATE,
        complexityBoost,
        recommendedAgent: highConfidenceTrapPresent ? 'architect' : null,
    };
}
export function confidenceWeightedAgentBoost(agent, context) {
    if (!context.highConfidenceTrapPresent)
        return 0;
    if (!TRAP_CAPABLE_AGENTS.includes(agent)) {
        return 0;
    }
    return Math.round(12 + context.maxConfidence * 10);
}
export function applyConfidenceComplexityBoost(baseComplexity, context) {
    return Math.min(Math.max(Math.round(baseComplexity + context.complexityBoost), 1), 100);
}
//# sourceMappingURL=confidence-gate.js.map