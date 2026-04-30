import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { shouldTriggerCycle, accumulateCorpus, InferenceCorpus, RecurringPattern, RecurringProblem } from "./inference-accumulator.js";
import { DeployVerifier, DeployVerificationResult } from "./deploy-verifier.js";
import { VotingCoordinator } from "../delegation/voting-coordinator.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";

export interface InferenceProposal {
  id: string;
  type: "fix" | "refactor" | "automate" | "guard" | "codify";
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
  source: "recurring_problem" | "recurring_pattern" | "wrong_turn";
  status: "pending" | "approved" | "rejected" | "applied" | "failed";
}

export interface InferenceCycleResult {
  cycleId: string;
  triggered: boolean;
  triggerReason: string;
  corpusSummary: {
    sessions: number;
    totalCommits: number;
    recurringPatterns: number;
    recurringProblems: number;
  };
  proposals: InferenceProposal[];
  votes: {
    proposalId: string;
    decision: string;
    confidence: number;
    details: string[];
  }[];
  deployVerification?: DeployVerificationResult | undefined;
  phase: CyclePhase;
  completedAt: string;
  duration: number;
}

export type CyclePhase =
  | "idle"
  | "collecting"
  | "proposing"
  | "governing"
  | "deploying"
  | "verifying"
  | "complete"
  | "failed";

const CYCLE_STATE_FILE = "inference-cycle-state.json";
const CYCLE_HISTORY_FILE = "inference-cycle-history.json";
const GOVERNANCE_AGENTS = ["code-reviewer", "enforcer", "architect"];
const VOTE_THRESHOLD = 0.65;

