/**
 * Agent Capabilities Configuration
 *
 * Centralized agent capability definitions for orchestration decisions
 */
import { AGENT_REGISTRY } from "../../../agents/registry.js";
const DEFAULT_AGENT_CAPABILITIES = Object.fromEntries(Object.entries(AGENT_REGISTRY).map(([name, entry]) => [
    name,
    {
        capabilities: entry.capabilities,
        complexityThreshold: entry.maxComplexity,
        concurrentTasks: entry.concurrentTasks,
    },
]));
/**
 * Agent Capabilities Manager
 * Manages agent capabilities for orchestration decisions
 */
export class AgentCapabilitiesManager {
    capabilities = new Map();
    constructor() {
        // Initialize with default capabilities
        Object.entries(DEFAULT_AGENT_CAPABILITIES).forEach(([agent, config]) => {
            this.capabilities.set(agent, config);
        });
    }
    /**
     * Get capabilities for a specific agent
     */
    getCapabilities(agentType) {
        return this.capabilities.get(agentType);
    }
    /**
     * Get all registered agent capabilities
     */
    getAllCapabilities() {
        return new Map(this.capabilities);
    }
    /**
     * Register or update agent capabilities
     */
    setCapabilities(agentType, capability) {
        this.capabilities.set(agentType, capability);
    }
    /**
     * Select the best agent for a task based on complexity and capabilities
     */
    selectAgentForTask(requiredCapabilities, complexity) {
        let bestAgent = null;
        let bestScore = -1;
        for (const [agent, caps] of this.capabilities) {
            // Check if agent can handle the complexity
            if (complexity > caps.complexityThreshold) {
                continue;
            }
            // Calculate capability match score
            const matchCount = requiredCapabilities.filter(cap => caps.capabilities.includes(cap)).length;
            // Prefer agents with more concurrent tasks available
            const score = matchCount * 10 + caps.concurrentTasks;
            if (score > bestScore) {
                bestScore = score;
                bestAgent = agent;
            }
        }
        return bestAgent;
    }
    /**
     * Get all available agents for a given complexity level
     */
    getAvailableAgents(complexity) {
        const available = [];
        for (const [agent, caps] of this.capabilities) {
            if (complexity <= caps.complexityThreshold) {
                available.push(agent);
            }
        }
        return available;
    }
}
// Singleton instance
let capabilitiesManagerInstance = null;
export function getAgentCapabilitiesManager() {
    if (!capabilitiesManagerInstance) {
        capabilitiesManagerInstance = new AgentCapabilitiesManager();
    }
    return capabilitiesManagerInstance;
}
//# sourceMappingURL=agent-capabilities.js.map