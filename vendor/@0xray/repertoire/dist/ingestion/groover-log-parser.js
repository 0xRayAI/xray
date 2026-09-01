const VALID_INFERENCE_TYPES = [
    'theoretical',
    'temporal-drift',
    'practical-workflow',
    'ontological-trap',
    'provenance-failure',
];
export class EnrichedGrooverLogError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EnrichedGrooverLogError';
    }
}
export function extractInferenceType(inference) {
    const explicit = inference.match(/TYPE:\s*(\S+)/i)?.[1]?.toLowerCase();
    if (explicit && VALID_INFERENCE_TYPES.includes(explicit)) {
        return explicit;
    }
    return undefined;
}
export function parseMatchConfidence(raw) {
    if (!raw || typeof raw !== 'object')
        return {};
    const confidence = {};
    for (const [name, value] of Object.entries(raw)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            confidence[name] = Math.max(0, Math.min(1, value));
        }
    }
    return confidence;
}
export function isEnrichedGrooverLog(raw) {
    if (!Array.isArray(raw.matched_primitives) || raw.matched_primitives.length === 0) {
        return false;
    }
    const matchConfidence = parseMatchConfidence(raw.match_confidence);
    return raw.matched_primitives.every((name) => typeof name === 'string' && typeof matchConfidence[name] === 'number');
}
export function toPrimitiveMatches(matchedPrimitives, matchConfidence) {
    return matchedPrimitives.map((name) => {
        const confidence = matchConfidence[name];
        if (typeof confidence !== 'number') {
            throw new EnrichedGrooverLogError(`Missing match_confidence for primitive: ${name}`);
        }
        return { name, confidence };
    });
}
export function parseGrooverLogFields(raw) {
    if (!isEnrichedGrooverLog(raw)) {
        throw new EnrichedGrooverLogError('Groover log entry must include matched_primitives and match_confidence for every primitive');
    }
    const inference = String(raw.inference ?? '');
    const matchConfidence = parseMatchConfidence(raw.match_confidence);
    const matchedPrimitives = raw.matched_primitives.filter((value) => typeof value === 'string');
    const primitiveMatches = toPrimitiveMatches(matchedPrimitives, matchConfidence);
    const inferenceType = typeof raw.inference_type === 'string' &&
        VALID_INFERENCE_TYPES.includes(raw.inference_type)
        ? raw.inference_type
        : extractInferenceType(inference);
    const governanceForced = typeof raw.governance_forced === 'boolean'
        ? raw.governance_forced
        : inferenceType === 'ontological-trap';
    return {
        matchedPrimitives,
        matchConfidence,
        primitiveMatches,
        governanceForced,
        inferenceType,
    };
}
export function buildInferenceEntryFromGrooverLog(raw) {
    const parsed = parseGrooverLogFields(raw);
    const matchedPrimitives = parsed.primitiveMatches.map((match) => match.name);
    const matchConfidence = Object.fromEntries(parsed.primitiveMatches.map((match) => [match.name, match.confidence]));
    return {
        timestamp: String(raw.timestamp ?? new Date().toISOString()),
        source: 'groover',
        post_id: raw.post_id,
        post_title: (raw.post_title ?? raw.postTitle),
        comment_id: raw.comment_id,
        inference: String(raw.inference ?? ''),
        public_reply: (raw.public_reply ?? raw.publicReply),
        inference_type: parsed.inferenceType,
        matched_primitives: matchedPrimitives,
        match_confidence: matchConfidence,
        governance_forced: parsed.governanceForced,
        dynamo_result: raw.dynamo_result,
        repertoire_signals: matchedPrimitives,
        counterparty_agent: typeof raw.counterparty_agent === 'string' ? raw.counterparty_agent : undefined,
        counterparty_url: typeof raw.counterparty_url === 'string' ? raw.counterparty_url : undefined,
        dialog_kind: typeof raw.dialog_kind === 'string' ? raw.dialog_kind : undefined,
    };
}
//# sourceMappingURL=groover-log-parser.js.map