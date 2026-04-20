/**
 * Agent Registry
 *
 * ARCHITECTURE NOTE (2026-04-17):
 * After discovering that orchestration/enforcement happen at plugin level
 * (not via agents), we differentiate between:
 * - AGENTS: True coordinators that need spawning (architect, strategist)
 * - SKILLS: MCP-based capabilities invoked via skill tools (most others)
 *
 * The agent-delegator handles orchestration based on complexity analysis.
 * Enforcement happens via preValidate processor and MCP servers.
 * Agents are mainly prompts with skills - they don't route or orchestrate.
 */
export interface AgentRegistryEntry {
    name: string;
    description: string;
    capabilities: string[];
    capacity: number;
    specialties: string[];
    mode: "primary" | "subagent";
    maxComplexity: number;
    concurrentTasks: number;
    status: "active" | "inactive";
    performance: number;
    expertise: string;
}
export declare const AGENT_REGISTRY: Record<string, AgentRegistryEntry>;
export declare function getActiveAgents(): string[];
export declare function getAgentEntry(name: string): AgentRegistryEntry | undefined;
export declare function isAllowedAgent(name: string): boolean;
export declare function getAgentCapabilities(name: string): string[];
export declare function validateRegistryConsistency(): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=registry.d.ts.map