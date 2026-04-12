/**
 * Agent Resolver
 *
 * Resolves agent configurations from the 0xRay registry.
 * Used by the integration layer to programmatically access agent configs.
 *
 * @version 1.1.0
 * @since 2026-02-14
 */
interface AgentConfig {
    name: string;
    description?: string;
    capabilities?: string[];
    system?: string;
    tools?: {
        include?: string[];
        exclude?: string[];
    };
    model?: string;
    mode?: string;
    temperature?: number;
    maxComplexity?: number;
    enabled?: boolean;
    permission?: {
        edit?: string;
        bash?: string;
    };
    [key: string]: unknown;
}
/**
 * Resolves an agent configuration by name from the 0xRay registry
 *
 * @param agentName - The name of the agent to resolve
 * @returns The agent configuration object
 * @throws Error if agent cannot be resolved
 */
export declare function resolveAgent(agentName: string): Promise<AgentConfig>;
/**
 * Gets all available agents from the registry
 */
export declare function getAllAgents(): Promise<string[]>;
/**
 * Checks if an agent exists in the registry
 */
export declare function agentExists(agentName: string): Promise<boolean>;
export {};
//# sourceMappingURL=agent-resolver.d.ts.map