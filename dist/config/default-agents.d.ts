/**
 * Default Agent Configurations
 *
 * Centralized agent definitions for the 0xRay delegation system.
 * This file externalizes all hardcoded agent configurations.
 *
 * @version 1.0.0
 * @since 2026-01-07
 */
export interface DefaultAgentConfig {
    name: string;
    capabilities: string[];
    status: "active" | "inactive";
    expertise: string;
    capacity: number;
    performance: number;
    specialties: string[];
}
export declare const DEFAULT_AGENTS: DefaultAgentConfig[];
export declare function getDefaultAgents(): DefaultAgentConfig[];
export declare function getDefaultAgentByName(name: string): DefaultAgentConfig | undefined;
//# sourceMappingURL=default-agents.d.ts.map