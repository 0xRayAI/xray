/**
 * Agent Capabilities Configuration
 *
 * Centralized agent capability definitions for orchestration decisions.
 * Enriched at runtime by the active MemoryRoutingProvider (Repertoire, etc.).
 */

import type { AgentCapability } from '../types.js';
import { AGENT_REGISTRY } from "../../../agents/registry.js";
import { initializeMemoryRouting } from '../../../memory-routing/index.js';
import {
  getProvider,
  toMemoryCapabilityMap,
  fromMemoryCapabilityMap,
} from './memory-routing-bridge.js';

const DEFAULT_AGENT_CAPABILITIES: Record<string, AgentCapability> = Object.fromEntries(
  Object.entries(AGENT_REGISTRY).map(([name, entry]) => [
    name,
    {
      capabilities: entry.capabilities,
      complexityThreshold: entry.maxComplexity,
      concurrentTasks: entry.concurrentTasks,
    },
  ]),
);

initializeMemoryRouting();

/**
 * Agent Capabilities Manager
 * Manages agent capabilities for orchestration decisions
 */
export class AgentCapabilitiesManager {
  private capabilities: Map<string, AgentCapability> = new Map();
  private enriched = false;

  constructor() {
    Object.entries(DEFAULT_AGENT_CAPABILITIES).forEach(([agent, config]) => {
      this.capabilities.set(agent, config);
    });
    this.applyMemoryRoutingEnrichment();
  }

  private applyMemoryRoutingEnrichment(): void {
    const provider = getProvider();
    if (provider.id === 'null') return;

    const memoryCaps = toMemoryCapabilityMap(this.capabilities);
    const enriched = provider.enhanceAgentCapabilities(memoryCaps);
    this.capabilities = fromMemoryCapabilityMap(enriched);
    this.enriched = true;
  }

  /**
   * Get capabilities for a specific agent
   */
  getCapabilities(agentType: string): AgentCapability | undefined {
    return this.capabilities.get(agentType);
  }

  /**
   * Get all registered agent capabilities
   */
  getAllCapabilities(): Map<string, AgentCapability> {
    if (!this.enriched) this.applyMemoryRoutingEnrichment();
    return new Map(this.capabilities);
  }

  /**
   * Register or update agent capabilities
   */
  setCapabilities(agentType: string, capability: AgentCapability): void {
    this.capabilities.set(agentType, capability);
  }

  /**
   * Select the best agent for a task based on complexity, capabilities, and memory routing.
   */
  selectAgentForTask(
    requiredCapabilities: string[],
    complexity: number,
    operationDescription = '',
  ): string | null {
    const provider = getProvider();

    if (provider.id !== 'null' && operationDescription) {
      const memoryCaps = toMemoryCapabilityMap(this.getAllCapabilities());
      return provider.selectAgent(
        memoryCaps,
        requiredCapabilities,
        complexity,
        operationDescription,
      );
    }

    let bestAgent: string | null = null;
    let bestScore = -1;

    for (const [agent, caps] of this.capabilities) {
      if (complexity > caps.complexityThreshold) continue;

      const matchCount = requiredCapabilities.filter((cap) =>
        caps.capabilities.includes(cap),
      ).length;

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
  getAvailableAgents(complexity: number): string[] {
    const available: string[] = [];
    for (const [agent, caps] of this.capabilities) {
      if (complexity <= caps.complexityThreshold) {
        available.push(agent);
      }
    }
    return available;
  }
}

let capabilitiesManagerInstance: AgentCapabilitiesManager | null = null;

export function getAgentCapabilitiesManager(): AgentCapabilitiesManager {
  if (!capabilitiesManagerInstance) {
    capabilitiesManagerInstance = new AgentCapabilitiesManager();
  }
  return capabilitiesManagerInstance;
}

export function resetAgentCapabilitiesManager(): void {
  capabilitiesManagerInstance = null;
}