import * as fs from "fs";
import * as path from "path";
import { shouldTriggerCycle, accumulateCorpus, InferenceCorpus } from "./inference-accumulator.js";
import { DeployVerifier, DeployVerificationResult } from "./deploy-verifier.js";
import { frameworkLogger } from "../core/framework-logger.js";
import { featuresConfigLoader } from "../core/features-config.js";
import { mcpClientManager } from "../mcps/mcp-client.js";
import { getConfigDir } from "../core/config-paths.js";
import { generateProposals } from "./inference-proposal-generator.js";
import { applyProposals as applyProposalsEx } from "./inference-applier.js";

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
  | "applying"
  | "deploying"
  | "verifying"
  | "complete"
  | "failed";

const CYCLE_STATE_FILE = "inference-cycle-state.json";
const CYCLE_HISTORY_FILE = "inference-cycle-history.json";

export type AgentInvoker = (agentName: string, prompt: string) => Promise<string>;

export interface InferenceCycleOptions {
  skipDeployVerify?: boolean;
  skipApply?: boolean;
  skipResearcherReview?: boolean;
  force?: boolean;
}

export class InferenceCycle {
  private static instances = new Map<string, InferenceCycle>();
  private static reEntryLock = false;
  private static governedProposalIds = new Set<string>();

  static getInstance(projectRoot?: string, options?: InferenceCycleOptions): InferenceCycle {
    const root = path.resolve(projectRoot || process.cwd());
    if (!InferenceCycle.instances.has(root)) {
      InferenceCycle.instances.set(root, new InferenceCycle(root, undefined, options));
    }
    return InferenceCycle.instances.get(root)!;
  }

  static resetInstance(): void {
    InferenceCycle.instances.clear();
    InferenceCycle.reEntryLock = false;
    InferenceCycle.governedProposalIds.clear();
  }

  private inferenceDir: string;
  private stateDir: string;
  private projectRoot: string;
  private phase: CyclePhase = "idle";
  private opencodeAvailable: boolean | null = null;
  private agentInvoker: AgentInvoker | null;
  private options: InferenceCycleOptions;

  constructor(projectRoot?: string, agentInvoker?: AgentInvoker, options?: InferenceCycleOptions) {
    this.projectRoot = projectRoot || process.cwd();
    this.inferenceDir = path.join(this.projectRoot, "docs", "inference");
    this.stateDir = path.join(this.projectRoot, ".xray", "inference");
    this.agentInvoker = agentInvoker ?? null;
    this.options = options ?? {};
  }

  async governExternalProposals(proposals: InferenceProposal[]): Promise<InferenceCycleResult> {
    if (InferenceCycle.reEntryLock) {
      const blockedId = `blocked-${Date.now()}`;
      frameworkLogger.log("inference-cycle", "external-re-entry-blocked", "warning", {});
      return this.buildBlockedResult(blockedId, "Cycle in progress — external governance blocked");
    }
    InferenceCycle.reEntryLock = true;

    const startTime = Date.now();
    const cycleId = `external-${Date.now()}`;

    try {
      frameworkLogger.log("inference-cycle", "external-governance-start", "info", {
        cycleId,
        proposalCount: proposals.length,
      });

      this.setPhase("governing");
      let votes: InferenceCycleResult["votes"] = [];
      try {
        votes = await this.governProposals(proposals);
      } catch (e) {
        frameworkLogger.log("inference-cycle", "govern-proposals-error", "error", {
          error: (e as Error).message,
          stack: (e as Error).stack?.substring(0, 500),
        });
        for (const proposal of proposals) {
          votes.push({
            proposalId: proposal.id,
            decision: "reject",
            confidence: 0,
            details: [`rejected: external governance error: ${(e as Error).message}`],
          });
        }
      }

      const approved = proposals.filter(
        (p) => votes.find((v) => v.proposalId === p.id && v.decision === "approve"),
      );
      for (const p of approved) p.status = "approved";
      for (const p of proposals.filter((p) => p.status !== "approved")) p.status = "rejected";

      for (const p of proposals) InferenceCycle.governedProposalIds.add(p.id);

      this.setPhase("complete");
      this.saveCycleState(cycleId);

      const result = this.buildResult(cycleId, true, "external proposals", startTime, undefined, proposals, votes);
      this.appendHistory(result);

      frameworkLogger.log("inference-cycle", "external-governance-complete", "info", {
        cycleId,
        approved: approved.length,
        rejected: proposals.length - approved.length,
      });

      return result;
    } finally {
      InferenceCycle.reEntryLock = false;
    }
  }

