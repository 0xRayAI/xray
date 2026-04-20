/**
 * Agent Expertise Configuration
 *
 * Defines expertise levels for weighted voting across all 0xRay agents.
 * Higher expertise = higher weight in voting decisions.
 *
 * @version 1.0.0
 * @since 2026-04-16
 */
import type { AgentExpertise } from "./voting-types.js";
export declare const AGENT_EXPERTISE_LEVELS: Record<string, AgentExpertise>;
export declare function getAgentExpertise(agentName: string): AgentExpertise | undefined;
export declare function getAgentExpertiseLevel(agentName: string): number;
export declare function getVotingWeight(agentName: string): number;
export declare function getAgentsWithExpertiseDomain(domain: string): AgentExpertise[];
export declare function getTopExpertsForDomain(domain: string, count?: number): AgentExpertise[];
//# sourceMappingURL=agent-expertise.d.ts.map