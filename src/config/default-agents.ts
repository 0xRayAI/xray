import { AGENT_REGISTRY } from "../agents/registry.js";

export interface DefaultAgentConfig {
  name: string;
  capabilities: string[];
  status: "active" | "inactive";
  expertise: string;
  capacity: number;
  performance: number;
  specialties: string[];
}

export const DEFAULT_AGENTS: DefaultAgentConfig[] = Object.values(AGENT_REGISTRY).map((entry) => ({
  name: entry.name,
  capabilities: entry.capabilities,
  status: entry.status,
  expertise: entry.expertise,
  capacity: entry.capacity,
  performance: entry.performance,
  specialties: entry.specialties,
}));

export function getDefaultAgents(): DefaultAgentConfig[] {
  return DEFAULT_AGENTS;
}

export function getDefaultAgentByName(name: string): DefaultAgentConfig | undefined {
  return DEFAULT_AGENTS.find(agent => agent.name === name);
}