  async maybeRunCycle(): Promise<InferenceCycleResult> {
    if (InferenceCycle.reEntryLock) {
      const blockedId = `blocked-${Date.now()}`;
      frameworkLogger.log("inference-cycle", "re-entry-blocked", "warning", {});
      return this.buildBlockedResult(blockedId, "Cycle already in progress — re-entry blocked");
    }
    InferenceCycle.reEntryLock = true;

    const startTime = Date.now();
    const cycleId = `cycle-${Date.now()}`;

    try {
      this.setPhase("collecting");

      const lastCycleFile = path.join(this.stateDir, CYCLE_STATE_FILE);
      const threshold = this.options.force ? { trigger: true, reason: "force flag set" } : shouldTriggerCycle(this.inferenceDir, lastCycleFile);

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
      const proposals = generateProposals(corpus, this.loadHistory());

      if (proposals.length === 0) {
        this.setPhase("complete");
        return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals);
      }

      this.setPhase("governing");
      let votes: InferenceCycleResult["votes"] = [];
      try {
        votes = await this.governProposals(proposals);
      } catch (e) {
        frameworkLogger.log("inference-cycle", "govern-proposals-error", "error", {
          error: (e as Error).message,
          stack: (e as Error).stack?.substring(0, 500),
        });
        for (const proposal of proposals) {
          votes.push({
            proposalId: proposal.id,
            decision: "reject",
            confidence: 0,
            details: [`rejected: governance error: ${(e as Error).message}`],
          });
        }
      }

      // Track governed proposals for dedup across cycles
      for (const p of proposals) InferenceCycle.governedProposalIds.add(p.id);

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
        if (!this.options.skipApply) {
          this.setPhase("applying");
          await applyProposalsEx(approved, this.projectRoot, this.agentInvoker, this.options);
        }

        let deployResult: DeployVerificationResult | undefined;

        if (!this.options.skipDeployVerify) {
          this.setPhase("deploying");
          const verifier = new DeployVerifier(this.projectRoot);
          deployResult = verifier.quickVerify();

          this.setPhase("verifying");

          if (deployResult.success) {
            for (const p of approved) {
              p.status = "applied";
            }
          } else {
            const failureReasons = deployResult.checks
              .filter((c) => !c.passed)
              .map((c) => c.output)
              .join("; ");
            frameworkLogger.log("inference-cycle", "deploy-failed", "warning", {
              checks: deployResult.checks.map((c) => ({ name: c.name, passed: c.passed })),
              failureReasons,
            });
          }
        } else {
          for (const p of approved) {
            p.status = "approved";
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
    } finally {
      InferenceCycle.reEntryLock = false;
    }
  }

  private async governProposals(proposals: InferenceProposal[]): Promise<InferenceCycleResult["votes"]> {
    // Governance MCP is the sole governance path (governance.server.ts + GovernanceService).
    // It calls individual skill MCPs (code-review, security-audit, researcher) internally
    // and integrates with external Dynamo Solar SSOT.
    const useGovernanceMcp = process.env.XRAY_FORCE_MCP_GOVERNANCE === 'true' ||
      this.isGovernanceMcpPreferred();

    if (!useGovernanceMcp) {
      throw new Error("Governance MCP is required but not available");
    }

    const result = await Promise.race([
      mcpClientManager.callServerTool("governance", "govern_proposals", {
        proposals: proposals.map(p => ({
          id: p.id,
          type: p.type,
          title: p.title,
          description: p.description,
          evidence: p.evidence || [],
          source: p.source || "inference",
          confidence: p.confidence || 0.8,
        })),
        context: { source: "inference-cycle" },
        options: { require_external: true },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Governance MCP timed out after 8s")), 8000)
      ),
    ]);

    const text = (result as any)?.content?.[0]?.text || "";
    const parsed = this.parseGovernanceMcpResponse(text, proposals);
    frameworkLogger.log("inference-cycle", "governance-mcp-primary-path", "info", {
      proposalCount: proposals.length,
      overall: parsed.overallDecision,
    });
    return parsed.votes;
  }

  private isGovernanceMcpPreferred(): boolean {
    try {
      const config = featuresConfigLoader.loadConfig();
      const inferenceGov = (config as { inference_governance?: { enabled?: boolean } }).inference_governance;
      return inferenceGov?.enabled ?? true;
    } catch {
      return true;
    }
  }

  private parseGovernanceMcpResponse(text: string, proposals: InferenceProposal[]): {
    votes: InferenceCycleResult["votes"];
    overallDecision: string;
  } {
    // The governance MCP returns a GovernanceResponse JSON
    try {
      const data = JSON.parse(text);
      const results = data.results || [];
      const votes = proposals.map((p, i) => {
        const r = results[i] || {};
        return {
          proposalId: p.id,
          decision: (r.finalDecision === 'approve' ? 'approve' : r.finalDecision === 'reject' ? 'reject' : 'needs_revision') as any,
          confidence: r.averageConfidence || 0.75,
          details: (r.votes || []).map((v: any) => `${v.server}: ${v.decision} (${v.confidence})`),
        };
      });
      return { votes, overallDecision: data.overallDecision || "needs_revision" };
    } catch {
      frameworkLogger.log('inference-cycle', 'governance-mcp-parse-failed', 'warning', {
        textPreview: text.substring(0, 200),
        proposalCount: proposals.length,
      });
      const votes = proposals.map(p => ({
        proposalId: p.id,
        decision: "abstain" as any,
        confidence: 0.5,
        details: ["governance-mcp: parse-failed"],
      }));
      return { votes, overallDecision: "needs_revision" };
    }
  }

  private extractTextFromNdjson(output: string): string {
    const texts: string[] = [];
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        if (obj.type === "text" && obj.part?.text) {
          texts.push(obj.part.text);
        }
      } catch {
        // skip non-JSON lines
      }
    }
    return texts.join("\n").trim();
  }

  private resolveOpencodeRoot(): string {
    const configDir = getConfigDir(this.projectRoot);
    if (configDir.includes(".xray") || configDir.includes("xray")) {
      return path.dirname(configDir);
    }
    let dir = this.projectRoot;
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(dir, ".opencode"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, ".opencode"))) return cwd;
    return this.projectRoot;
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

  private loadHistory(): InferenceCycleResult[] {
    const historyPath = path.join(this.stateDir, CYCLE_HISTORY_FILE);
    if (!fs.existsSync(historyPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    } catch {
      return [];
    }
  }

  private buildBlockedResult(cycleId: string, reason: string): InferenceCycleResult {
    return {
      cycleId,
      triggered: false,
      triggerReason: reason,
      corpusSummary: { sessions: 0, totalCommits: 0, recurringPatterns: 0, recurringProblems: 0 },
      proposals: [],
      votes: [],
      phase: "idle",
      completedAt: new Date().toISOString(),
      duration: 0,
    };
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
