import { TAG_AGENT_AFFINITY } from './signal-agent-affinity.js';
export class CapabilityEnhancer {
    signalsManager;
    constructor(signalsManager) {
        this.signalsManager = signalsManager;
    }
    /**
     * Seeds repertoireSignals and repertoireTags onto each agent capability map entry.
     */
    enhance(baseCapabilities) {
        const highPriority = this.signalsManager.getHighPrioritySignals();
        const signalNames = highPriority.map((s) => s.name);
        const allTags = [...new Set(highPriority.flatMap((s) => s.tags))];
        const enriched = new Map();
        for (const [agent, caps] of baseCapabilities) {
            const tagAffinities = Object.entries(TAG_AGENT_AFFINITY)
                .filter(([, agents]) => agents.includes(agent))
                .map(([tag]) => tag);
            const agentSignals = highPriority
                .filter((s) => s.tags.some((t) => tagAffinities.includes(t)))
                .map((s) => s.name);
            enriched.set(agent, {
                ...caps,
                capabilities: [...new Set([...caps.capabilities, ...signalNames, ...agentSignals])],
                repertoireSignals: [...new Set([...(caps.repertoireSignals ?? []), ...agentSignals])],
                repertoireTags: [...new Set([...(caps.repertoireTags ?? []), ...tagAffinities, ...allTags])],
            });
        }
        return enriched;
    }
}
//# sourceMappingURL=capability-enhancer.js.map