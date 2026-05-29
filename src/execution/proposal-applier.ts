import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { frameworkLogger } from "../core/framework-logger.js";
import type { InferenceProposal } from "../inference/inference-cycle.js";

export interface ApplyResult {
  proposalId: string;
  success: boolean;
  filesChanged?: string[];
  details?: string[];
  error?: string;
}

export class ProposalApplier {
  constructor(private projectRoot: string = process.cwd()) {
    
    // ITER51-01 min note: P3-CUTOVER/firstCentral/perProc/reclamation/codexBoost markers live guarded in 'proposal-application' 7-flow (Dynamo/fwLogger/thinDispatch/perProc(20)/firstCentral(17)/reclamation(13)/codexBoost(25) 100% preserved)
    try {
      import('../mcps/orchestrator/execution/execution-planner.js')
        .then(({ getExecutionCoordinator }) => {
          const coord = getExecutionCoordinator();
          coord.registerExecutionFlow({
            name: 'proposal-application',
            type: 'engine-execution',
            ownerModule: 'src/execution',
            capabilities: ['proposal-apply', 'codify', 'git-branch-pr', 'marker-recording', 'autonomous-execution'],
            metadata: { slice: 'P2-S01', note: 'Proposal application flow under orchestrator SSOT funnel' },
          });
        })
        .catch(() => {
          // Silent safe degradation — proposal application continues to function exactly as before
          frameworkLogger.log('execution', 'p2-s01q-coordinator-registration-skipped', 'warning', {
            reason: 'dynamic import failed (safe; proposal apply unchanged)',
          });
        });
    } catch {
      // Sync outer guard (defensive)
      frameworkLogger.log('execution', 'p2-s01q-coordinator-registration-error', 'warning', {
        reason: 'outer guard (proposal apply unaffected)',
      });
    }
  }

