import type { InferenceEntry, InferenceType, PrimitiveMatch } from '../types.js';
export declare class EnrichedGrooverLogError extends Error {
    constructor(message: string);
}
export interface ParsedGrooverFields {
    matchedPrimitives: string[];
    matchConfidence: Record<string, number>;
    primitiveMatches: PrimitiveMatch[];
    governanceForced: boolean;
    inferenceType?: InferenceType;
}
export declare function extractInferenceType(inference: string): InferenceType | undefined;
export declare function parseMatchConfidence(raw: unknown): Record<string, number>;
export declare function isEnrichedGrooverLog(raw: Record<string, unknown>): boolean;
export declare function toPrimitiveMatches(matchedPrimitives: string[], matchConfidence: Record<string, number>): PrimitiveMatch[];
export declare function parseGrooverLogFields(raw: Record<string, unknown>): ParsedGrooverFields;
export declare function buildInferenceEntryFromGrooverLog(raw: Record<string, unknown>): InferenceEntry;
//# sourceMappingURL=groover-log-parser.d.ts.map