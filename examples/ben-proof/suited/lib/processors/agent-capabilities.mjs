/**
 * Agent Capabilities — ported from xray src/mcps/orchestrator/config/agent-capabilities.ts
 */
import { getProvider, toMemoryCapabilityMap, fromMemoryCapabilityMap } from './memory-routing-bridge.mjs';

const ROUTE_AGENT_ALIASES = {
  'code-review': 'code-reviewer',
  'security-audit': 'security-auditor',
  'bug-triage': 'bug-triage-specialist',
  'architect-tools': 'architect',
};

const DEFAULT_AGENT_CAPABILITIES = {
  orchestrator: { capabilities: ['orchestrate', 'implement'], complexityThreshold: 100, concurrentTasks: 8 },
  researcher: { capabilities: ['research', 'implement'], complexityThreshold: 50, concurrentTasks: 4 },
  enforcer: { capabilities: ['compliance', 'implement'], complexityThreshold: 100, concurrentTasks: 6 },
  'code-reviewer': { capabilities: ['review', 'implement'], complexityThreshold: 40, concurrentTasks: 3 },
  architect: { capabilities: ['design', 'implement'], complexityThreshold: 80, concurrentTasks: 2 },
};

function resolveRoutedAgent(routed, capabilities) {
  const candidate = ROUTE_AGENT_ALIASES[routed] ?? routed;
  if (capabilities.has(candidate)) return candidate;
  if (capabilities.has(routed)) return routed;
  return null;
}

export class AgentCapabilitiesManager {
  constructor() {
    this.capabilities = new Map();
    this.enriched = false;
    Object.entries(DEFAULT_AGENT_CAPABILITIES).forEach(([agent, config]) => {
      this.capabilities.set(agent, config);
    });
    this.applyMemoryRoutingEnrichment();
  }

  applyMemoryRoutingEnrichment() {
    const provider = getProvider();
    if (provider.id === 'null') return;
    if (typeof provider.enhanceAgentCapabilities !== 'function') return;
    this.capabilities = provider.enhanceAgentCapabilities(this.capabilities);
    this.enriched = true;
  }

  getCapabilities(agentType) {
    return this.capabilities.get(agentType);
  }

  getAllCapabilities() {
    if (!this.enriched) this.applyMemoryRoutingEnrichment();
    return new Map(this.capabilities);
  }

  setCapabilities(agentType, capability) {
    this.capabilities.set(agentType, capability);
  }

  selectAgentForTask(requiredCapabilities, complexity, operationDescription = '', taskType = '') {
    const provider = getProvider();
    if (provider.id !== 'null' && operationDescription && typeof provider.selectAgent === 'function') {
      return provider.selectAgent(this.getAllCapabilities(), requiredCapabilities, complexity, operationDescription);
    }

    let bestAgent = null;
    let bestScore = -1;
    for (const [agent, caps] of this.capabilities) {
      if (complexity > caps.complexityThreshold) continue;
      const matchCount = requiredCapabilities.filter((cap) => caps.capabilities.includes(cap)).length;
      const score = matchCount * 10 + caps.concurrentTasks;
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    return bestAgent;
  }

  getAvailableAgents(complexity) {
    const available = [];
    for (const [agent, caps] of this.capabilities) {
      if (complexity <= caps.complexityThreshold) available.push(agent);
    }
    return available;
  }
}

let capabilitiesManagerInstance = null;

export function getAgentCapabilitiesManager() {
  if (!capabilitiesManagerInstance) {
    capabilitiesManagerInstance = new AgentCapabilitiesManager();
  }
  return capabilitiesManagerInstance;
}

export function resetAgentCapabilitiesManager() {
  capabilitiesManagerInstance = null;
}