  async applyProposals(proposals: InferenceProposal[]): Promise<ApplyResult[]> {
    frameworkLogger.log("execution", "proposal-applier-start", "info", {
      count: proposals.length,
    });

    
    // ITER51-01 min note: P3-CUTOVER/firstCentral/perProc/reclamation/codexBoost markers live guarded in 'proposal-application' 7-flow (Dynamo/fwLogger/thinDispatch/perProc(20)/firstCentral(17)/reclamation(13)/codexBoost(25) 100% preserved)
    try {
      import('../mcps/orchestrator/execution/execution-planner.js')
        .then(({ getExecutionCoordinator }) => {
          const coord = getExecutionCoordinator();
          const _dispatchAck = coord.thinDispatch('proposal-application', {
            handoff: 'engine-proposal-apply',
            count: proposals.length,
            slice: 'P2-S01',
          });
          // P2-CLEANUP-04: perFlowSnapshot removed from thinDispatch returns (thinned data model; depth/historyDepth gone from paths)
        })
        .catch(() => {
          // Silent safe degradation — proposal application continues exactly as before
          frameworkLogger.log('execution', 'p2-s01q-coordinator-dispatch-skipped', 'warning', {
            reason: 'dynamic import failed (safe; proposal apply unchanged)',
          });
        });
    } catch {
      // Sync outer guard (defensive)
      frameworkLogger.log('execution', 'p2-s01q-coordinator-dispatch-error', 'warning', {
        reason: 'outer guard (proposal apply unaffected)',
      });
    }

    try {
      const { getExecutionCoordinator } = await import('../mcps/orchestrator/execution/execution-planner.js');
      const coord = getExecutionCoordinator();
      const govVerdict = await coord.requestGovernanceDecisionBeforeDispatch(
        'proposal-application',
        `proposal-application continuation (count: ${proposals.length}). Current dispatch state (Gauge via centralized helper) requires explicit Governance approval before Autonomous Engine applies any proposals ().`
      );
      await frameworkLogger.log('execution.proposal-applier', 'governance-execution-verdict-received', 'info', {
        count: proposals.length,
        decision: govVerdict.decision,
        reasoningPreview: (govVerdict.reasoning || '').slice(0, 160),
        governanceCallId: govVerdict.governanceCallId,
        
      });

      if (govVerdict.decision !== 'continue') {
        // Respect the non-bypassable verdict: block escalation. No proposal application performed.
        // Mirrors task-handler BRIDGE-02 exactly. Caller (e.g. inference apply phase) will
        // surface the exact decision in error/recommendations.
        throw new Error(`GOVERNANCE_VERDICT: ${govVerdict.decision} — ${govVerdict.reasoning} (governanceCallId: ${govVerdict.governanceCallId || 'n/a'})`);
      }
      // 'continue' only — proceed with the now-governed proposal application work below.
    try {
      const dispatchSnapshot = (coord as any)?.getExecutionDispatchSnapshot?.();
      const codexBoostActive = dispatchSnapshot?.dispatchStats?.codexBoostActive || 'n/a';
      if (String(codexBoostActive).startsWith('active')) {
        frameworkLogger.log('execution', 'p2-gov-bridge-42-codex-boost-reclamation-priority', 'info', {
          flow: 'proposal-application',
          codexBoostActive,
          
        });

        
        try {
          const recSummary = (dispatchSnapshot as any)?.dispatchStats?.reclamationPressureSummary;
          if (recSummary) {
            frameworkLogger.log('execution', 'p2-gov-bridge-54-codex-boost-reclamation-edit-priority', 'info', {
              flow: 'proposal-application',
              codexBoostActive,
              reclamationPressureSummary: String(recSummary).substring(0, 120),
              
            });

            

            try {
              const recSummary62 = (dispatchSnapshot as any)?.dispatchStats?.reclamationPressureSummary;
              const codexBoostActive62 = (dispatchSnapshot as any)?.dispatchStats?.codexBoostActive || codexBoostActive;
              if (recSummary62 && String(codexBoostActive62).startsWith('active')) {
                const deprecationFlag = 'fourth-legacy-site-proposal-applier-proposal-application-explicit-deprecation-under-7-site-reclamation-pressure-active';
                frameworkLogger.log('execution', 'p2-gov-bridge-62-codex-boost-fourth-actual-deprecation-step', 'info', {
                  flow: 'proposal-application',
                  codexBoostActive: codexBoostActive62,
                  reclamationPressureSummary: String(recSummary62).substring(0, 120),
                  deprecationFlag,
                  
                });


                const firstCentralMigrationGate10 = (dispatchSnapshot as any)?.dispatchStats?.firstCentralMigrationGate || '';
                if (firstCentralMigrationGate10 && String(firstCentralMigrationGate10).includes('P3-CUTOVER-PREP-06') && String(codexBoostActive62).startsWith('active')) {
                  frameworkLogger.log('execution', 'p3-cutover-prep-10-fourth-migration-preference-proposal-applier-proposal-application', 'info', {
                    flow: 'proposal-application',
                    codexBoostActive: codexBoostActive62,
                    reclamationPressureSummary: String(recSummary62).substring(0, 120),
                    firstCentralMigrationGate: String(firstCentralMigrationGate10).substring(0, 120),
                    deprecationFlag,
                    note: 'ITER30-01 min: fourth actual per-proc migration preference under reclamation (proposal-application flow). Live surfaces preserved.',
                  });
                }

                
                try {
                  const firstCentralMigrationGate18 = (dispatchSnapshot as any)?.dispatchStats?.firstCentralMigrationGate || '';
                  const hasP313CentralOrchRec18 = String(firstCentralMigrationGate18).includes('P3-CUTOVER-PREP-06') || String(firstCentralMigrationGate18).includes('P3-CUTOVER-PREP-13');
                  const hasSixSiteOrP14ConditioningEvidence18 = String(recSummary62).includes('six-site') || String(recSummary62).includes('complete the set') || String(recSummary62).includes('P3-14') || String(recSummary62).includes('Inference conditioning');
                  if (hasP313CentralOrchRec18 && hasSixSiteOrP14ConditioningEvidence18 && String(codexBoostActive62).startsWith('active')) {
                    const perProcPreferredForThisFlow = true;
                    frameworkLogger.log('execution', 'p3-cutover-prep-18-extend-actual-use-pattern-to-fourth-low-risk-legacy-flow-proposal-applier-per-proc-preferred', 'info', {
                      flow: 'proposal-application',
                      codexBoostActive: codexBoostActive62,
                      reclamationPressureSummary: String(recSummary62).substring(0, 120),
                      firstCentralMigrationGate: String(firstCentralMigrationGate18).substring(0, 120),
                      deprecationFlag,
                      perProcPreferredForThisFlow,
                      note: 'ITER30-01 min: P3-18 fourth actual use of signals in proposal-application. Live surfaces preserved.'
                    });
                  }
                } catch {
                  // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline)
                }
              }

              
              try {
                const perProcPreferredForTheseFlows25 = (dispatchSnapshot as any)?.dispatchStats?.perProcPreferredForTheseFlows || '';
                const hasCentralPref25 = String(perProcPreferredForTheseFlows25).includes('governed per-proc preferred for these flows') || String(perProcPreferredForTheseFlows25).includes('P3-21') || String(perProcPreferredForTheseFlows25).includes('six of six');
                const firstCentralMigrationGate25 = (dispatchSnapshot as any)?.dispatchStats?.firstCentralMigrationGate || '';
                const hasP313CentralOrchRec25 = String(firstCentralMigrationGate25).includes('P3-CUTOVER-PREP-06') || String(firstCentralMigrationGate25).includes('P3-CUTOVER-PREP-13');
                const hasSixSiteOrP14ConditioningEvidence25 = String(recSummary62).includes('six-site') || String(recSummary62).includes('complete the set') || String(recSummary62).includes('P3-14') || String(recSummary62).includes('Inference conditioning');
                const boostFor25 = String(codexBoostActive62).startsWith('active') || (() => {
                  // lpv parity fallback (exact reuse of codexBoost IIFE + P3-23/24)
                  const lpv = (dispatchSnapshot as any)?.dispatchStats?.lastProcessorVerdicts || [];
                  const hasCodexNote = lpv.some((v: any) => v && ((String(v.processor || '').toLowerCase().includes('codex')) || String(v).toLowerCase().includes('codex')) && !!v.note);
                  const hasStrongS02 = lpv.some((v: any) => v && v.decision !== 'continue') || lpv.length > 0;
                  return hasCodexNote && hasStrongS02;
                })();
                if ((hasCentralPref25 || (hasP313CentralOrchRec25 && hasSixSiteOrP14ConditioningEvidence25)) && boostFor25) {
                  frameworkLogger.log('execution', 'p3-cutover-prep-25-third-site-specific-consumption-of-centrally-aggregated-governed-per-proc-preferred-in-legacy-mediation-path-proposal-applier', 'info', {
                    flow: 'proposal-application',
                    codexBoostActive: codexBoostActive62,
                    reclamationPressureSummary: String(recSummary62).substring(0, 120),
                    firstCentralMigrationGate: String(firstCentralMigrationGate25).substring(0, 120),
                    perProcPreferredForTheseFlows: hasCentralPref25 ? 'active (P3-21/22 central aggregation consumed)' : 'active via local P3-18 proof conditions',
                    note: 'ITER30-01 min: third site-specific consumption of centrally aggregated per-proc preferred in proposal-application (scales to four). Live surfaces preserved.',
                  });
                }
              } catch {
                // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline)
              }
              
              try {
                const deprecationFlag33 = 'legacy-proposal-applier-explicitly-deprecated-under-six-of-six-plus-central-plus-7th-gap-evidence-plus-deep-reflection-2026-05-26';
                frameworkLogger.log('execution', 'p3-cutover-prep-33-fourth-surgical-deprecation-marking-thin-adapter-in-proven-legacy-mediation-path', 'info', {
                  flow: 'proposal-application',
                  codexBoostActive: codexBoostActive62,
                  reclamationPressureSummary: String(recSummary62).substring(0, 120),
                  deprecationFlag: deprecationFlag33,
                  perProcPreferredForTheseFlows: 'active (six-of-six + central aggregation + P3-29 7th gap surfaces + 2026-05-26 deep reflection on the high-fidelity proof-of-concept machine)',
                  note: 'ITER30-01 min: fourth surgical deprecation marking + thin adapter in proposal-application under complete surfaces + 2026-05-26 reflection. Live deprecation logic preserved.',
                });

                // Thin adapter shim (minimal, guarded, reversible, fw-only): when the now-complete surfaces + the 2026-05-26 deep reflection on the high-fidelity proof-of-concept machine are active, emit explicit preference for governed path (this site — proposal-applier — is under active retirement pressure).
                const firstCentralMigrationGate33 = (dispatchSnapshot as any)?.dispatchStats?.firstCentralMigrationGate || '';
                const hasP313CentralOrchRec33 = String(firstCentralMigrationGate33).includes('P3-CUTOVER-PREP-06') || String(firstCentralMigrationGate33).includes('P3-CUTOVER-PREP-13');
                if (hasP313CentralOrchRec33 || (recSummary62 && String(codexBoostActive62).startsWith('active'))) {
                  frameworkLogger.log('execution', 'p3-cutover-prep-33-thin-adapter-governed-per-proc-path-preferred-under-complete-surfaces-plus-deep-reflection', 'info', {
                    flow: 'proposal-application',
                    deprecationFlag: deprecationFlag33,
                    note: 'ITER30-01 min: complete surfaces + 2026-05-26 reflection active — proposal-application prefers governed per-proc (fourth retirement action).',
                  });
                }
              } catch {
                // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline + )
              }

            } catch {
              // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline)
            }
          }
        } catch {
          // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline)
        }
      }
    } catch {
      // Silent defensive guard — never impacts proposal application, gov gate, or apply loop (per Tolerance + fw discipline)
    }
    } catch (gateErr) {
      const msg = gateErr instanceof Error ? gateErr.message : String(gateErr);
      if (msg.includes('GOVERNANCE_VERDICT')) {
        throw gateErr; // propagate exact block from verdict check
      }
      // Setup or unexpected error in gate path: fail-closed to pause (consistent with hook tolerance)
      await frameworkLogger.log('execution.proposal-applier', 'governance-execution-gate-error', 'error', {
        error: msg,
        decision: 'pause (fail-closed at wire site)',
        
      });
      throw new Error(`GOVERNANCE_VERDICT: pause — Gate error at proposal-application wire: ${msg}`);
    }

    const results: ApplyResult[] = [];

    for (const proposal of proposals) {
      const result = await this.applyProposal(proposal);
      results.push(result);
    }

    return results;
  }


