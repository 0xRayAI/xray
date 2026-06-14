/**
 * Security Agent Integration
 *
 * Integrates the security orchestration layer with the framework's agent system.
 * Provides coordination between security agents using weighted voting.
 *
 * @version 1.22.13
 */

import { EventEmitter } from "events";
import { frameworkLogger } from "../core/framework-logger.js";
import {
  SecurityOrchestrationLayer,
  createSecurityOrchestrationLayer,
  runSecurityOrchestration,
  SecurityAgent,
  SecurityDecision,
  SecurityOrchestrationReport,
  OrchestrationConfig,
} from "./security-orchestration-layer.js";
import {
  Vulnerability,
  SecurityAuditReport,
  ComprehensiveSecurityAuditSystem,
} from "./comprehensive-security-audit.js";

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

export class SecurityAgentCoordinator extends EventEmitter {
  private orchestration: SecurityOrchestrationLayer;
  private agentRegistry: Map<string, SecurityAgentConfig> = new Map();
  private isActive = false;

  constructor(config?: Partial<OrchestrationConfig>) {
    super();
    this.orchestration = createSecurityOrchestrationLayer(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.orchestration.on("orchestration:start", (data) => {
      this.emit("coordinator:start", data);
      frameworkLogger.log("security-agent-coordinator", "coordinator-start", "info", data);
    });

    this.orchestration.on("orchestration:complete", (report) => {
      this.emit("coordinator:complete", report);
      frameworkLogger.log("security-agent-coordinator", "coordinator-complete", "info", {
        auditId: report.auditId,
        duration: report.duration,
        vulnerabilities: report.summary.totalVulnerabilities,
      });
    });

    this.orchestration.on("orchestration:error", (error) => {
      this.emit("coordinator:error", error);
      frameworkLogger.log("security-agent-coordinator", "coordinator-error", "error", error);
    });

    this.orchestration.on("agent:vote", ({ agentId, vote }) => {
      this.emit("agent:vote", { agentId, vote });
    });

    this.orchestration.on("agent:status-change", (agent) => {
      this.emit("agent:status-change", agent);
    });

    this.orchestration.on("task:complete", (task) => {
      this.emit("task:complete", task);
    });

    this.orchestration.on("task:failed", (task) => {
      this.emit("task:failed", task);
    });
  }

  registerAgent(config: SecurityAgentConfig): void {
    this.agentRegistry.set(config.agentId, config);
    frameworkLogger.log("security-agent-coordinator", "agent-registered", "info", {
      agentId: config.agentId,
      agentType: config.agentType,
      weight: config.weight,
    });
  }

  unregisterAgent(agentId: string): boolean {
    const removed = this.agentRegistry.delete(agentId);
    if (removed) {
      frameworkLogger.log("security-agent-coordinator", "agent-unregistered", "info", {
        agentId,
      });
    }
    return removed;
  }

  getRegisteredAgents(): SecurityAgentConfig[] {
    return Array.from(this.agentRegistry.values());
  }

  async runCoordinatedSecurityScan(context: SecurityAgentContext): Promise<MultiAgentSecurityResult> {
    this.isActive = true;
    const startTime = Date.now();

    frameworkLogger.log("security-agent-coordinator", "coordinated-scan-start", "info", {
      projectPath: context.projectPath,
      scanDepth: context.scanDepth,
      registeredAgents: this.agentRegistry.size,
    });

    try {
      const report = await this.orchestration.runSecurityOrchestration(context.projectPath);

      const agentVotes = this.collectAgentVotes(report);
      const weightedApproval = this.calculateWeightedApproval(agentVotes);

      const result: MultiAgentSecurityResult = {
        auditId: report.auditId,
        timestamp: report.timestamp,
        duration: report.duration,
        participatingAgents: report.agents.map((a) => a.name),
        vulnerabilities: report.vulnerabilities,
        decisions: report.decisions,
        agentVotes,
        summary: report.summary,
        weightedApproval,
        approved: weightedApproval >= 0.5,
        recommendations: report.recommendations,
      };

      this.emit("coordinated-scan:complete", result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      frameworkLogger.log("security-agent-coordinator", "coordinated-scan-error", "error", {
        error: errorMessage,
      });
      throw error;
    } finally {
      this.isActive = false;
    }
  }

  private collectAgentVotes(report: SecurityOrchestrationReport): AgentVotingResult[] {
    const vulnerabilities = report.vulnerabilities;
    const agents = report.agents;

    return agents.map((agent) => {
      const agentVulns = vulnerabilities.filter(
        (v) => v.severity === "critical" || v.severity === "high",
      );

      const concerns: string[] = [];
      let vote: "approve" | "reject" | "abstain" = "approve";
      let reasoning = `Security review by ${agent.name}. Found ${vulnerabilities.length} vulnerabilities.`;

      const criticalCount = vulnerabilities.filter((v) => v.severity === "critical").length;
      const highCount = vulnerabilities.filter((v) => v.severity === "high").length;

      if (criticalCount > 0) {
        concerns.push(`${criticalCount} critical vulnerabilities detected`);
      }
      if (highCount > 5) {
        concerns.push(`${highCount} high-severity vulnerabilities`);
      }

      if (criticalCount > 5) {
        vote = "reject";
        reasoning = "Too many critical vulnerabilities. Security posture unacceptable.";
      } else if (criticalCount > 0 || highCount > 10) {
        vote = "approve";
        reasoning = "Acceptable with noted concerns. Priority fixes required.";
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        vote,
        weight: agent.weight,
        reasoning,
        concerns,
        confidence: Math.max(0.5, 1 - (criticalCount * 0.1 + highCount * 0.02)),
      };
    });
  }

  private calculateWeightedApproval(votes: AgentVotingResult[]): number {
    if (votes.length === 0) return 0;

    const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
    const approvalWeight = votes
      .filter((v) => v.vote === "approve")
      .reduce((sum, v) => sum + v.weight, 0);

    return totalWeight > 0 ? approvalWeight / totalWeight : 0;
  }

  getOrchestrationLayer(): SecurityOrchestrationLayer {
    return this.orchestration;
  }

  getActiveAgents(): SecurityAgent[] {
    return this.orchestration.getActiveAgents();
  }

  getPendingTasks() {
    return this.orchestration.getTasks().filter((t) => t.status === "pending");
  }

  isCoordinatorActive(): boolean {
    return this.isActive;
  }
}

export function createSecurityAgentCoordinator(
  config?: Partial<OrchestrationConfig>,
): SecurityAgentCoordinator {
  return new SecurityAgentCoordinator(config);
}

export async function runMultiAgentSecurityScan(
  projectPath: string,
  context?: Partial<SecurityAgentContext>,
): Promise<MultiAgentSecurityResult> {
  const coordinator = createSecurityAgentCoordinator();

  const fullContext: SecurityAgentContext = {
    projectPath,
    scanDepth: context?.scanDepth || "medium",
    complianceStandards: context?.complianceStandards || ["owasp-top-10", "cwe"],
    enableAutoRemediation: context?.enableAutoRemediation ?? true,
    ...context,
  };

  coordinator.registerAgent({
    agentId: "agent-security-auditor",
    agentType: "security-auditor",
    capabilities: ["vulnerability-scanning", "threat-detection", "security-auditing"],
    weight: 0.35,
  });

  coordinator.registerAgent({
    agentId: "agent-code-analyzer",
    agentType: "code-analyzer",
    capabilities: ["code-pattern-analysis", "static-analysis", "security-hotspot-detection"],
    weight: 0.30,
  });

  coordinator.registerAgent({
    agentId: "agent-testing-lead",
    agentType: "testing-lead",
    capabilities: ["security-testing", "penetration-testing", "vulnerability-validation"],
    weight: 0.20,
  });

  coordinator.registerAgent({
    agentId: "agent-architect",
    agentType: "architect",
    capabilities: ["security-architecture", "threat-modeling", "risk-assessment"],
    weight: 0.15,
  });

  return coordinator.runCoordinatedSecurityScan(fullContext);
}
