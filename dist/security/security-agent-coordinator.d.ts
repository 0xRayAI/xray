/**
 * Security Agent Integration
 *
 * Integrates the security orchestration layer with the framework's agent system.
 * Provides coordination between security agents using weighted voting.
 *
 * @version 1.22.13
 */
import { EventEmitter } from "events";
import { SecurityOrchestrationLayer, SecurityAgent, SecurityDecision, OrchestrationConfig } from "./security-orchestration-layer.js";
import { Vulnerability } from "./comprehensive-security-audit.js";
export interface SecurityAgentConfig {
    agentId: string;
    agentType: string;
    capabilities: string[];
    weight: number;
}
export interface SecurityAgentContext {
    projectPath: string;
    scanDepth: "shallow" | "medium" | "deep";
    complianceStandards: string[];
    enableAutoRemediation: boolean;
}
export interface AgentVotingResult {
    agentId: string;
    agentName: string;
    vote: "approve" | "reject" | "abstain";
    weight: number;
    reasoning: string;
    concerns: string[];
    confidence: number;
}
export interface MultiAgentSecurityResult {
    auditId: string;
    timestamp: Date;
    duration: number;
    participatingAgents: string[];
    vulnerabilities: Vulnerability[];
    decisions: SecurityDecision[];
    agentVotes: AgentVotingResult[];
    summary: {
        totalVulnerabilities: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        securityScore: number;
        complianceScore: number;
    };
    weightedApproval: number;
    approved: boolean;
    recommendations: string[];
}
export declare class SecurityAgentCoordinator extends EventEmitter {
    private orchestration;
    private agentRegistry;
    private isActive;
    constructor(config?: Partial<OrchestrationConfig>);
    private setupEventHandlers;
    registerAgent(config: SecurityAgentConfig): void;
    unregisterAgent(agentId: string): boolean;
    getRegisteredAgents(): SecurityAgentConfig[];
    runCoordinatedSecurityScan(context: SecurityAgentContext): Promise<MultiAgentSecurityResult>;
    private collectAgentVotes;
    private calculateWeightedApproval;
    getOrchestrationLayer(): SecurityOrchestrationLayer;
    getActiveAgents(): SecurityAgent[];
    getPendingTasks(): import("./security-orchestration-layer.js").SecurityTask[];
    isCoordinatorActive(): boolean;
}
export declare function createSecurityAgentCoordinator(config?: Partial<OrchestrationConfig>): SecurityAgentCoordinator;
export declare function runMultiAgentSecurityScan(projectPath: string, context?: Partial<SecurityAgentContext>): Promise<MultiAgentSecurityResult>;
//# sourceMappingURL=security-agent-coordinator.d.ts.map