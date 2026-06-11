#!/usr/bin/env node
/**
 * retro-governance.mjs — Phase 0: Retro Governance Ritual.
 *
 * Submits the v3 enforcement cascade reflection through the governance pipeline
 * via handleGovernRequest. Creates proposals for the major work slices that
 * were executed without prior governance deliberation.
 *
 * Usage:
 *   node scripts/governance/retro-governance.mjs
 *   node scripts/governance/retro-governance.mjs --dry-run
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const dryRun = process.argv.includes("--dry-run");

// Build proposals from the v3 enforcement cascade work
const proposals = [
  {
    id: "retro-enforcement-gate-canonical-surface",
    title: "Codify enforcement-gate as canonical hook surface",
    description: "All four TUI/CLI integrations (OpenCode, Hermes, Grok, OpenClaw) now exclusively use beforeToolHook/afterToolHook from enforcement-gate.ts for code validation. 29-validator registry, PostProcessor escalation, and governance routing. Terms 8, 74, 77, 79-81.",
    type: "strategic",
    evidence: [
      "src/integrations/enforcement-gate.ts",
      "src/plugin/xray-codex-injection.ts",
      "src/integrations/hermes-agent/hermes-agent-integration.ts",
      "src/integrations/hermes-agent/bridge.mjs",
      "src/integrations/grok/hooks/pre-tool-use.ts",
      "src/integrations/openclaw/index.ts",
      "Enforcement gate pipeline resolution reflection",
    ],
  },
  {
    id: "retro-per-pipeline-matrix-ci-scanners",
    title: "Implement per-pipeline validation matrix + CI scanners",
    description: "codex.json perPipelineValidationMatrix with 15+ entries, all terms explicitly mapped. CI enforcement job: enforce-validators.mjs (29 validators), coverage gate (term 75), consumer check (term 76), E2E pipeline smoke (terms 76-81), compat-shim scanner (term 78), orphan-code pre-PR check (term 73). Pre-commit hook on shared enforcement infrastructure.",
    type: "strategic",
    evidence: [
      ".opencode/xray/codex.json",
      ".github/workflows/ci.yml",
      "scripts/ci/enforce-validators.mjs",
      "scripts/ci/e2e-pipeline-smoke.mjs",
      "scripts/ci/compat-shim-scanner.mjs",
      "scripts/ci/orphan-code-pre-pr-check.mjs",
      "scripts/hooks/run-hook.js",
      "Enforcement gate pipeline resolution reflection",
    ],
  },
  {
    id: "retro-nucleus-selfproposal-activation",
    title: "Activate nucleus handleGovernRequest + SelfProposal wiring",
    description: "handleGovernRequest is the canonical sole governance entry point (legacy MCP fallbacks removed). SelfProposalEngine wired into PostProcessor lifecycle, reads activity.log patterns, submits metamorphosis proposals through handleGovernRequest with circuit breaker, rate limiter, whitelist, metamorphosisThreshold >= 0.7 governance gate. Boot orchestration initializes governance integration.",
    type: "strategic",
    evidence: [
      "src/nucleus/govern-http.ts",
      "src/nucleus/index.ts",
      "src/postprocessor/metamorphosis/SelfProposalEngine.ts",
      "src/postprocessor/PostProcessor.ts",
      "src/core/boot-orchestrator.ts",
      "V3 pipeline review and next plan reflection",
    ],
  },
  {
    id: "retro-legacy-purge-boot-fallbacks",
    title: "Purge legacy connection/multimodal code and boot fallbacks",
    description: "Removed dead files (connection-manager, multimodal-looker, vendor.d.ts, legacy test files). Cleaned boot fallbacks from old architecture. Pre-commit hook (LightweightValidator) detected the deletions post-facto. Terms 2, 73, 74.",
    type: "codify",
    evidence: [
      "Deleted: src/__tests__/unit/connection/connection-manager.test.ts",
      "Deleted: src/__tests__/unit/multimodal-looker.test.ts",
      "Deleted: src/agents/multimodal-looker.ts",
      "Deleted: src/mcps/connection/connection-manager.ts",
      "Deleted: src/types/vendor.d.ts",
      "Enforcement gate pipeline resolution reflection",
    ],
  },
  {
    id: "retro-consumer-auto-install",
    title: "Consumer auto-install hooks + LightweightValidator distribution",
    description: "install-hooks.cjs auto-installs the pre-commit hook in consumer projects via postinstall and npx xray setup. LightweightValidator exports + runLightweightPreCommitValidation helper make pre-commit validation available to consumers. Consumer distribution path verified in PR CI.",
    type: "codify",
    evidence: [
      "scripts/hooks/install-hooks.cjs",
      "scripts/node/postinstall.cjs",
      "scripts/node/setup.cjs",
      "src/postprocessor/validation/LightweightValidator.ts",
      "Enforcement gate pipeline resolution reflection",
    ],
  },
];

async function main() {
  if (dryRun) {
    console.log("=== DRY RUN: Retro Governance Proposals ===\n");
    for (const p of proposals) {
      console.log(`Proposal: ${p.title}`);
      console.log(`  Type: ${p.type}`);
      console.log(`  Description: ${p.description}`);
      console.log(`  Evidence: ${p.evidence.length} entries`);
      console.log(`  Reflection: included in evidence`);
      console.log();
    }
    console.log(`${proposals.length} proposals ready for governance submission`);
    return;
  }

  // Load handleGovernRequest from dist
  const { handleGovernRequest } = await import(
    resolve(PROJECT_ROOT, "dist", "nucleus", "index.js")
  );

  // Submit each proposal through governance
  const results = [];
  for (const proposal of proposals) {
    console.log(`Submitting: ${proposal.title}...`);
    try {
      const response = await handleGovernRequest({
        type: "metamorphosis",
        proposals: [{
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          type: proposal.type,
          source: "architect-review",
          confidence: 0.85,
          evidence: proposal.evidence,
          options: { requireExternalDynamo: false },
          tags: ["0xray"],
        }],
        context: {
          project: "xray",
          phase: "v3-pipeline-cascade",
          source: "architect-review",
          reflectionRef: "docs/reflections/enforcement-gate-pipeline-resolution.md",
          tags: ["0xray"],
        },
        options: { requireExternalDynamo: false, timeoutMs: 30000 },
      });
      results.push({ id: proposal.id, decision: response.overallDecision });
      console.log(`  Result: ${response.overallDecision}`);
    } catch (err) {
      results.push({ id: proposal.id, decision: "error", error: err.message });
      console.error(`  FAILED: ${err.message}`);
    }
  }

  // Summary
  console.log("\n=== Retro Governance Summary ===");
  const approved = results.filter((r) => r.decision === "approve").length;
  const rejected = results.filter((r) => r.decision === "reject").length;
  const errors = results.filter((r) => r.decision === "error").length;
  console.log(`Approved: ${approved}, Rejected: ${rejected}, Errors: ${errors}/${proposals.length}`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Retro governance failed:", err);
  process.exit(1);
});
