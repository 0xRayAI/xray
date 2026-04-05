/**
 * Agent Capabilities Configuration
 *
 * Centralized agent capability definitions for orchestration decisions
 */
import type { AgentCapability } from '../types.js';
/**
 * Agent Capabilities Manager
 * Manages agent capabilities for orchestration decisions
 */
export declare class AgentCapabilitiesManager {
    private capabilities;
    constructor();
    /**
     * Get capabilities for a specific agent
     */
    getCapabilities(agentType: string): AgentCapability | undefined;
    /**
     * Get all registered agent capabilities
     */
    getAllCapabilities(): Map<string, AgentCapability>;
    /**
     * Register or update agent capabilities
     */
    setCapabilities(agentType: string, capability: AgentCapability): void;
    /**
     * Select the best agent for a task based on complexity and capabilities
     */
    selectAgentForTask(requiredCapabilities: string[], complexity: number): string | null;
    /**
     * Get all available agents for a given complexity level
     */
    getAvailableAgents(complexity: number): string[];
}
export declare function getAgentCapabilitiesManager(): AgentCapabilitiesManager;
//# sourceMappingURL=agent-capabilities.d.ts.map