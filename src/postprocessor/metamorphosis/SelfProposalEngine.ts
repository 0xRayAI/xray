/**
 * SelfProposalEngine — Phase 2.2
 *
 * Concrete MetamorphosisEngine that reads activity.log, parses structured
 * log entries, detects semantic patterns, generates governance proposals
 * (type: 'metamorphosis'), and submits them through the full 3-agent +
 * Dynamo governance pipeline.
 *
 * Safety constraints:
 * - Max proposals per hour (default 1, configurable)
 * - Circuit breaker: after N consecutive failures, halt for cooldown (default 3/24h)
 * - Only proposes changes to whitelisted targets
 * - All proposals go through full governance with metamorphosisThreshold (default 0.7)
 * - Detection thresholds are configurable (not hard-coded)
 *
 * Coupling note: currently triggered by PostProcessor.onPhase(). A future
 * refactor should extract log-reading into a dedicated LogReader that can
 * run on its own schedule or fs.watch, decoupling from PostProcessor lifecycle.
 */

import { promises as fs, existsSync } from 'fs';
import { join, dirname } from 'path';
import { frameworkLogger } from '../../core/framework-logger.js';
import type { MetamorphosisEngine, MetamorphosisProposal } from '../../types/metamorphosis.js';
import type { GovernanceRequest } from '../../governance/governance-types.js';
import { handleGovernRequest } from '../../nucleus/govern-http.js';

export interface SelfProposalConfig {
  maxProposalsPerHour?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldownHours?: number;
  activityLogPath?: string;
  whitelistedTargets?: string[];
  /** Number of recent log lines to analyze (default: 100) */
  maxLogLines?: number;
  /** Minimum error entries to trigger an error-handling proposal (default: 5) */
  errorThreshold?: number;
  /** Minimum warning entries to trigger a monitoring proposal (default: 10) */
  warningThreshold?: number;
  /** Minimum governance rejections of same type to trigger a pattern proposal (default: 3) */
  governanceRejectionThreshold?: number;
  /** Minimum confidence for generated proposals (default: 0.7) */
  proposalConfidence?: number;
  /** Metamorphosis score threshold for approval (default: 0.7) */
  metamorphosisThreshold?: number;
  /** Project root for resolving whitelisted target paths (default: process.cwd()) */
  projectRoot?: string;
}

export interface SelfEvolutionMetrics {
  totalProposals: number;
  recentProposals: number;
  consecutiveFailures: number;
  circuitBreakerActive: boolean;
  circuitBreakerUntil: number;
  successRate: number;
}

interface ParsedLogEntry {
  timestamp: string;
  component: string;
  action: string;
  status: string;
  details?: Record<string, unknown>;
  raw: string;
}

interface ProposalAttempt {
  timestamp: number;
  result: 'approved' | 'rejected' | 'needs_revision';
  metamorphosisScore?: number;
}

const DEFAULT_CONFIG: Required<SelfProposalConfig> = {
  maxProposalsPerHour: 1,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownHours: 24,
  activityLogPath: 'logs/framework/activity.log',
  whitelistedTargets: ['config/', 'features.json', 'src/processors/'],
  maxLogLines: 100,
  errorThreshold: 5,
  warningThreshold: 10,
  governanceRejectionThreshold: 3,
  proposalConfidence: 0.7,
  metamorphosisThreshold: 0.7,
  projectRoot: process.cwd(),
};

const LOG_LINE_PATTERN = /^(\d{4}-\d{2}-\d{2}T[^ ]+)\s+(?:\[([^\]]*)\]\s+)?(?:\[([^\]]*)\]\s+)?\[([^\]]*)\]\s+(\S+)\s+-\s+(\w+)(?:\s+\|(.+))?$/;

