import type { CuratedSignal, DynamoResult, InferenceEntry } from '../types.js';
import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
export interface GovernWithSolarParams {
    title: string;
    content: string;
    agentDid: string;
    matchedPrimitives: string[];
    inferenceType?: string;
}
export interface GovernWithSolarFn {
    (params: GovernWithSolarParams): Promise<DynamoResult | null>;
}
export interface OntologicalTrapEnforcerOptions {
    signalsManager?: CuratedSignalsManager;
    governFn: GovernWithSolarFn;
    agentDid?: string;
    minResonanceThreshold?: number;
}
export declare class OntologicalTrapEnforcer {
    private readonly signalsManager;
    private readonly governFn;
    private readonly agentDid;
    private readonly minResonance;
    constructor(options: OntologicalTrapEnforcerOptions);
    isOntologicalTrap(inference: string): boolean;
    matchPrimitives(inference: string): CuratedSignal[];
    /**
     * Always calls govern_with_solar for ontological-trap entries.
     * Returns full result even when governance fetch fails (null → logged as N/A).
     */
    enforce(entry: InferenceEntry, replyContent: string): Promise<{
        allowed: boolean;
        dynamoResult: DynamoResult | null;
        matchedPrimitives: string[];
        forced: boolean;
    }>;
    enrichLogEntry(entry: InferenceEntry, dynamoResult: DynamoResult | null, matchedPrimitives: string[]): InferenceEntry;
}
//# sourceMappingURL=ontological-trap-enforcer.d.ts.map