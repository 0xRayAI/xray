/**
 * 0xRay Comprehensive Security Audit System
 *
 * Multi-agent security audit system with vulnerability scanning,
 * automated remediation, compliance checking, and weighted voting
 * for architectural decisions.
 *
 * @version 1.22.13
 */
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";
export type ComplianceStandard = "owasp-top-10" | "cwe" | "nist" | "iso-27001" | "pci-dss";
export interface Vulnerability {
    id: string;
    title: string;
    severity: SeverityLevel;
    category: VulnerabilityCategory;
    cwe: string;
    owasp?: string | undefined;
    file: string;
    line: number;
    column?: number | undefined;
    description: string;
    impact: string;
    recommendation: string;
    codeSnippet: string;
    confidence: number;
    autoRemediation?: RemediationStep[] | undefined;
}
export type VulnerabilityCategory = "injection" | "authentication" | "authorization" | "cryptography" | "configuration" | "data-protection" | "input-validation" | "sensitive-data-exposure" | "security-misconfiguration" | "dependency-vulnerability";
export interface RemediationStep {
    step: number;
    action: string;
    code?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    estimatedEffort: "low" | "medium" | "high";
    automated: boolean;
}
export interface SecurityAuditConfig {
    projectPath: string;
    scanDepth?: "shallow" | "medium" | "deep";
    includeDependencies?: boolean;
    complianceStandards?: ComplianceStandard[];
    enableAutoRemediation?: boolean;
    enableWeightedVoting?: boolean;
    agentWeights?: Record<string, number>;
    outputPath?: string | undefined;
}
export interface WeightedVote {
    agentId: string;
    agentName: string;
    vote: "approve" | "reject" | "abstain";
    weight: number;
    reasoning: string;
    concerns?: string[] | undefined;
}
export interface ArchitecturalDecision {
    id: string;
    title: string;
    description: string;
    proposedBy: string;
    votes: WeightedVote[];
    finalDecision: "approved" | "rejected" | "needs-revision";
    approvedBy: WeightedVote[];
    rejectedBy: WeightedVote[];
    timestamp: Date;
}
export interface ComplianceResult {
    standard: ComplianceStandard;
    passed: boolean;
    score: number;
    findings: Vulnerability[];
    recommendations: string[];
}
export interface SecurityAuditReport {
    metadata: {
        auditId: string;
        timestamp: Date;
        projectPath: string;
        totalFilesScanned: number;
        duration: number;
    };
    summary: {
        totalVulnerabilities: number;
        bySeverity: Record<SeverityLevel, number>;
        byCategory: Record<VulnerabilityCategory, number>;
        securityScore: number;
        complianceScore: number;
    };
    vulnerabilities: Vulnerability[];
    compliance: ComplianceResult[];
    remediation: {
        totalIssues: number;
        automatable: number;
        manualRequired: number;
        estimatedFixTime: string;
        prioritizedFixes: RemediationPlan[];
    };
    architecturalDecisions: ArchitecturalDecision[];
    agentConsensus: {
        participatingAgents: string[];
        averageAgreement: number;
        contentiousIssues: Vulnerability[];
    } | undefined;
}
export interface RemediationPlan {
    vulnerabilityId: string;
    title: string;
    severity: SeverityLevel;
    priority: number;
    steps: RemediationStep[];
    dependencies: string[];
    estimatedTime: string;
}
export declare class ComprehensiveSecurityAuditSystem {
    private config;
    private vulnerabilities;
    private architecturalDecisions;
    private agentVotes;
    private readonly severityWeights;
    private readonly defaultAgentWeights;
    private readonly dangerousPatterns;
    constructor(config: SecurityAuditConfig);
    runAudit(): Promise<SecurityAuditReport>;
    private getProjectFiles;
    private auditFile;
    private createVulnerability;
    private isFalsePositive;
    private auditImports;
    private auditDependencies;
    private checkCompliance;
    private evaluateStandard;
    private evaluateOWASP;
    private evaluateCWE;
    private evaluateNIST;
    private evaluateISO27001;
    private evaluatePCIDSS;
    private groupByCategory;
    private generateRemediationPlan;
    private prioritizeFixes;
    private estimateFixTime;
    private estimateFixTimeForVuln;
    private calculateSummary;
    private collectAgentVotes;
    private simulateAgentVote;
    private resolveArchitecturalDecisions;
    private calculateAgentConsensus;
    private saveReport;
    generateMarkdownReport(report: SecurityAuditReport): string;
    private getScoreEmoji;
    private getSeverityEmoji;
    addVote(vote: WeightedVote): void;
    getVulnerabilities(): Vulnerability[];
    getArchitecturalDecisions(): ArchitecturalDecision[];
}
export declare function createSecurityAuditSystem(config: SecurityAuditConfig): ComprehensiveSecurityAuditSystem;
export declare function runQuickSecurityAudit(projectPath: string): Promise<SecurityAuditReport>;
export declare function runDeepSecurityAudit(projectPath: string, outputPath?: string): Promise<SecurityAuditReport>;
//# sourceMappingURL=comprehensive-security-audit.d.ts.map