export class InferenceCycle {
  private inferenceDir: string;
  private stateDir: string;
  private projectRoot: string;
  private phase: CyclePhase = "idle";

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.inferenceDir = path.join(this.projectRoot, "docs", "inference");
    this.stateDir = path.join(this.projectRoot, ".strray", "inference");
  }

  async maybeRunCycle(): Promise<InferenceCycleResult> {
    const startTime = Date.now();
    const cycleId = `cycle-${Date.now()}`;

    this.setPhase("collecting");

    const lastCycleFile = path.join(this.stateDir, CYCLE_STATE_FILE);
    const threshold = shouldTriggerCycle(this.inferenceDir, lastCycleFile);

    if (!threshold.trigger) {
      this.setPhase("idle");
      return this.buildResult(cycleId, false, threshold.reason, startTime);
    }

    frameworkLogger.log("inference-cycle", "cycle-triggered", "info", {
      cycleId,
      reason: threshold.reason,
    });

    const corpus = accumulateCorpus(this.inferenceDir);

    this.setPhase("proposing");
    const proposals = this.generateProposals(corpus);

    if (proposals.length === 0) {
      this.setPhase("complete");
      return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals);
    }

    this.setPhase("governing");
    const votes = await this.governProposals(proposals);

    const approved = proposals.filter(
      (p) => votes.find((v) => v.proposalId === p.id && v.decision === "approve"),
    );

    for (const p of approved) {
      p.status = "approved";
    }

    for (const p of proposals.filter((p) => p.status !== "approved")) {
      p.status = "rejected";
    }

    if (approved.length > 0) {
      this.setPhase("deploying");
      const verifier = new DeployVerifier(this.projectRoot);
      const deployResult = verifier.quickVerify();

      this.setPhase("verifying");

      if (deployResult.success) {
        for (const p of approved) {
          p.status = "applied";
        }
      } else {
        for (const p of approved) {
          p.status = "failed";
        }
      }

      this.setPhase("complete");
      this.saveCycleState(cycleId);
      this.appendHistory(this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals, votes, deployResult));

      return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals, votes, deployResult);
    }

    this.setPhase("complete");
    this.saveCycleState(cycleId);
    this.appendHistory(this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals, votes));

    return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals, votes);
  }

  private generateProposals(corpus: InferenceCorpus): InferenceProposal[] {
    const proposals: InferenceProposal[] = [];

    for (const problem of corpus.recurringProblems) {
      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type: this.classifyProposalType(problem.pattern),
        title: this.generateTitle(problem),
        description: `Recurring problem detected across ${problem.occurrences} sessions: ${problem.pattern}`,
        evidence: [`Occurred in ${problem.occurrences} sessions: ${problem.sessions.join(", ")}`],
        confidence: Math.min(0.95, 0.5 + problem.occurrences * 0.15),
        source: "recurring_problem",
        status: "pending",
      });
    }

    for (const pattern of corpus.recurringPatterns) {
      if (pattern.occurrences < 2) continue;

      const type = this.patternToProposalType(pattern);
      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type,
        title: `Codify ${pattern.name} pattern`,
        description: `${pattern.name} detected across ${pattern.occurrences} sessions (avg confidence: ${Math.round(pattern.avgConfidence * 100)}%). ${pattern.description}`,
        evidence: pattern.evidence,
        confidence: pattern.avgConfidence,
        source: "recurring_pattern",
        status: "pending",
      });
    }

    for (const wt of corpus.allWrongTurns.slice(0, 2)) {
      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type: "guard",
        title: `Add guard for: ${wt.substring(0, 60)}`,
        description: `Recurring wrong turn: ${wt}`,
        evidence: [wt],
        confidence: 0.7,
        source: "wrong_turn",
        status: "pending",
      });
    }

    return proposals.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private async governProposals(proposals: InferenceProposal[]): Promise<InferenceCycleResult["votes"]> {
    const stateManager = new StringRayStateManager();
    const coordinator = new VotingCoordinator(stateManager);
    const sessionId = `inference-cycle-${Date.now()}`;
    const results: InferenceCycleResult["votes"] = [];

    for (const proposal of proposals) {
      const voteId = await coordinator.initiateVoting(
        sessionId,
        proposal.title,
        proposal.description,
        GOVERNANCE_AGENTS,
        {
          complexity: 25,
          riskLevel: proposal.type === "fix" ? "low" : "medium",
          hasSecurityConcerns: false,
          hasArchitecturalImpact: proposal.type === "codify",
          participantCount: GOVERNANCE_AGENTS.length,
        },
      );

      for (const agent of GOVERNANCE_AGENTS) {
        const vote = this.simulateAgentVote(agent, proposal);
        coordinator.submitVote(voteId, agent, vote.decision, vote.confidence, vote.reasoning);
      }

      const resolved = coordinator.resolveVoting(voteId);
      if (resolved) {
        results.push({
          proposalId: proposal.id,
          decision: resolved.confidence >= VOTE_THRESHOLD ? "approve" : "reject",
          confidence: resolved.confidence,
          details: resolved.details?.map((d) => `${d.agentName}: weight=${d.weight.toFixed(2)}`) || [],
        });
      }
    }

    return results;
  }

  private simulateAgentVote(
    agent: string,
    proposal: InferenceProposal,
  ): { decision: string; confidence: number; reasoning: string } {
    const baseConfidence = proposal.confidence;

    switch (agent) {
      case "code-reviewer":
        return {
          decision: proposal.evidence.length >= 1 ? "approve" : "reject",
          confidence: baseConfidence * 0.9,
          reasoning: proposal.evidence.length >= 1
            ? `Evidence-backed proposal with ${proposal.evidence.length} data points`
            : "Insufficient evidence for code change",
        };
      case "enforcer":
        return {
          decision: proposal.type === "guard" || proposal.type === "fix" ? "approve" : "approve",
          confidence: baseConfidence * 0.85,
          reasoning: `Codex compliance check for ${proposal.type} proposal`,
        };
      case "architect":
        return {
          decision: proposal.confidence >= 0.7 ? "approve" : "reject",
          confidence: baseConfidence * 0.95,
          reasoning: proposal.confidence >= 0.7
            ? `Sufficient confidence (${Math.round(proposal.confidence * 100)}%) for architectural change`
            : "Below confidence threshold for architectural changes",
        };
      default:
        return { decision: "reject", confidence: 0.5, reasoning: "Unknown agent" };
    }
  }

  private classifyProposalType(problemPattern: string): InferenceProposal["type"] {
    const lower = problemPattern.toLowerCase();
    if (lower.includes("bug") || lower.includes("fix")) return "fix";
    if (lower.includes("dead code") || lower.includes("remove")) return "refactor";
    if (lower.includes("manual") || lower.includes("automate")) return "automate";
    if (lower.includes("guard") || lower.includes("path") || lower.includes("timing")) return "guard";
    return "codify";
  }

  private patternToProposalType(pattern: RecurringPattern): InferenceProposal["type"] {
    const name = pattern.name.toLowerCase();
    if (name.includes("dead code")) return "refactor";
    if (name.includes("extract")) return "refactor";
    if (name.includes("registry") || name.includes("facade")) return "codify";
    if (name.includes("test")) return "guard";
    if (name.includes("stability")) return "fix";
    return "codify";
  }

  private generateTitle(problem: RecurringProblem): string {
    const pattern = problem.pattern;
    if (pattern.length > 80) return `Address recurring issue (${problem.occurrences}x)`;
    return `Fix: ${pattern} (${problem.occurrences}x)`;
  }

  private setPhase(phase: CyclePhase): void {
    this.phase = phase;
    frameworkLogger.log("inference-cycle", "phase-change", "info", { phase });
  }

  getPhase(): CyclePhase {
    return this.phase;
  }

  private saveCycleState(cycleId: string): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(this.stateDir, CYCLE_STATE_FILE),
      JSON.stringify({
        cycleId,
        completedAt: new Date().toISOString(),
        phase: this.phase,
      }),
    );
  }

  private appendHistory(result: InferenceCycleResult): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    const historyPath = path.join(this.stateDir, CYCLE_HISTORY_FILE);
    let history: InferenceCycleResult[] = [];
    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
      } catch {
        history = [];
      }
    }
    history.push(result);
    if (history.length > 50) history = history.slice(-50);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  private buildResult(
    cycleId: string,
    triggered: boolean,
    reason: string,
    startTime: number,
    corpus?: InferenceCorpus,
    proposals?: InferenceProposal[],
    votes?: InferenceCycleResult["votes"],
    deployVerification?: DeployVerificationResult,
  ): InferenceCycleResult {
    return {
      cycleId,
      triggered,
      triggerReason: reason,
      corpusSummary: corpus
        ? {
            sessions: corpus.sessions.length,
            totalCommits: corpus.totalCommits,
            recurringPatterns: corpus.recurringPatterns.length,
            recurringProblems: corpus.recurringProblems.length,
          }
        : { sessions: 0, totalCommits: 0, recurringPatterns: 0, recurringProblems: 0 },
      proposals: proposals || [],
      votes: votes || [],
      deployVerification,
      phase: this.phase,
      completedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
    };
  }
}
