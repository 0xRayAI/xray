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