import * as fs from "fs";
import * as path from "path";
import { shouldTriggerCycle, accumulateCorpus, InferenceCorpus, RecurringPattern, RecurringProblem } from "./inference-accumulator.js";
import { DeployVerifier, DeployVerificationResult } from "./deploy-verifier.js";
import { XrayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";
import { invokeViaOpencode as invokeOpencodeFromEngine } from "../execution/opencode-cli-invoker.js";
import { ProposalApplier } from "../execution/proposal-applier.js";
import { handleGovernRequest } from "../nucleus/govern-http.js";
import type { GovernanceRequest, GovernanceResponse } from "../governance/governance-types.js";

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

const CONSOLIDATED_STATE_FILE = "inference-state.json";
export type AgentInvoker = (agentName: string, prompt: string) => Promise<string>;

export interface InferenceCycleOptions {
  skipDeployVerify?: boolean;
  skipApply?: boolean;
  skipResearcherReview?: boolean;
  force?: boolean;
}

export class InferenceCycle {
  // Singleton registry + state management to prevent recursive agent spawning
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
    // GATE: prevent re-entry — same as maybeRunCycle
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

      // Track governed proposals for dedup across cycles
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
    // GATE: prevent recursive re-entry while a cycle is in progress
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

      const lastCycleFile = path.join(this.stateDir, CONSOLIDATED_STATE_FILE);
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
      const proposals = this.generateProposals(corpus);
      this.adjustFromHistory(proposals);

      if (proposals.length === 0) {
        this.setPhase("complete");
        return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals);
      }

      this.setPhase("governing");
      const votes = await this.governProposals(proposals);

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
          await this.applyProposals(approved);
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

  private generateProposals(corpus: InferenceCorpus): InferenceProposal[] {
    const proposals: InferenceProposal[] = [];

    for (const problem of corpus.recurringProblems) {
      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type: this.classifyProposalType(problem.pattern),
        title: this.generateTitle(problem),
        description: `Recurring across ${problem.occurrences} sessions: ${problem.pattern}`,
        evidence: problem.sessions.map((s) => `Seen in session ${s}`),
        confidence: Math.min(0.95, 0.5 + problem.occurrences * 0.15),
        source: "recurring_problem",
        status: "pending",
      });
    }

    const seenPatterns = new Set(corpus.recurringProblems.map((p) => p.pattern));
    const allProblems = corpus.sessions.flatMap((s) =>
      s.problems.map((p) => ({ problem: p, session: s.sessionId })),
    );
    for (const { problem, session } of allProblems) {
      const normalized = problem.replace(/\([a-f0-9]{7}\)/g, "").trim();
      if (seenPatterns.has(normalized)) continue;
      if (proposals.length >= 5) break;

      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type: this.classifyProposalType(problem),
        title: `Investigate: ${problem.substring(0, 80)}`,
        description: `Observed in session ${session}: ${problem}`,
        evidence: [problem],
        confidence: 0.4,
        source: "recurring_problem",
        status: "pending",
      });
      seenPatterns.add(normalized);
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

    const wrongTurns = corpus.allWrongTurns.slice(0, 2);
    for (const wt of wrongTurns) {
      const summary = wt.length > 50 ? `${wt.substring(0, 47)}...` : wt;
      proposals.push({
        id: `prop-${Date.now()}-${proposals.length}`,
        type: "guard",
        title: `Guard against: ${summary}`,
        description: `Recurring wrong turn detected: ${wt}. Add a guard or validation to prevent this pattern.`,
        evidence: [wt],
        confidence: 0.7,
        source: "wrong_turn",
        status: "pending",
      });
    }

    return proposals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private adjustFromHistory(proposals: InferenceProposal[]): void {
    this.adjustConfidenceFromHistory(proposals);
    proposals.sort((a, b) => b.confidence - a.confidence);
  }

  private async applyProposals(proposals: InferenceProposal[]): Promise<void> {
    const applier = new ProposalApplier(this.projectRoot);
    const results = await applier.applyProposals(proposals);
    for (const r of results) {
      const p = proposals.find(pr => pr.id === r.proposalId);
      if (p) p.status = r.success ? "applied" : "failed";
    }
  }

  private async applyProposalWork(p: InferenceProposal): Promise<boolean> {
    let filesChanged = false;

    if (p.type === "fix" || p.type === "refactor") {
      filesChanged = await this.applyCodeChange(p);
    } else if (p.type === "guard") {
      filesChanged = await this.applyGuard(p);
    } else if (p.type === "automate") {
      filesChanged = await this.applyAutomation(p);
    }

    return filesChanged;
  }

  private async applyCodeChange(p: InferenceProposal): Promise<boolean> {
    const targetFiles = this.extractTargetFiles(p.evidence);

    const prompt = [
      `Apply approved inference proposal`,
      ``,
      `Type: ${p.type}`,
      `Title: ${p.title}`,
      `Description: ${p.description}`,
      targetFiles.length > 0 ? `Target files: ${targetFiles.join(", ")}` : "No specific target files identified",
      `Evidence: ${p.evidence.slice(0, 5).join("; ")}`,
      `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
      ``,
      `1. Read the relevant source files`,
      `2. Apply the ${p.type} described above`,
      `3. Make minimal, surgical changes`,
      `4. If the change is unsafe or unclear, skip and explain`,
    ].join("\n");

    frameworkLogger.log("inference-cycle", "apply-invoking-agent", "info", {
      proposalId: p.id,
      proposalType: p.type,
      targetFiles,
    });

    try {
      const agentName = p.type === "refactor" ? "refactorer" : "code-reviewer";

      await invokeOpencodeFromEngine(agentName, prompt, this.projectRoot);
      return true;
    } catch (err) {
      frameworkLogger.log("inference-cycle", "apply-agent-failed", "warning", {
        proposalId: p.id,
        error: String(err),
      });
      return false;
    }
  }

  private async applyGuard(p: InferenceProposal): Promise<boolean> {
    const prompt = [
      `Add guard/validation for the following issue:`,
      ``,
      `Title: ${p.title}`,
      `Description: ${p.description}`,
      `Evidence: ${p.evidence.join("; ")}`,
      `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
      ``,
      `1. Read the relevant source files`,
      `2. Add the missing guard, validation, or edge case handling`,
       `3. If this is a codex rule, add the term to xray/codex.json`,
      `4. Make minimal, surgical changes`,
    ].join("\n");

    try {
      await invokeOpencodeFromEngine("code-reviewer", prompt, this.projectRoot);
      return true;
    } catch (err) {
      frameworkLogger.log("inference-cycle", "apply-guard-failed", "warning", {
        proposalId: p.id,
        error: String(err),
      });
      const guardPath = path.join(this.projectRoot, "docs", "guards", `${p.title.replace(/[^a-z0-9]/gi, "-")}.md`);
      fs.mkdirSync(path.dirname(guardPath), { recursive: true });
      fs.writeFileSync(guardPath, `# Guard: ${p.title}\n\n${p.description}\n\n## Evidence\n${p.evidence.join("\n")}`);
      return true;
    }
  }

  private async applyAutomation(p: InferenceProposal): Promise<boolean> {
    const prompt = [
      `Design automation for the following manual process:`,
      ``,
      `Title: ${p.title}`,
      `Description: ${p.description}`,
      `Evidence: ${p.evidence.join("; ")}`,
      `Confidence: ${(p.confidence * 100).toFixed(0)}%`,
      ``,
      `1. Read the relevant source files`,
      `2. Design the automation (script, processor, or config change)`,
      `3. Implement it if straightforward, otherwise describe the design`,
    ].join("\n");

    try {
      await invokeOpencodeFromEngine("architect", prompt, this.projectRoot);
      return true;
    } catch (err) {
      frameworkLogger.log("inference-cycle", "apply-automation-failed", "warning", {
        proposalId: p.id,
        error: String(err),
      });
      const automationPath = path.join(this.projectRoot, "docs", "automation-proposals.md");
      const entry = `\n## ${p.title}\n\n${p.description}\n\n**Evidence:** ${p.evidence.join(", ")}\n`;
      fs.mkdirSync(path.dirname(automationPath), { recursive: true });
      fs.appendFileSync(automationPath, entry);
      return true;
    }
  }

  private extractTargetFiles(evidence: string[]): string[] {
    const filePattern = /[a-zA-Z0-9/_-]+\.(ts|js|mjs|json|yml|yaml)/g;
    const files = new Set<string>();

    for (const item of evidence) {
      const matches = item.matchAll(filePattern);
      for (const match of matches) {
        const f = match[0];
        if (f.startsWith("src/") || f.startsWith("dist/") || f.startsWith(".opencode/")) {
          files.add(f);
        }
      }
    }

    return [...files];
  }

  private async researcherReview(p: InferenceProposal, prUrl: string): Promise<"go" | "no-go" | "modify"> {
    const prompt = `You are a researcher agent reviewing a PR for proposal: "${p.title}".

PR URL: ${prUrl}

Proposal Type: ${p.type}
Description: ${p.description}
Evidence: ${p.evidence.slice(0, 5).join("; ")}

Your job: Review the actual codebase to verify this proposal makes sense. Search the code to confirm:
1. Does the problem described actually exist in the codebase?
2. Is the proposed solution appropriate?
3. Are there any missed edge cases?

Respond with EXACTLY one of:
- GO (proposal is valid, approve)
- NO-GO (proposal is invalid, reject)
- MODIFY: <specific changes needed>`;

    try {
      const result = await invokeOpencodeFromEngine("researcher", prompt, this.projectRoot);

      const output = result.toLowerCase();
      if (output.includes("no-go")) return "no-go";
      if (output.includes("modify")) return "modify";
      return "go";
    } catch (err) {
      frameworkLogger.log("inference-cycle", "researcher-review-failed", "warning", { error: String(err) });
      return "go";
    }
  }

  private async governProposals(proposals: InferenceProposal[]): Promise<InferenceCycleResult["votes"]> {
    const governanceResponse = await this.governViaNucleus(proposals);

    frameworkLogger.log("inference-cycle", "governance-nucleus-success", "info", {
      proposalCount: proposals.length,
      overall: governanceResponse.overallDecision,
    });

    return this.convertNucleusResponse(governanceResponse, proposals);
  }

  /**
   * Map InferenceProposal.source to GovernanceProposal.source.
   * Inference-specific sources (recurring_problem, recurring_pattern, wrong_turn)
   * all normalize to 'inference'. Future tuning/mod-specific sources can be added here.
   */
  private static readonly SOURCE_MAP: Record<string, GovernanceRequest['proposals'][0]['source']> = {
    'recurring_problem': 'inference',
    'recurring_pattern': 'inference',
    'wrong_turn': 'inference',
  };

  /**
   * Convert InferenceProposal[] to GovernanceRequest and route through
   * the nucleus kernel (handleGovernRequest). This is the v3 uniform path.
   */
  private async governViaNucleus(proposals: InferenceProposal[]): Promise<GovernanceResponse> {
    const governanceRequest: GovernanceRequest = {
      proposals: proposals.map(p => ({
        id: p.id,
        type: p.type as GovernanceRequest['proposals'][0]['type'],
        title: p.title,
        description: p.description,
        evidence: p.evidence,
        source: InferenceCycle.SOURCE_MAP[p.source] || 'inference',
        confidence: p.confidence,
      })),
      context: {
        project: 'xray',
        phase: 'inference-cycle',
        source: 'inference-cycle',
      },
      options: {
        requireExternalDynamo: !process.env.XRAY_LOCAL_MODE,
      },
    };

    return handleGovernRequest(governanceRequest);
  }

  /**
   * Convert a GovernanceResponse (nucleus kernel format) back to the
   * InferenceCycleResult["votes"] format that the rest of the cycle expects.
   */
  private convertNucleusResponse(
    response: GovernanceResponse,
    proposals: InferenceProposal[],
  ): InferenceCycleResult["votes"] {
    return proposals.map((p, i) => {
      const result = response.results[i];
      if (!result) {
        return {
          proposalId: p.id,
          decision: 'reject' as const,
          confidence: 0,
          details: ['nucleus: no result returned'],
        };
      }

      const decision = result.finalDecision === 'approve' ? 'approve' : result.finalDecision === 'reject' ? 'reject' : 'abstain';
      return {
        proposalId: p.id,
        decision,
        confidence: result.averageConfidence,
        details: result.votes?.map((v: any) => `${v.server || v.agentName || 'agent'}: ${v.decision} (${v.confidence})`) || [result.reasoningSummary],
      };
    });
  }

  private getGovernanceStateManager(): XrayStateManager {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    const statePath = path.join(this.stateDir, CONSOLIDATED_STATE_FILE);
    const stateManager = new XrayStateManager();
    if (fs.existsSync(statePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        if (data.governanceState) {
          for (const [key, value] of Object.entries(data.governanceState)) {
            stateManager.set(key, value);
          }
        }
      } catch {
        frameworkLogger.log("inference-cycle", "governance-state-load-failed", "warning", {});
      }
    }
    return stateManager;
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

  private rejectNoQuorum(proposal: InferenceProposal, reason: string): InferenceCycleResult["votes"][0] {
    return {
      proposalId: proposal.id,
      decision: "reject",
      confidence: 0,
      details: [`rejected: ${reason}`],
    };
  }

  private classifyProposalType(problemPattern: string): InferenceProposal["type"] {
    const lower = problemPattern.toLowerCase();
    if (lower.includes("bug") || lower.includes("fix") || lower.includes("stability")) return "fix";
    if (lower.includes("dead code") || lower.includes("remove") || lower.includes("health")) return "refactor";
    if (lower.includes("manual") || lower.includes("automate")) return "automate";
    if (lower.includes("guard") || lower.includes("path") || lower.includes("timing") || lower.includes("edge case")) return "guard";
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

    const ACTION_MAP: [RegExp, string][] = [
      [/^Bug fix$/i, "Fix recurring bug pattern"],
      [/^Code health cleanup$/i, "Clean up code health issues"],
      [/^Accumulated dead code$/i, "Remove accumulated dead code"],
      [/^Incomplete implementation$/i, "Complete partial implementation"],
      [/^Technical debt/i, "Address technical debt"],
      [/^Missing guard/i, "Add missing guard"],
      [/^Manual step/i, "Automate manual step"],
    ];

    for (const [re, title] of ACTION_MAP) {
      if (re.test(pattern)) {
        return `${title} (${problem.occurrences}x across ${problem.sessions.length} sessions)`;
      }
    }

    if (pattern.length > 80) {
      return `Address: ${pattern.substring(0, 77)}... (${problem.occurrences}x)`;
    }

    return `Address: ${pattern} (${problem.occurrences}x)`;
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
    const statePath = path.join(this.stateDir, CONSOLIDATED_STATE_FILE);
    const existing = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf-8")) : {};
    existing.cycleState = {
      cycleId,
      completedAt: new Date().toISOString(),
      phase: this.phase,
    };
    fs.writeFileSync(statePath, JSON.stringify(existing, null, 2));
  }

  private appendHistory(result: InferenceCycleResult): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    const statePath = path.join(this.stateDir, CONSOLIDATED_STATE_FILE);
    const existing = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf-8")) : {};
    let history: InferenceCycleResult[] = existing.history || [];
    history.push(result);
    if (history.length > 50) history = history.slice(-50);
    existing.history = history;
    fs.writeFileSync(statePath, JSON.stringify(existing, null, 2));
  }

  private loadHistory(): InferenceCycleResult[] {
    const statePath = path.join(this.stateDir, CONSOLIDATED_STATE_FILE);
    if (!fs.existsSync(statePath)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      return data.history || [];
    } catch {
      return [];
    }
  }

  private adjustConfidenceFromHistory(proposals: InferenceProposal[]): void {
    const history = this.loadHistory();
    if (history.length === 0) return;

    const recentVotes = history.slice(-10).flatMap((h) => h.votes);
    const approvedIds = new Set(
      recentVotes.filter((v) => v.decision === "approve").map((v) => v.proposalId),
    );

    const approvedTypes = new Map<string, number>();
    const rejectedTypes = new Map<string, number>();

    for (const h of history.slice(-10)) {
      for (const p of h.proposals) {
        if (p.status === "approved" || p.status === "applied") {
          approvedTypes.set(p.type, (approvedTypes.get(p.type) ?? 0) + 1);
        } else if (p.status === "rejected" || p.status === "failed") {
          rejectedTypes.set(p.type, (rejectedTypes.get(p.type) ?? 0) + 1);
        }
      }
    }

    for (const proposal of proposals) {
      const approved = approvedTypes.get(proposal.type) ?? 0;
      const rejected = rejectedTypes.get(proposal.type) ?? 0;
      const total = approved + rejected;
      if (total >= 3) {
        const successRate = approved / total;
        if (successRate < 0.3) {
          proposal.confidence *= 0.8;
        } else if (successRate > 0.7) {
          proposal.confidence = Math.min(0.95, proposal.confidence * 1.05);
        }
      }
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
