import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { frameworkLogger } from "../core/framework-logger.js";
import type { InferenceProposal } from "../inference/inference-cycle.js";

function sanitizeGitArgument(s: string): string {
  if (!/^[a-zA-Z0-9 \-_.\/@]+$/.test(s)) {
    throw new Error("Invalid git argument: contains disallowed characters");
  }
  return s;
}

export interface ApplyResult {
  proposalId: string;
  success: boolean;
  filesChanged?: string[];
  details?: string[];
  error?: string;
}

export type CodeChangeCallback = (proposal: InferenceProposal) => Promise<boolean>;
export type ReviewCallback = (proposal: InferenceProposal, prUrl: string) => Promise<"go" | "no-go" | "modify">;

export class ProposalApplier {
  constructor(
    private projectRoot: string = process.cwd(),
    private codeChangeCallback?: CodeChangeCallback,
    private reviewCallback?: ReviewCallback,
  ) {
  }

  async applyProposals(proposals: InferenceProposal[]): Promise<ApplyResult[]> {
    frameworkLogger.log("execution", "proposal-applier-start", "info", {
      count: proposals.length,
    });

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
        const branchR = spawnSync('git', ['checkout', '-b', branchName], { cwd: this.projectRoot, stdio: 'pipe' });
        if (branchR.status !== 0) {
          throw new Error(`git checkout -b failed: ${(branchR.stderr || '').toString().trim()}`);
        }
      }

      if (this.codeChangeCallback) {
        const changed = await this.codeChangeCallback(p);
        if (!changed) {
          if (isGit) {
            spawnSync('git', ['checkout', 'master'], { cwd: this.projectRoot, stdio: 'pipe' });
            spawnSync('git', ['branch', '-D', branchName], { cwd: this.projectRoot, stdio: 'pipe' });
          }
          return {
            proposalId: p.id,
            success: false,
            error: "Code change returned false (no changes applied)",
          };
        }
      }

      if (isGit) {
        const addR = spawnSync('git', ['add', '-A'], { cwd: this.projectRoot, stdio: 'pipe' });
        if (addR.status !== 0) {
          throw new Error(`git add failed: ${(addR.stderr || '').toString().trim()}`);
        }
        const commitR = spawnSync('git', ['commit', '-m', p.title], { cwd: this.projectRoot, stdio: 'pipe' });
        if (commitR.status !== 0) {
          throw new Error(`git commit failed: ${(commitR.stderr || '').toString().trim()}`);
        }

        const prUrl = this.createPR(p, branchName);
        if (prUrl) {
          frameworkLogger.log("execution", "pr-created", "info", {
            prUrl,
            proposalId: p.id,
          });
        }

        if (this.reviewCallback && prUrl) {
          const review = await this.reviewCallback(p, prUrl);
          if (review === "no-go") {
            frameworkLogger.log("execution", "review-no-go", "warning", {
              proposalId: p.id,
              prUrl,
            });
            spawnSync('git', ['checkout', 'master'], { cwd: this.projectRoot, stdio: 'pipe' });
            spawnSync('git', ['branch', '-D', branchName], { cwd: this.projectRoot, stdio: 'pipe' });
            return {
              proposalId: p.id,
              success: false,
              error: "Researcher review rejected proposal",
            };
          }
        }

        spawnSync('git', ['checkout', 'master'], { cwd: this.projectRoot, stdio: 'pipe' });
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
      });

      if (isGit) {
        try {
          spawnSync('git', ['checkout', 'master'], { cwd: this.projectRoot, stdio: 'pipe' });
          spawnSync('git', ['branch', '-D', branchName], { cwd: this.projectRoot, stdio: 'pipe' });
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
      const r = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        timeout: 2000,
      });
      return r.status === 0;
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
      sanitizeGitArgument(p.title);
      sanitizeGitArgument(branchName);

      const pushR = spawnSync('git', ['push', '-u', 'origin', branchName], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        timeout: 30000,
      });
      if (pushR.status !== 0) {
        throw new Error(`git push failed: ${(pushR.stderr || '').toString().trim()}`);
      }

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

      const ghR = spawnSync('gh', ['pr', 'create', '--head', branchName, '--title', p.title, '--body', body], {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 30000,
      });
      if (ghR.status !== 0) {
        throw new Error(`gh pr create failed: ${ghR.stderr || 'unknown error'}`);
      }
      return (ghR.stdout || '').trim();
    } catch (err) {
      frameworkLogger.log("execution", "pr-create-failed", "warning", {
        error: String(err),
        proposalId: p.id,
        module: "v2-refactor",
      });
      return "";
    }
  }

}

export const proposalApplier = new ProposalApplier();
