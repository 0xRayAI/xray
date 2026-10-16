import type { AgentCapability } from '../types.js';
import { CuratedSignalsManager } from '../registry/CuratedSignalsManager.js';
export declare class CapabilityEnhancer {
    private readonly signalsManager;
    constructor(signalsManager: CuratedSignalsManager);
    /**
     * Seeds repertoireSignals and repertoireTags onto each agent capability map entry.
     */
    enhance(baseCapabilities: Map<string, AgentCapability>): Map<string, AgentCapability>;
}
//# sourceMappingURL=capability-enhancer.d.ts.map