function parseLogEntry(line: string): ParsedLogEntry | null {
  const match = line.match(LOG_LINE_PATTERN);
  if (!match) {
    // Fallback: try JSON parse for entangled log entries
    try {
      const json = JSON.parse(line);
      if (json && typeof json === 'object' && json.action) {
        return {
          timestamp: json.timestamp ? new Date(json.timestamp).toISOString() : new Date().toISOString(),
          component: json.component || 'unknown',
          action: json.action,
          status: (json.status || json.level || 'info').toLowerCase(),
          details: json.details || json,
          raw: line,
        };
      }
    } catch {}
    return null;
  }

  const [, timestamp, , , component, action, status, detailsStr] = match;
  let details: Record<string, unknown> | undefined;
  if (detailsStr) {
    try {
      details = JSON.parse(detailsStr.trim());
    } catch {
      details = { rawDetails: detailsStr.trim() };
    }
  }

  const entry: ParsedLogEntry = {
    timestamp: timestamp ?? new Date().toISOString(),
    component: component || 'unknown',
    action: action ?? 'unknown',
    status: (status ?? 'info').toLowerCase(),
    raw: line,
  };
  if (details !== undefined) {
    entry.details = details;
  }
  return entry;
}

export class SelfProposalEngine implements MetamorphosisEngine {
  readonly name = 'self-proposal';
  private config: Required<SelfProposalConfig>;
  private proposalHistory: ProposalAttempt[] = [];
  private consecutiveFailures = 0;
  private circuitBreakerUntil = 0;

  constructor(config?: SelfProposalConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async onPhase(phase: string, context: unknown): Promise<void> {
    if (phase !== 'monitoring-complete' && phase !== 'post-process-complete') {
      return;
    }

    await frameworkLogger.log('self-proposal', 'phase-hook', 'info', {
      phase,
      message: 'Self-proposal engine triggered by phase',
    });

    if (this.isCircuitBreakerActive()) {
      await frameworkLogger.log('self-proposal', 'circuit-breaker-active', 'warning', {
        message: `Circuit breaker active until ${new Date(this.circuitBreakerUntil).toISOString()}`,
        consecutiveFailures: this.consecutiveFailures,
      });
      return;
    }

    if (this.isRateLimited()) {
      await frameworkLogger.log('self-proposal', 'rate-limited', 'info', {
        message: 'Max proposals per hour reached',
      });
      return;
    }

    await this.evaluateAndPropose();
  }

  async onProposal(proposal: MetamorphosisProposal): Promise<void> {
    await frameworkLogger.log('self-proposal', 'external-proposal', 'info', {
      proposalId: proposal.id,
      type: proposal.type,
      target: proposal.target,
      impact: proposal.impact,
    });
  }

  private isCircuitBreakerActive(): boolean {
    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      if (Date.now() < this.circuitBreakerUntil) {
        return true;
      }
      this.consecutiveFailures = 0;
      this.circuitBreakerUntil = 0;
    }
    return false;
  }

  private isRateLimited(): boolean {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentProposals = this.proposalHistory.filter(a => a.timestamp > oneHourAgo);
    return recentProposals.length >= this.config.maxProposalsPerHour;
  }

  getMetrics(): SelfEvolutionMetrics {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentProposals = this.proposalHistory.filter(a => a.timestamp > oneHourAgo);
    return {
      totalProposals: this.proposalHistory.length,
      recentProposals: recentProposals.length,
      consecutiveFailures: this.consecutiveFailures,
      circuitBreakerActive: this.isCircuitBreakerActive(),
      circuitBreakerUntil: this.circuitBreakerUntil,
      successRate: this.proposalHistory.length > 0
        ? this.proposalHistory.filter(a => a.result === 'approved').length / this.proposalHistory.length
        : 0,
    };
  }

  private async evaluateAndPropose(): Promise<void> {
    let logEntries: string[] = [];
    try {
      const logContent = await fs.readFile(this.config.activityLogPath, 'utf-8');
      const lines = logContent.trim().split('\n');
      logEntries = lines.slice(-this.config.maxLogLines).filter(line => line.trim().length > 0);
    } catch {
      await frameworkLogger.log('self-proposal', 'log-read-error', 'warning', {
        path: this.config.activityLogPath,
        message: 'Activity log not found or unreadable — skipping self-proposal',
      });
      return;
    }

    const patterns = this.detectPatterns(logEntries);

    if (patterns.length === 0) {
      await frameworkLogger.log('self-proposal', 'no-patterns', 'info', {
        message: 'No actionable patterns detected in activity log',
      });
      return;
    }

    for (const pattern of patterns) {
      await this.submitProposal(pattern);
    }
  }

