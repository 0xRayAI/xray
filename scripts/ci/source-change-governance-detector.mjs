#!/usr/bin/env node
/**
 * source-change-governance-detector.mjs — Phase 1: Source-Change Governance Detector.
 *
 * Runs as a CI step on PR commits that touch governance-critical files.
 * Detects changes to codex.json, enforcement/nucleus/postprocessor/gate files
 * and auto-builds a governance proposal via handleGovernRequest.
 *
 * Usage:
 *   node scripts/ci/source-change-governance-detector.mjs          # git-diff mode (CI PR)
 *   node scripts/ci/source-change-governance-detector.mjs --apply  # submit proposals
 *   node scripts/ci/source-change-governance-detector.mjs --all    # full scan
 *   node scripts/ci/source-change-governance-detector.mjs --dry-run
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const dryRun = process.argv.includes("--dry-run");
const shouldApply = process.argv.includes("--apply");
const fullScan = process.argv.includes("--all");

// Files whose changes trigger governance proposals
const GOVERNANCE_INTEREST_FILES = [
  ".opencode/xray/codex.json",
  "xray/features.json",
  "src/integrations/enforcement-gate.ts",
  "src/integrations/governance/governance-client.ts",
  "src/integrations/governance/index.ts",
  "src/integrations/governance/types.ts",
  "src/nucleus/govern-http.ts",
  "src/nucleus/index.ts",
  "src/governance/governance-service.ts",
  "src/governance/governance-types.ts",
  "src/postprocessor/PostProcessor.ts",
  "src/postprocessor/escalation/EscalationEngine.ts",
  "src/postprocessor/metamorphosis/SelfProposalEngine.ts",
  "src/postprocessor/validation/LightweightValidator.ts",
  "src/core/boot-orchestrator.ts",
  "plugins/xray-codex-injection.ts",
  ".github/workflows/ci.yml",
  "scripts/ci/enforce-validators.mjs",
];

// Category groupings for proposal construction
const CATEGORY_MAP = {
  codex: [".opencode/xray/codex.json"],
  features: ["xray/features.json"],
  enforcement: [
    "src/integrations/enforcement-gate.ts",
    "plugins/xray-codex-injection.ts",
  ],
  nucleus: [
    "src/nucleus/govern-http.ts",
    "src/nucleus/index.ts",
  ],
  governance: [
    "src/governance/governance-service.ts",
    "src/governance/governance-types.ts",
    "src/integrations/governance/governance-client.ts",
    "src/integrations/governance/index.ts",
    "src/integrations/governance/types.ts",
  ],
  postprocessor: [
    "src/postprocessor/PostProcessor.ts",
    "src/postprocessor/escalation/EscalationEngine.ts",
    "src/postprocessor/metamorphosis/SelfProposalEngine.ts",
    "src/postprocessor/validation/LightweightValidator.ts",
  ],
  boot: ["src/core/boot-orchestrator.ts"],
  ci: [".github/workflows/ci.yml", "scripts/ci/enforce-validators.mjs"],
};

function getGitDiffFiles() {
  try {
    const stdout = execSync("git diff --name-only HEAD~1", { encoding: "utf-8", cwd: PROJECT_ROOT });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function scanFiles() {
  const files = fullScan ? GOVERNANCE_INTEREST_FILES : getGitDiffFiles();
  return files.filter((f) => GOVERNANCE_INTEREST_FILES.includes(f));
}

function buildProposals(changedFiles) {
  const changedSet = new Set(changedFiles);
  const categories = [];

  for (const [cat, catFiles] of Object.entries(CATEGORY_MAP)) {
    const matched = catFiles.filter((f) => changedSet.has(f));
    if (matched.length > 0) {
      categories.push({ category: cat, files: matched });
    }
  }

  return categories.map(({ category, files }) => ({
    id: `govdetect-${category}-${Date.now()}`,
    title: `Governance: ${category} files changed in PR`,
    description: `Detected changes to ${files.length} ${category} file(s): ${files.join(", ")}. Auto-submitting governance proposal for review.`,
    type: "strategic",
    source: "source-change-governance-detector",
    confidence: 0.65,
    evidence: [...files, `Auto-detected by source-change-governance-detector at ${new Date().toISOString()}`],
    tags: ["0xray"],
  }));
}

async function main() {
  const changedFiles = scanFiles();

  if (changedFiles.length === 0) {
    console.log("No governance-interest files changed. Skipping.");
    return;
  }

  console.log(`Detected ${changedFiles.length} governance-interest file(s):`);
  for (const f of changedFiles) {
    console.log(`  ${f}`);
  }

  const proposals = buildProposals(changedFiles);
  console.log(`\nBuilt ${proposals.length} governance proposal(s):`);
  for (const p of proposals) {
    console.log(`  ${p.id}: ${p.title}`);
  }

  if (dryRun || !shouldApply) {
    console.log(`\nDry-run mode. Pass --apply to submit.`);
    return;
  }

  const { handleGovernRequest } = await import(
    resolve(PROJECT_ROOT, "dist", "nucleus", "index.js")
  );

  const results = [];
  for (const proposal of proposals) {
    console.log(`\nSubmitting: ${proposal.title}...`);
    try {
      const response = await handleGovernRequest({
        proposals: [{
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          type: proposal.type,
          source: proposal.source,
          confidence: proposal.confidence,
          evidence: proposal.evidence,
          tags: proposal.tags,
        }],
        context: {
          project: "xray",
          phase: "ci-auto-governance",
          source: "source-change-governance-detector",
          prTimestamp: new Date().toISOString(),
          tags: ["0xray"],
        },
        options: { requireExternalDynamo: true, timeoutMs: 30000 },
      });
      results.push({ id: proposal.id, decision: response.overallDecision });
      console.log(`  Result: ${response.overallDecision}`);
    } catch (err) {
      results.push({ id: proposal.id, decision: "error", error: err.message });
      console.error(`  FAILED: ${err.message}`);
    }
  }

  const approved = results.filter((r) => r.decision === "approve").length;
  const rejected = results.filter((r) => r.decision === "reject").length;
  const errors = results.filter((r) => r.decision === "error").length;
  console.log(`\nSummary: Approved ${approved}, Rejected ${rejected}, Errors ${errors}/${proposals.length}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Source-change governance detector failed:", err);
  process.exit(1);
});
