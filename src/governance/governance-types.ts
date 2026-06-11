/**
 * Core types for the 0xRay Governance System.
 * These types are used by the GovernanceService, Governance MCP,
 * and all integrations.
 */

export type ProposalType =
  | 'fix'
  | 'refactor'
  | 'guard'
  | 'automate'
  | 'codify'
  | 'strategic'
  | 'compliance'
  | 'metamorphosis';

export interface GovernanceProposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  evidence?: string[];
  source?: 'inference' | 'reflection' | 'manual' | 'ci' | 'phase-planning' | 'metamorphosis';
  confidence?: number; // 0-1
  metadata?: Record<string, unknown>;
  /** Freeform tags for Dynamo grouping/correlation (e.g. ["0xray"], ["my-project"]) */
  tags?: string[];
}

export interface GovernanceVote {
  server: string; // e.g. "code-review", "security-audit", "researcher", "external-dynamo"
  decision: 'approve' | 'reject' | 'abstain' | 'needs_revision';
  confidence: number; // 0-1
  reasoning: string;
  weight?: number; // for weighted voting
  moralTension?: 'Aligned' | 'Mild' | 'Significant' | 'Critical' | undefined;
  moralScore?: number | undefined;
  moralFusion?: number | undefined;
  detectedVirtues?: string[] | undefined;
  detectedConcerns?: string[] | undefined;
}

export interface GovernanceResult {
  proposalId: string;
  finalDecision: 'approve' | 'reject' | 'needs_revision' | 'abstain';
  averageConfidence: number;
  votes: GovernanceVote[];
  reasoningSummary: string;
  recommendedActions?: string[];
  externalContext?: Record<string, unknown>; // Solar activity, etc.
  moralOverride?: 'rejected_critical' | 'downgraded_significant' | 'none';
  /** Metamorphosis resonance score: does this change increase the system's ability to govern complex future states? 0-1. Only present when proposal.type === 'metamorphosis'. */
  metamorphosisScore?: number;
}

export interface GovernanceContext {
  project?: string;
  phase?: string;
  source?: string;
  reflectionId?: string;
  inferenceCycleId?: string;
  tags?: string[];
  onChain?: boolean;
}

export interface GovernOptions {
  requireExternalDynamo?: boolean; // default true
  minConfidence?: number;
  enableSolarAdjustment?: boolean;
  timeoutMs?: number; // end-to-end timeout for govern() in ms (default: 90000)
  maxAbstentionThreshold?: number; // fail if abstention ratio exceeds this (default: 1.0 = disabled)
  metamorphosisThreshold?: number; // minimum metamorphosisScore for self-evolution proposals (default: 0.7)
}

export interface GovernanceRequest {
  proposals: GovernanceProposal[];
  context?: GovernanceContext;
  options?: GovernOptions;
}

export interface GovernanceResponse {
  results: GovernanceResult[];
  overallDecision: 'approve' | 'needs_revision' | 'reject';
  summary: {
    total: number;
    approved: number;
    needsRevision: number;
    rejected: number;
  };
}

export interface ActiveCodexSnapshot {
  source: string | null;
  loaded_at: string;
  term_count: number;
  version: string;
  last_updated?: string;
  governance_ssot: boolean;
  is_fallback: boolean;
  note: string;
  dynamo_required: boolean;
  codex?: Record<string, unknown>;
}

export interface ICodexPolicyProvider {
  getCurrentCodex(includeRaw?: boolean): Promise<ActiveCodexSnapshot>;
  getTermCount(): Promise<number>;
}