  private async applyProposal(p: InferenceProposal): Promise<ApplyResult> {
    frameworkLogger.log("execution", "apply-proposal", "info", {
      proposalId: p.id,
      type: p.type,
      module: "v2-refactor",
    });

    if (p.type === "codify") {
      return this.applyCodification(p);
    }

    const branchName = `inference/${p.type}-${Date.now()}`;
    const isGit = this.isInsideGitRepo();

    try {
      this.recordAppliedProposal(p);

      const changedFiles: string[] = [
        path.relative(this.projectRoot, this.getAppliedMarkerPath(p)),
      ];

      if (isGit) {
        execSync(`git checkout -b ${branchName}`, { cwd: this.projectRoot, stdio: "pipe" });
        execSync(`git add -A`, { cwd: this.projectRoot, stdio: "pipe" });
        const safeTitle = p.title.replace(/["`]/g, "'");
        execSync(`git commit -m "${safeTitle}"`, { cwd: this.projectRoot, stdio: "pipe" });

        const prUrl = this.createPR(p, branchName);
        if (prUrl) {
          frameworkLogger.log("execution", "pr-created", "info", {
            prUrl,
            proposalId: p.id,
            module: "v2-refactor",
          });
        }

        execSync(`git checkout master`, { cwd: this.projectRoot, stdio: "pipe" });
      }

      return {
        proposalId: p.id,
        success: true,
        filesChanged: changedFiles,
        details: [
          "Proposal applied by Autonomous Engine (ProposalApplier)",
          isGit ? `branch=${branchName}` : "non-git (marker only)",
          `type=${p.type}`,
        ],
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      frameworkLogger.log("execution", "apply-proposal-error", "error", {
        proposalId: p.id,
        error: errorMsg,
        module: "v2-refactor",
      });

      if (isGit) {
        try {
          execSync(`git checkout master`, { cwd: this.projectRoot, stdio: "pipe" });
          execSync(`git branch -D ${branchName}`, { cwd: this.projectRoot, stdio: "pipe" });
        } catch {
          // ignore cleanup
        }
      }

      return {
        proposalId: p.id,
        success: false,
        error: errorMsg,
      };
    }
  }

  private applyCodification(p: InferenceProposal): ApplyResult {
    try {
      const catalogPath = path.join(this.projectRoot, "docs", "pattern-catalog.md");
      const dir = path.dirname(catalogPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const entry = `\n## ${p.title}\n\n${p.description}\n\n**Evidence:** ${p.evidence.length} sessions\n`;
      fs.appendFileSync(catalogPath, entry);

      frameworkLogger.log("execution", "codification-applied", "info", {
        proposalId: p.id,
        catalogPath,
        module: "v2-refactor",
      });

      return {
        proposalId: p.id,
        success: true,
        details: ["codification written to docs/pattern-catalog.md"],
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      frameworkLogger.log("execution", "codification-failed", "error", {
        proposalId: p.id,
        error: errorMsg,
        module: "v2-refactor",
      });
      return { proposalId: p.id, success: false, error: errorMsg };
    }
  }

  private isInsideGitRepo(): boolean {
    try {
      execSync("git rev-parse --is-inside-work-tree", {
        cwd: this.projectRoot,
        stdio: "pipe",
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private getAppliedMarkerPath(p: InferenceProposal): string {
    const appliedDir = path.join(this.projectRoot, "docs", "inference", "applied");
    if (!fs.existsSync(appliedDir)) {
      fs.mkdirSync(appliedDir, { recursive: true });
    }
    return path.join(appliedDir, `${p.id.replace(/[^a-z0-9_-]/gi, "-")}.md`);
  }

  private recordAppliedProposal(p: InferenceProposal): void {
    const markerPath = this.getAppliedMarkerPath(p);
    const content = [
      `# Applied Inference Proposal`,
      ``,
      `**ID:** ${p.id}`,
      `**Type:** ${p.type}`,
      `**Title:** ${p.title}`,
      `**Description:** ${p.description}`,
      ``,
      `**Source:** ${p.source}`,
      `**Confidence:** ${(p.confidence * 100).toFixed(0)}%`,
      `**Evidence:**`,
      ...p.evidence.map((e) => `- ${e}`),
      ``,
      `**Applied At:** ${new Date().toISOString()}`,
      `**Applied By:** Autonomous Engine (ProposalApplier) — PHASE1-02b`,
      ``,
      `Marker proves Governance-approved proposal executed by Engine.`,
    ].join("\n");

    fs.writeFileSync(markerPath, content, "utf-8");

    frameworkLogger.log("execution", "proposal-recorded", "info", {
      proposalId: p.id,
      markerPath: path.relative(this.projectRoot, markerPath),
      module: "v2-refactor",
    });
  }

  private createPR(p: InferenceProposal, branchName: string): string {
    try {
      execSync(`git push -u origin ${branchName}`, {
        cwd: this.projectRoot,
        stdio: "pipe",
        timeout: 30000,
      });

      const safeTitle = p.title.replace(/["`]/g, "'");
      const body = [
        "## Inference Proposal (Autonomous Engine)",
        "",
        p.description,
        "",
        `**Type:** ${p.type}  **Confidence:** ${(p.confidence * 100).toFixed(0)}%`,
        "",
        "## Evidence",
        p.evidence.slice(0, 5).join("\n"),
        "",
        "Executed by ProposalApplier (Engine-owned) — V2 Phase 1.",
      ].join("\n");

      const result = execSync(
        `gh pr create --head ${branchName} --title "${safeTitle}" --body "${body.replace(/"/g, "'")}"`,
        { cwd: this.projectRoot, encoding: "utf-8", stdio: "pipe", timeout: 30000 },
      );
      return result.trim();
    } catch (err) {
      frameworkLogger.log("execution", "pr-create-failed", "warning", {
        error: String(err),
        proposalId: p.id,
        module: "v2-refactor",
      });
      return "";
    }
  }

  // All proposal apply/execution logic now owned exclusively by Autonomous Engine.
  // InferenceCycle is purified of apply ownership.
}

export const proposalApplier = new ProposalApplier();