  /**
   * Detect actionable patterns from parsed activity log entries.
   * Uses structured parsing instead of raw string matching to handle
   * the actual xray log format:
   *   ISO_TIMESTAMP [jobId] [traceId.spanId] [component] action - STATUS | {details}
   */
  detectPatterns(entries: string[]): MetamorphosisProposal[] {
    const parsed = entries.map(parseLogEntry).filter((e): e is ParsedLogEntry => e !== null);
    const proposals: MetamorphosisProposal[] = [];

    const errorEntries = parsed.filter(e => e.status === 'error');
    const warningEntries = parsed.filter(e => e.status === 'warning');
    const rejectedEntries = parsed.filter(e =>
      e.component === 'governance' && (e.status === 'rejected' || e.details?.decision === 'reject'),
    );

    if (errorEntries.length >= this.config.errorThreshold) {
      const components = [...new Set(errorEntries.map(e => e.component))];
      proposals.push({
        id: `meta-errors-${Date.now()}`,
        type: 'modify',
        target: 'config/error-handling',
        description: `Elevated error rate: ${errorEntries.length} errors in last ${this.config.maxLogLines} entries. Components: ${components.join(', ')}. Propose adjusting error handling thresholds.`,
        rationale: `High error count (${errorEntries.length}) across ${components.length} component(s) indicates a systemic issue. Affected components: ${components.join(', ')}. Governance review recommended for self-optimization.`,
        impact: 'medium',
      });
    }

    if (warningEntries.length >= this.config.warningThreshold) {
      const components = [...new Set(warningEntries.map(e => e.component))];
      proposals.push({
        id: `meta-warnings-${Date.now()}`,
        type: 'modify',
        target: 'config/monitoring',
        description: `Elevated warning rate: ${warningEntries.length} warnings in last ${this.config.maxLogLines} entries. Components: ${components.join(', ')}. Propose adjusting monitoring sensitivity.`,
        rationale: `Frequent warnings (${warningEntries.length}) across ${components.length} component(s) may indicate configuration drift. Affected: ${components.join(', ')}.`,
        impact: 'low',
      });
    }

    if (rejectedEntries.length >= this.config.governanceRejectionThreshold) {
      proposals.push({
        id: `meta-governance-rejections-${Date.now()}`,
        type: 'modify',
        target: 'config/governance',
        description: `Repeated governance rejections: ${rejectedEntries.length} in last ${this.config.maxLogLines} entries. Propose reviewing governance thresholds or submission patterns.`,
        rationale: `${rejectedEntries.length} governance rejections suggest a pattern mismatch between proposals and governance criteria. Review recommended.`,
        impact: 'medium',
      });
    }

    return proposals.filter(p =>
      this.config.whitelistedTargets.some(t => p.target.startsWith(t)),
    );
  }

  /**
   * Apply an approved self-evolution proposal by recording the change
   * in a state file within the first matching whitelisted target directory.
   * Returns true if the change was written and verified, false otherwise.
   */
  private async applySelfProposal(pattern: MetamorphosisProposal, score?: number, decision?: string): Promise<boolean> {
    const matchedTarget = this.config.whitelistedTargets.find(t => pattern.target.startsWith(t));
    if (!matchedTarget) {
      await frameworkLogger.log('self-proposal', 'apply-no-matching-target', 'warning', {
        proposalId: pattern.id,
        target: pattern.target,
        message: 'No whitelisted target matches this proposal — skipping apply',
      });
      return false;
    }

    const root = this.config.projectRoot;
    const stateDir = join(root, matchedTarget);
    const statePath = join(stateDir, 'self-evolution-state.json');

    let applied: Array<Record<string, unknown>> = [];
    try {
      const content = await fs.readFile(statePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.applied)) applied = parsed.applied;
    } catch {}

    applied.push({
      proposalId: pattern.id,
      target: pattern.target,
      type: pattern.type,
      description: pattern.description,
      rationale: pattern.rationale,
      impact: pattern.impact,
      metamorphosisScore: score,
      decision: decision,
      appliedAt: new Date().toISOString(),
    });

