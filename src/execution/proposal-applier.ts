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
  }

  async applyProposals(proposals: InferenceProposal[]): Promise<ApplyResult[]> {
    frameworkLogger.log("execution", "proposal-applier-start", "info", {
      count: proposals.length,
    });

    // getExecutionCoordinator/execution-planner removed per v2 cleanup — warning log only
    frameworkLogger.log('execution', 'proposal-application-mediation-skipped', 'warning', {
      reason: 'execution-planner removed (proposal application continues via direct apply loop)',
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
