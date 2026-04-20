/**
 * Security Orchestration Layer
 *
 * Coordinates multiple security agents for comprehensive vulnerability scanning,
 * automated remediation, and compliance validation using weighted voting
 * for architectural decisions.
 *
 * @version 1.22.13
 */
import { EventEmitter } from "events";
import { Vulnerability, RemediationPlan, ComplianceStandard } from "./comprehensive-security-audit.js";
export interface SecurityAgent {
    id: string;
    name: string;
    type: SecurityAgentType;
    weight: number;
    status: AgentStatus;
    lastActive?: Date;
    capabilities: string[];
}
export type SecurityAgentType = "security-auditor" | "code-analyzer" | "testing-lead" | "architect" | "vulnerability-scanner" | "compliance-validator" | "remediation-specialist";
export type AgentStatus = "idle" | "scanning" | "analyzing" | "reporting" | "error";
export interface OrchestrationConfig {
    enableWeightedVoting: boolean;
    enableAutoRemediation: boolean;
    decisionThreshold: number;
    agentWeights: Record<SecurityAgentType, number>;
    scanDepth: "shallow" | "medium" | "deep";
    complianceStandards: ComplianceStandard[];
    maxConcurrentAgents: number;
    timeout: number;
}
export interface SecurityTask {
    id: string;
    type: SecurityTaskType;
    priority: "critical" | "high" | "medium" | "low";
    assignedAgent?: SecurityAgent;
    status: "pending" | "in-progress" | "completed" | "failed";
    result?: unknown;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}
export type SecurityTaskType = "vulnerability-scan" | "code-analysis" | "compliance-check" | "remediation" | "threat-detection" | "security-review";
export interface AgentVote {
    agentId: string;
    agentName: string;
    vote: "approve" | "reject" | "abstain";
    weight: number;
    reasoning: string;
    concerns: string[] | undefined;
    confidence: number;
}
export interface SecurityDecision {
    id: string;
    title: string;
    description: string;
    type: "approval" | "rejection" | "revision-required";
    votes: AgentVote[];
    weightedApproval: number;
    threshold: number;
    approved: boolean;
    timestamp: Date;
    relatedVulnerabilities: string[] | undefined;
}
export interface SecurityOrchestrationReport {
    auditId: string;
    timestamp: Date;
    duration: number;
    agents: SecurityAgent[];
    tasks: SecurityTask[];
    decisions: SecurityDecision[];
    summary: {
        totalVulnerabilities: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        securityScore: number;
        complianceScore: number;
    };
    vulnerabilities: Vulnerability[];
    prioritizedRemediation: RemediationPlan[];
    recommendations: string[];
}
export declare class SecurityOrchestrationLayer extends EventEmitter {
    private config;
    private agents;
    private tasks;
    private decisions;
    private auditSystem;
    private isRunning;
    constructor(config?: Partial<OrchestrationConfig>);
    private initializeAgents;
    runSecurityOrchestration(projectPath: string): Promise<SecurityOrchestrationReport>;
    private createTask;
    private executeVulnerabilityScan;
    private executeComplianceCheck;
    private executeRemediationPlanning;
    private updateAgentStatus;
    private collectAgentVotes;
    private generateAgentVote;
    private makeSecurityDecisions;
    private createDecision;
    private generateOrchestrationReport;
    private calculateSecurityScore;
    private calculateComplianceScore;
    private prioritizeRemediation;
    private estimateFixTime;
    private generateRecommendations;
    getAgents(): SecurityAgent[];
    getAgent(agentId: string): SecurityAgent | undefined;
    getTasks(): SecurityTask[];
    getDecisions(): SecurityDecision[];
    getActiveAgents(): SecurityAgent[];
    getVulnerabilities(): Vulnerability[];
}
export declare function createSecurityOrchestrationLayer(config?: Partial<OrchestrationConfig>): SecurityOrchestrationLayer;
export declare function runSecurityOrchestration(projectPath: string, config?: Partial<OrchestrationConfig>): Promise<SecurityOrchestrationReport>;
//# sourceMappingURL=security-orchestration-layer.d.ts.map