    try {
      await fs.mkdir(stateDir, { recursive: true });

      // Backup existing state file before overwriting
      const backupDir = join(root, '.xray', 'metamorphosis', 'backups');
      let backupPath: string | null = null;
      if (existsSync(statePath)) {
        await fs.mkdir(backupDir, { recursive: true });
        backupPath = join(backupDir, `self-evolution-state-${Date.now()}.json`);
        await fs.copyFile(statePath, backupPath);
        await frameworkLogger.log('self-proposal', 'backup-created', 'info', {
          proposalId: pattern.id,
          backupPath,
        });
      }

      try {
        await fs.writeFile(statePath, JSON.stringify({ applied }, null, 2), 'utf-8');
      } catch (writeError) {
        // Restore from backup on write failure
        if (backupPath && existsSync(backupPath)) {
          await fs.copyFile(backupPath, statePath);
          await frameworkLogger.log('self-proposal', 'restored-from-backup', 'warning', {
            proposalId: pattern.id,
            backupPath,
            error: writeError instanceof Error ? writeError.message : String(writeError),
          });
        }
        await frameworkLogger.log('self-proposal', 'apply-write-error', 'error', {
          proposalId: pattern.id,
          path: statePath,
          error: writeError instanceof Error ? writeError.message : String(writeError),
        });
        return false;
      }
    } catch (writeError) {
      await frameworkLogger.log('self-proposal', 'apply-mkdir-error', 'error', {
        proposalId: pattern.id,
        error: writeError instanceof Error ? writeError.message : String(writeError),
      });
      return false;
    }

