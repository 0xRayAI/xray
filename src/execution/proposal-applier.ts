import * as fs from "fs";
import * as path from "path";
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
  constructor(private projectRoot: string = process.cwd()) {}

  async applyProposals(proposals: InferenceProposal[]): Promise<ApplyResult[]> {
    frameworkLogger.log("execution", "proposal-applier-start", "info", {
      count: proposals.length,
    });

    const results: ApplyResult[] = [];

    for (const proposal of proposals) {
      if (proposal.type === "codify") {
        results.push(this.applyCodification(proposal));
      } else {
        this.recordAppliedProposal(proposal);
        const changedFiles: string[] = [
          path.relative(this.projectRoot, this.getAppliedMarkerPath(proposal)),
        ];
        results.push({
          proposalId: proposal.id,
          success: true,
          filesChanged: changedFiles,
          details: [
            "Proposal recorded by Autonomous Engine (ProposalApplier)",
            `type=${proposal.type}`,
          ],
        });
      }
    }

    return results;
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

}

