import { DeployVerificationResult } from "./deploy-verifier.js";
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
export type CyclePhase = "idle" | "collecting" | "proposing" | "governing" | "deploying" | "verifying" | "complete" | "failed";
export type AgentInvoker = (agentName: string, prompt: string) => Promise<string>;
export interface InferenceCycleOptions {
    skipDeployVerify?: boolean;
}
export declare class InferenceCycle {
    private inferenceDir;
    private stateDir;
    private projectRoot;
    private phase;
    private opencodeAvailable;
    private agentInvoker;
    private options;
    constructor(projectRoot?: string, agentInvoker?: AgentInvoker, options?: InferenceCycleOptions);
    maybeRunCycle(): Promise<InferenceCycleResult>;
    private generateProposals;
    private adjustFromHistory;
    private governProposals;
    private getAgentVote;
    private invokeAgent;
    private parseAgentResponse;
    private heuristicFallbackVote;
    private classifyProposalType;
    private patternToProposalType;
    private generateTitle;
    private setPhase;
    getPhase(): CyclePhase;
    private saveCycleState;
    private appendHistory;
    private loadHistory;
    private adjustConfidenceFromHistory;
    private buildResult;
}
//# sourceMappingURL=inference-cycle.d.ts.map