    try {
      const verify = await fs.readFile(statePath, 'utf-8');
      const parsed = JSON.parse(verify);
      const found = Array.isArray(parsed.applied) && parsed.applied.some((a: any) => a.proposalId === pattern.id);
      if (!found) {
        await frameworkLogger.log('self-proposal', 'apply-verify-failed', 'error', {
          proposalId: pattern.id,
          message: 'Applied change not found in state file after write — verification failed',
        });
      }
      return found;
    } catch (verifyError) {
      await frameworkLogger.log('self-proposal', 'apply-verify-error', 'error', {
        proposalId: pattern.id,
        error: verifyError instanceof Error ? verifyError.message : String(verifyError),
      });
      return false;
    }
  }

  private async submitProposal(pattern: MetamorphosisProposal): Promise<void> {
    const governanceRequest: GovernanceRequest = {
      proposals: [{
        id: pattern.id,
        type: 'metamorphosis',
        title: `Self-proposal: ${pattern.description.slice(0, 80)}`,
        description: pattern.description,
        evidence: [pattern.rationale],
        source: 'metamorphosis',
        confidence: this.config.proposalConfidence,
        tags: ['0xray'],
      }],
      context: {
        project: 'xray-self',
        phase: 'self-evolution',
        source: 'self-proposal-engine',
        tags: ['0xray'],
      },
      options: {
        requireExternalDynamo: true,
        metamorphosisThreshold: this.config.metamorphosisThreshold,
      },
    };

    await frameworkLogger.log('self-proposal', 'submitting', 'info', {
      proposalId: pattern.id,
      target: pattern.target,
      impact: pattern.impact,
    });

    try {
      const response = await handleGovernRequest(governanceRequest);

      const result = response.results[0];
      if (!result) {
        await frameworkLogger.log('self-proposal', 'no-result', 'warning', {
          proposalId: pattern.id,
          message: 'Governance returned no results',
        });
        return;
      }

      const decision = result.finalDecision;
      const attempt: ProposalAttempt = {
        timestamp: Date.now(),
        result: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'needs_revision',
      };
      if (result.metamorphosisScore !== undefined) {
        attempt.metamorphosisScore = result.metamorphosisScore;
      }
      this.proposalHistory.push(attempt);

      if (decision === 'approve' && (result.metamorphosisScore ?? 0) >= this.config.metamorphosisThreshold) {
        this.consecutiveFailures = 0;
        await frameworkLogger.log('self-proposal', 'approved', 'success', {
          proposalId: pattern.id,
          metamorphosisScore: result.metamorphosisScore,
          finalDecision: decision,
          averageConfidence: (result as any).averageConfidence,
          voteSummary: (result as any).votes ? (result as any).votes.map((v: any) => ({ server: v.server, decision: v.decision })) : undefined,
          message: 'Self-evolution proposal approved by governance — applying change',
          tags: ['0xray'],
        });

        const applied = await this.applySelfProposal(pattern, result.metamorphosisScore, decision);
        if (applied) {
          await frameworkLogger.log('self-proposal', 'applied', 'success', {
            proposalId: pattern.id,
            target: pattern.target,
            metamorphosisScore: result.metamorphosisScore,
            decision,
            message: 'Self-evolution change applied and verified',
            tags: ['0xray'],
          });
          await this.audit0xrayProposalTraceability(pattern.id, decision, result.metamorphosisScore);
        } else {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
            this.circuitBreakerUntil = Date.now() + this.config.circuitBreakerCooldownHours * 60 * 60 * 1000;
          }
          await frameworkLogger.log('self-proposal', 'apply-failed', 'error', {
            proposalId: pattern.id,
            target: pattern.target,
            consecutiveFailures: this.consecutiveFailures,
            message: 'Self-evolution change apply failed — circuit breaker may activate',
          });
        }
      } else {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
          this.circuitBreakerUntil = Date.now() + this.config.circuitBreakerCooldownHours * 60 * 60 * 1000;
        }
        await frameworkLogger.log('self-proposal', 'not-approved', 'warning', {
          proposalId: pattern.id,
          decision: decision,
          metamorphosisScore: result.metamorphosisScore,
          consecutiveFailures: this.consecutiveFailures,
          circuitBreakerUntil: this.circuitBreakerUntil || 'not active',
        });
      }
    } catch (error) {
      this.consecutiveFailures++;
      await frameworkLogger.log('self-proposal', 'submission-error', 'error', {
        proposalId: pattern.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Post-apply audit for Term 72 (Self-Evolution Traceability).
   * For 0xray-tagged proposals (framework self-evolution), asserts that
   * frameworkLogger entries exist with full provenance:
   *   - source proposal ID
   *   - governance vote results / finalDecision / averageConfidence
   *   - metamorphosisScore
   * Logs the audit outcome via frameworkLogger.
   */
  private async audit0xrayProposalTraceability(proposalId: string, decision: string, score?: number): Promise<void> {
    if (!proposalId) {
      return;
    }

    try {
      const logContent = await fs.readFile(this.config.activityLogPath, 'utf-8');
      const lines = logContent.trim().split('\n').filter(l => l.trim().length > 0);
      const recentLines = lines.slice(-this.config.maxLogLines);

      // Look for entries tied to this proposalId that carry the required provenance.
      // We expect 'approved' (with vote info) and 'applied' (with score/decision) for 0xray self-proposals.
      const relevant = recentLines.filter(line =>
        line.includes(proposalId) &&
        (line.includes('approved') || line.includes('applied') || line.includes('submitting'))
      );

      const hasProposalId = relevant.length > 0;
      const hasGovernanceVote = relevant.some(l =>
        l.includes('finalDecision') || l.includes('averageConfidence') || l.includes('voteSummary')
      );
      const hasMetamorphosisScore = relevant.some(l => l.includes('metamorphosisScore'));
      const has0xrayTag = relevant.some(l => l.includes('0xray') || l.includes('"tags"') && l.includes('0xray'));

      const auditPassed = hasProposalId && hasGovernanceVote && hasMetamorphosisScore && has0xrayTag;

      await frameworkLogger.log('self-proposal', 'post-apply-audit', auditPassed ? 'success' : 'warning', {
        proposalId,
        decision,
        metamorphosisScore: score,
        hasProposalId,
        hasGovernanceVote,
        hasMetamorphosisScore,
        has0xrayTag,
        relevantEntryCount: relevant.length,
        message: auditPassed
          ? 'Term 72 traceability audit passed: frameworkLogger entries with full provenance (proposalId, governance votes, metamorphosisScore, 0xray tag) verified for self-evolution proposal.'
          : 'Term 72 traceability audit warning: missing or incomplete frameworkLogger provenance for 0xray-tagged self-evolution proposal.',
      });
    } catch (auditError) {
      await frameworkLogger.log('self-proposal', 'post-apply-audit-error', 'error', {
        proposalId,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      });
    }
  }
}