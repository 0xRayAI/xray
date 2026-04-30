import * as fs from "fs";
import * as path from "path";
import { execSync, spawn } from "child_process";
import { shouldTriggerCycle, accumulateCorpus } from "./inference-accumulator.js";
import { DeployVerifier } from "./deploy-verifier.js";
import { VotingCoordinator } from "../delegation/voting-coordinator.js";
import { StringRayStateManager } from "../state/state-manager.js";
import { frameworkLogger } from "../core/framework-logger.js";
const CYCLE_STATE_FILE = "inference-cycle-state.json";
const CYCLE_HISTORY_FILE = "inference-cycle-history.json";
const GOVERNANCE_AGENTS = ["code-reviewer", "architect"];
export class InferenceCycle {
    inferenceDir;
    stateDir;
    projectRoot;
    phase = "idle";
    opencodeAvailable = null;
    agentInvoker;
    options;
    constructor(projectRoot, agentInvoker, options) {
        this.projectRoot = projectRoot || process.cwd();
        this.inferenceDir = path.join(this.projectRoot, "docs", "inference");
        this.stateDir = path.join(this.projectRoot, ".strray", "inference");
        this.agentInvoker = agentInvoker ?? null;
        this.options = options ?? {};
    }
    async maybeRunCycle() {
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
        this.adjustFromHistory(proposals);
        if (proposals.length === 0) {
            this.setPhase("complete");
            return this.buildResult(cycleId, true, threshold.reason, startTime, corpus, proposals);
        }
        this.setPhase("governing");
        const votes = await this.governProposals(proposals);
        const approved = proposals.filter((p) => votes.find((v) => v.proposalId === p.id && v.decision === "approve"));
        for (const p of approved) {
            p.status = "approved";
        }
        for (const p of proposals.filter((p) => p.status !== "approved")) {
            p.status = "rejected";
        }
        if (approved.length > 0) {
            let deployResult;
            if (!this.options.skipDeployVerify) {
                this.setPhase("deploying");
                const verifier = new DeployVerifier(this.projectRoot);
                deployResult = verifier.quickVerify();
                this.setPhase("verifying");
                if (deployResult.success) {
                    for (const p of approved) {
                        p.status = "applied";
                    }
                }
                else {
                    for (const p of approved) {
                        p.status = "failed";
                    }
                }
            }
            else {
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
    }
    generateProposals(corpus) {
        const proposals = [];
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
            if (pattern.occurrences < 2)
                continue;
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
        return proposals.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    }
    adjustFromHistory(proposals) {
        this.adjustConfidenceFromHistory(proposals);
        proposals.sort((a, b) => b.confidence - a.confidence);
    }
    async governProposals(proposals) {
        const stateManager = new StringRayStateManager();
        const coordinator = new VotingCoordinator(stateManager);
        const sessionId = `inference-governance-${Date.now()}`;
        const results = [];
        for (const proposal of proposals) {
            const voteId = await coordinator.initiateVoting(sessionId, proposal.title, proposal.description, GOVERNANCE_AGENTS, {
                complexity: 25,
                riskLevel: proposal.type === "fix" ? "low" : "medium",
                hasSecurityConcerns: false,
                hasArchitecturalImpact: proposal.type === "codify",
                participantCount: GOVERNANCE_AGENTS.length,
            });
            for (const agentName of GOVERNANCE_AGENTS) {
                const agentVote = await this.getAgentVote(agentName, proposal);
                coordinator.submitVote(voteId, agentName, agentVote.decision, agentVote.confidence, agentVote.reasoning);
            }
            const resolved = coordinator.resolveVoting(voteId);
            if (resolved) {
                results.push({
                    proposalId: proposal.id,
                    decision: resolved.decision === "approve" ? "approve" : "reject",
                    confidence: resolved.confidence,
                    details: resolved.details?.map((d) => `${d.agentName}: vote=${d.vote}, weight=${d.weight.toFixed(2)}`) || [],
                });
            }
            else {
                results.push(this.heuristicFallbackVote(proposal));
            }
        }
        return results;
    }
    async getAgentVote(agentName, proposal) {
        const prompt = [
            `Review this inference proposal from 0xRay's self-improvement cycle.`,
            ``,
            `Title: ${proposal.title}`,
            `Type: ${proposal.type}`,
            `Source: ${proposal.source}`,
            `Confidence: ${(proposal.confidence * 100).toFixed(0)}%`,
            `Evidence: ${proposal.evidence.join("; ")}`,
            `Description: ${proposal.description}`,
            ``,
            `Cast your vote. Respond with exactly this format:`,
            `DECISION: approve|reject`,
            `CONFIDENCE: 0.XX`,
            `REASONING: <one sentence>`,
        ].join("\n");
        try {
            const response = await this.invokeAgent(agentName, prompt);
            return this.parseAgentResponse(response, proposal);
        }
        catch (error) {
            frameworkLogger.log("inference-cycle", "agent-invocation-fallback", "info", {
                agent: agentName,
                error: String(error),
            });
            return {
                decision: proposal.confidence >= 0.7 ? "approve" : "reject",
                confidence: proposal.confidence * 0.8,
                reasoning: `fallback: opencode unavailable for ${agentName}`,
            };
        }
    }
    async invokeAgent(agentName, prompt) {
        if (this.agentInvoker) {
            return this.agentInvoker(agentName, prompt);
        }
        if (this.opencodeAvailable === null) {
            try {
                execSync("which opencode", { stdio: "pipe", timeout: 3000 });
                this.opencodeAvailable = true;
            }
            catch {
                this.opencodeAvailable = false;
                frameworkLogger.log("inference-cycle", "opencode-not-found", "info", {
                    message: "opencode CLI not found — governance will use heuristic fallback",
                });
            }
        }
        if (!this.opencodeAvailable) {
            throw new Error("opencode CLI not available");
        }
        return new Promise((resolve, reject) => {
            let settled = false;
            const child = spawn("opencode", ["run", "-", "--agent", agentName], {
                cwd: this.projectRoot,
                env: {
                    ...process.env,
                    NODE_ENV: "production",
                    OPENCODE_MCP_CONFIG: "./node_modules/strray-ai/opencode.json",
                },
                stdio: ["pipe", "pipe", "pipe"],
            });
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    child.kill("SIGTERM");
                    reject(new Error(`opencode --agent ${agentName} timed out`));
                }
            }, 30000);
            child.stdin?.write(prompt);
            child.stdin?.end();
            let stdout = "";
            let stderr = "";
            child.stdout?.on("data", (data) => { stdout += data.toString(); });
            child.stderr?.on("data", (data) => { stderr += data.toString(); });
            child.on("close", (code) => {
                clearTimeout(timer);
                if (settled)
                    return;
                settled = true;
                if (code === 0 && stdout.trim()) {
                    resolve(stdout.trim());
                }
                else {
                    reject(new Error(`opencode --agent ${agentName} exited ${code}: ${stderr.substring(0, 200)}`));
                }
            });
            child.on("error", (err) => {
                clearTimeout(timer);
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            });
        });
    }
    parseAgentResponse(response, proposal) {
        const lower = response.toLowerCase();
        const decision = lower.includes("approve") || lower.includes("accept")
            ? "approve"
            : lower.includes("reject") || lower.includes("deny")
                ? "reject"
                : proposal.confidence >= 0.7 ? "approve" : "reject";
        const confMatch = response.match(/confidence[:\s]*(0?\.\d+|1\.0|1|0)/i);
        const confidence = confMatch ? Math.min(1, Math.max(0, parseFloat(confMatch[1]))) : proposal.confidence;
        const reasonMatch = response.match(/reasoning[:\s]*(.+)/i);
        const reasoning = reasonMatch ? reasonMatch[1].trim() : response.substring(0, 200);
        return { decision, confidence, reasoning };
    }
    heuristicFallbackVote(proposal) {
        const evidenceCount = proposal.evidence.length;
        const conf = proposal.confidence * (0.8 + Math.min(evidenceCount * 0.05, 0.15));
        const decision = conf >= 0.5 ? "approve" : "reject";
        return {
            proposalId: proposal.id,
            decision,
            confidence: conf,
            details: ["fallback: heuristic (opencode unavailable)"],
        };
    }
    classifyProposalType(problemPattern) {
        const lower = problemPattern.toLowerCase();
        if (lower.includes("bug") || lower.includes("fix") || lower.includes("stability"))
            return "fix";
        if (lower.includes("dead code") || lower.includes("remove") || lower.includes("health"))
            return "refactor";
        if (lower.includes("manual") || lower.includes("automate"))
            return "automate";
        if (lower.includes("guard") || lower.includes("path") || lower.includes("timing") || lower.includes("edge case"))
            return "guard";
        return "codify";
    }
    patternToProposalType(pattern) {
        const name = pattern.name.toLowerCase();
        if (name.includes("dead code"))
            return "refactor";
        if (name.includes("extract"))
            return "refactor";
        if (name.includes("registry") || name.includes("facade"))
            return "codify";
        if (name.includes("test"))
            return "guard";
        if (name.includes("stability"))
            return "fix";
        return "codify";
    }
    generateTitle(problem) {
        const pattern = problem.pattern;
        const ACTION_MAP = [
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
        if (pattern.length > 60) {
            return `Address recurring issue: ${pattern.substring(0, 50)}... (${problem.occurrences}x)`;
        }
        return `Address: ${pattern} (${problem.occurrences}x)`;
    }
    setPhase(phase) {
        this.phase = phase;
        frameworkLogger.log("inference-cycle", "phase-change", "info", { phase });
    }
    getPhase() {
        return this.phase;
    }
    saveCycleState(cycleId) {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
        fs.writeFileSync(path.join(this.stateDir, CYCLE_STATE_FILE), JSON.stringify({
            cycleId,
            completedAt: new Date().toISOString(),
            phase: this.phase,
        }));
    }
    appendHistory(result) {
        if (!fs.existsSync(this.stateDir)) {
            fs.mkdirSync(this.stateDir, { recursive: true });
        }
        const historyPath = path.join(this.stateDir, CYCLE_HISTORY_FILE);
        let history = [];
        if (fs.existsSync(historyPath)) {
            try {
                history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
            }
            catch {
                history = [];
            }
        }
        history.push(result);
        if (history.length > 50)
            history = history.slice(-50);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }
    loadHistory() {
        const historyPath = path.join(this.stateDir, CYCLE_HISTORY_FILE);
        if (!fs.existsSync(historyPath))
            return [];
        try {
            return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
        }
        catch {
            return [];
        }
    }
    adjustConfidenceFromHistory(proposals) {
        const history = this.loadHistory();
        if (history.length === 0)
            return;
        const recentVotes = history.slice(-10).flatMap((h) => h.votes);
        const approvedIds = new Set(recentVotes.filter((v) => v.decision === "approve").map((v) => v.proposalId));
        const approvedTypes = new Map();
        const rejectedTypes = new Map();
        for (const h of history.slice(-10)) {
            for (const p of h.proposals) {
                if (p.status === "approved" || p.status === "applied") {
                    approvedTypes.set(p.type, (approvedTypes.get(p.type) ?? 0) + 1);
                }
                else if (p.status === "rejected" || p.status === "failed") {
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
                }
                else if (successRate > 0.7) {
                    proposal.confidence = Math.min(0.95, proposal.confidence * 1.05);
                }
            }
        }
    }
    buildResult(cycleId, triggered, reason, startTime, corpus, proposals, votes, deployVerification) {
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
//# sourceMappingURL=inference-cycle.js.map