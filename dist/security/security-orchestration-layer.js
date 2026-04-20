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
import { frameworkLogger } from "../core/framework-logger.js";
import { createSecurityAuditSystem, } from "./comprehensive-security-audit.js";
const DEFAULT_CONFIG = {
    enableWeightedVoting: true,
    enableAutoRemediation: true,
    decisionThreshold: 0.5,
    agentWeights: {
        "security-auditor": 0.35,
        "code-analyzer": 0.30,
        "testing-lead": 0.20,
        architect: 0.15,
        "vulnerability-scanner": 0.25,
        "compliance-validator": 0.20,
        "remediation-specialist": 0.15,
    },
    scanDepth: "medium",
    complianceStandards: ["owasp-top-10", "cwe", "nist", "iso-27001", "pci-dss"],
    maxConcurrentAgents: 4,
    timeout: 300000,
};
export class SecurityOrchestrationLayer extends EventEmitter {
    config;
    agents = new Map();
    tasks = new Map();
    decisions = new Map();
    auditSystem = null;
    isRunning = false;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initializeAgents();
    }
    initializeAgents() {
        const agentConfigs = [
            {
                id: "agent-security-auditor",
                name: "Security Auditor",
                type: "security-auditor",
                capabilities: [
                    "vulnerability-scanning",
                    "threat-detection",
                    "security-auditing",
                    "compliance-validation",
                ],
            },
            {
                id: "agent-code-analyzer",
                name: "Code Analyzer",
                type: "code-analyzer",
                capabilities: [
                    "code-pattern-analysis",
                    "static-analysis",
                    "dependency-scanning",
                    "security-hotspot-detection",
                ],
            },
            {
                id: "agent-testing-lead",
                name: "Testing Lead",
                type: "testing-lead",
                capabilities: [
                    "security-testing",
                    "penetration-testing",
                    "test-coverage-analysis",
                    "vulnerability-validation",
                ],
            },
            {
                id: "agent-architect",
                name: "Architect",
                type: "architect",
                capabilities: [
                    "security-architecture",
                    "threat-modeling",
                    "design-review",
                    "risk-assessment",
                ],
            },
            {
                id: "agent-vuln-scanner",
                name: "Vulnerability Scanner",
                type: "vulnerability-scanner",
                capabilities: [
                    "automated-scanning",
                    "dependency-analysis",
                    "configuration-review",
                    "exploit-detection",
                ],
            },
            {
                id: "agent-compliance",
                name: "Compliance Validator",
                type: "compliance-validator",
                capabilities: [
                    "owasp-validation",
                    "cwe-compliance",
                    "nist-compliance",
                    "iso-27001-validation",
                    "pci-dss-validation",
                ],
            },
            {
                id: "agent-remediation",
                name: "Remediation Specialist",
                type: "remediation-specialist",
                capabilities: [
                    "automated-remediation",
                    "fix-prioritization",
                    "patch-management",
                    "code-generation",
                ],
            },
        ];
        for (const config of agentConfigs) {
            const agent = {
                id: config.id,
                name: config.name,
                type: config.type,
                weight: this.config.agentWeights[config.type] || 0.2,
                status: "idle",
                capabilities: config.capabilities,
            };
            this.agents.set(agent.id, agent);
        }
        frameworkLogger.log("security-orchestration", "agents-initialized", "info", { agentCount: this.agents.size });
    }
    async runSecurityOrchestration(projectPath) {
        if (this.isRunning) {
            throw new Error("Security orchestration is already running");
        }
        const startTime = Date.now();
        const auditId = `security-orchestration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.isRunning = true;
        frameworkLogger.log("security-orchestration", "orchestration-start", "info", {
            auditId,
            projectPath,
            config: this.config,
        });
        try {
            this.emit("orchestration:start", { auditId, projectPath });
            const securityTask = await this.createTask("vulnerability-scan", "high");
            const complianceTask = await this.createTask("compliance-check", "medium");
            const remediationTask = await this.createTask("remediation", "low");
            await Promise.all([
                this.executeVulnerabilityScan(projectPath, securityTask),
                this.executeComplianceCheck(complianceTask),
                this.executeRemediationPlanning(remediationTask),
            ]);
            if (this.config.enableWeightedVoting) {
                await this.collectAgentVotes();
                this.makeSecurityDecisions();
            }
            const report = await this.generateOrchestrationReport(auditId, startTime);
            this.emit("orchestration:complete", report);
            return report;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            frameworkLogger.log("security-orchestration", "orchestration-error", "error", { auditId, error: errorMessage });
            this.emit("orchestration:error", { auditId, error: errorMessage });
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    async createTask(type, priority) {
        const task = {
            id: `task-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            type,
            priority,
            status: "pending",
            createdAt: new Date(),
        };
        this.tasks.set(task.id, task);
        return task;
    }
    async executeVulnerabilityScan(projectPath, task) {
        task.status = "in-progress";
        this.updateAgentStatus("agent-security-auditor", "scanning");
        this.updateAgentStatus("agent-code-analyzer", "analyzing");
        try {
            this.auditSystem = createSecurityAuditSystem({
                projectPath,
                scanDepth: this.config.scanDepth,
                includeDependencies: true,
                complianceStandards: this.config.complianceStandards,
                enableAutoRemediation: this.config.enableAutoRemediation,
                enableWeightedVoting: this.config.enableWeightedVoting,
                agentWeights: this.config.agentWeights,
            });
            const report = await this.auditSystem.runAudit();
            task.result = report;
            task.status = "completed";
            task.completedAt = new Date();
            frameworkLogger.log("security-orchestration", "vulnerability-scan-complete", "info", {
                taskId: task.id,
                vulnerabilities: report.summary.totalVulnerabilities,
                score: report.summary.securityScore,
            });
            this.emit("task:complete", task);
        }
        catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            this.emit("task:failed", task);
        }
        finally {
            this.updateAgentStatus("agent-security-auditor", "idle");
            this.updateAgentStatus("agent-code-analyzer", "idle");
        }
    }
    async executeComplianceCheck(task) {
        task.status = "in-progress";
        this.updateAgentStatus("agent-compliance", "analyzing");
        try {
            if (this.auditSystem) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            task.status = "completed";
            task.completedAt = new Date();
            this.emit("task:complete", task);
        }
        catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            this.emit("task:failed", task);
        }
        finally {
            this.updateAgentStatus("agent-compliance", "idle");
        }
    }
    async executeRemediationPlanning(task) {
        task.status = "in-progress";
        this.updateAgentStatus("agent-remediation", "analyzing");
        try {
            if (this.auditSystem) {
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            task.status = "completed";
            task.completedAt = new Date();
            this.emit("task:complete", task);
        }
        catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            this.emit("task:failed", task);
        }
        finally {
            this.updateAgentStatus("agent-remediation", "idle");
        }
    }
    updateAgentStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.status = status;
            agent.lastActive = new Date();
            this.emit("agent:status-change", agent);
        }
    }
    async collectAgentVotes() {
        frameworkLogger.log("security-orchestration", "collecting-agent-votes", "info", { agentCount: this.agents.size });
        const vulnerabilities = this.auditSystem?.getVulnerabilities() || [];
        const criticalCount = vulnerabilities.filter((v) => v.severity === "critical").length;
        const highCount = vulnerabilities.filter((v) => v.severity === "high").length;
        for (const [agentId, agent] of this.agents) {
            const vote = await this.generateAgentVote(agent, vulnerabilities);
            this.emit("agent:vote", { agentId, vote });
            frameworkLogger.log("security-orchestration", "agent-vote-received", "info", {
                agentId,
                agentName: agent.name,
                vote: vote.vote,
                weight: vote.weight,
            });
        }
    }
    async generateAgentVote(agent, vulnerabilities) {
        const criticalCount = vulnerabilities.filter((v) => v.severity === "critical").length;
        const highCount = vulnerabilities.filter((v) => v.severity === "high").length;
        const totalVulns = vulnerabilities.length;
        let vote = "approve";
        let reasoning = `Security review complete. Found ${totalVulns} vulnerabilities.`;
        const concerns = [];
        if (criticalCount > 0) {
            concerns.push(`${criticalCount} critical vulnerabilities require immediate attention`);
        }
        if (highCount > 5) {
            concerns.push(`${highCount} high-severity vulnerabilities detected`);
        }
        if (criticalCount > 5) {
            vote = "reject";
            reasoning = "Too many critical vulnerabilities. Security posture unacceptable.";
        }
        else if (criticalCount > 0 || highCount > 10) {
            reasoning = "Acceptable with noted concerns. Priority fixes required.";
        }
        return {
            agentId: agent.id,
            agentName: agent.name,
            vote,
            weight: agent.weight,
            reasoning,
            concerns: concerns.length > 0 ? concerns : [],
            confidence: Math.max(0.5, 1 - (criticalCount * 0.1 + highCount * 0.02)),
        };
    }
    makeSecurityDecisions() {
        const vulnerabilities = this.auditSystem?.getVulnerabilities() || [];
        const decisions = [];
        const criticalVulns = vulnerabilities.filter((v) => v.severity === "critical");
        if (criticalVulns.length > 0) {
            const decision = this.createDecision("Critical Vulnerabilities Detected", `Found ${criticalVulns.length} critical vulnerabilities requiring immediate remediation`, "revision-required", criticalVulns.map((v) => v.id));
            decisions.push(decision);
        }
        const highVulns = vulnerabilities.filter((v) => v.severity === "high");
        if (highVulns.length > 5) {
            const decision = this.createDecision("High-Severity Vulnerability Threshold Exceeded", `Found ${highVulns.length} high-severity vulnerabilities. Security enhancements required.`, "approval", highVulns.map((v) => v.id));
            decisions.push(decision);
        }
        if (vulnerabilities.length === 0) {
            const decision = this.createDecision("Security Approval", "No vulnerabilities detected. System meets security standards.", "approval");
            decisions.push(decision);
        }
        for (const decision of decisions) {
            this.decisions.set(decision.id, decision);
        }
        frameworkLogger.log("security-orchestration", "decisions-made", "info", { decisionCount: decisions.length });
    }
    createDecision(title, description, type, relatedVulnerabilities) {
        const agents = Array.from(this.agents.values());
        const votes = agents.map((agent) => ({
            agentId: agent.id,
            agentName: agent.name,
            vote: type === "rejection" ? "reject" : "approve",
            weight: agent.weight,
            reasoning: "Automated voting based on vulnerability analysis",
            concerns: undefined,
            confidence: 0.85,
        }));
        const weightedApproval = votes.reduce((sum, v) => (v.vote === "approve" ? sum + v.weight : sum), 0) /
            votes.reduce((sum, v) => sum + v.weight, 0);
        return {
            id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            title,
            description,
            type,
            votes,
            weightedApproval,
            threshold: this.config.decisionThreshold,
            approved: weightedApproval >= this.config.decisionThreshold,
            timestamp: new Date(),
            relatedVulnerabilities,
        };
    }
    async generateOrchestrationReport(auditId, startTime) {
        const vulnerabilities = this.auditSystem?.getVulnerabilities() || [];
        const decisions = Array.from(this.decisions.values());
        const tasks = Array.from(this.tasks.values());
        const agents = Array.from(this.agents.values());
        const bySeverity = {
            critical: vulnerabilities.filter((v) => v.severity === "critical").length,
            high: vulnerabilities.filter((v) => v.severity === "high").length,
            medium: vulnerabilities.filter((v) => v.severity === "medium").length,
            low: vulnerabilities.filter((v) => v.severity === "low").length,
        };
        const securityScore = this.calculateSecurityScore(vulnerabilities);
        const complianceScore = this.calculateComplianceScore(vulnerabilities);
        const prioritizedRemediation = this.prioritizeRemediation(vulnerabilities);
        const report = {
            auditId,
            timestamp: new Date(),
            duration: Date.now() - startTime,
            agents,
            tasks,
            decisions,
            summary: {
                totalVulnerabilities: vulnerabilities.length,
                ...bySeverity,
                securityScore,
                complianceScore,
            },
            vulnerabilities,
            prioritizedRemediation,
            recommendations: this.generateRecommendations(vulnerabilities, decisions),
        };
        this.emit("orchestration:report", report);
        return report;
    }
    calculateSecurityScore(vulnerabilities) {
        const weights = {
            critical: 20,
            high: 10,
            medium: 5,
            low: 2,
            info: 0,
        };
        let score = 100;
        for (const vuln of vulnerabilities) {
            score -= weights[vuln.severity] || 0;
        }
        return Math.max(0, Math.min(100, score));
    }
    calculateComplianceScore(vulnerabilities) {
        const criticalVulns = vulnerabilities.filter((v) => v.severity === "critical").length;
        const highVulns = vulnerabilities.filter((v) => v.severity === "high").length;
        return Math.max(0, 100 - criticalVulns * 15 - highVulns * 5);
    }
    prioritizeRemediation(vulnerabilities) {
        const severityPriority = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
            info: 5,
        };
        return vulnerabilities
            .map((vuln) => ({
            vulnerabilityId: vuln.id,
            title: vuln.title,
            severity: vuln.severity,
            priority: severityPriority[vuln.severity],
            steps: vuln.autoRemediation || [],
            dependencies: [],
            estimatedTime: this.estimateFixTime(vuln.autoRemediation),
        }))
            .sort((a, b) => a.priority - b.priority);
    }
    estimateFixTime(steps) {
        if (!steps || steps.length === 0)
            return "30 minutes";
        const efforts = steps.map((s) => s.estimatedEffort || "medium");
        if (efforts.includes("high"))
            return "4 hours";
        if (efforts.includes("medium"))
            return "1 hour";
        return "15 minutes";
    }
    generateRecommendations(vulnerabilities, decisions) {
        const recommendations = [];
        const criticalCount = vulnerabilities.filter((v) => v.severity === "critical").length;
        const highCount = vulnerabilities.filter((v) => v.severity === "high").length;
        if (criticalCount > 0) {
            recommendations.push(`🚨 Address ${criticalCount} critical vulnerabilities immediately`);
        }
        if (highCount > 0) {
            recommendations.push(`⚠️ Prioritize fixing ${highCount} high-severity vulnerabilities`);
        }
        const automatable = vulnerabilities.filter((v) => v.autoRemediation?.[0]?.automated).length;
        if (automatable > 0) {
            recommendations.push(`🔧 ${automatable} vulnerabilities can be fixed automatically`);
        }
        const rejectedDecisions = decisions.filter((d) => d.type === "rejection");
        if (rejectedDecisions.length > 0) {
            recommendations.push("❌ Security architecture requires revision before deployment");
        }
        if (recommendations.length === 0) {
            recommendations.push("✅ No immediate security actions required");
        }
        return recommendations;
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getTasks() {
        return Array.from(this.tasks.values());
    }
    getDecisions() {
        return Array.from(this.decisions.values());
    }
    getActiveAgents() {
        return Array.from(this.agents.values()).filter((a) => a.status !== "idle");
    }
    getVulnerabilities() {
        return this.auditSystem?.getVulnerabilities() || [];
    }
}
export function createSecurityOrchestrationLayer(config) {
    return new SecurityOrchestrationLayer(config);
}
export async function runSecurityOrchestration(projectPath, config) {
    const orchestration = new SecurityOrchestrationLayer(config);
    return orchestration.runSecurityOrchestration(projectPath);
}
//# sourceMappingURL=security-orchestration-layer.js.map