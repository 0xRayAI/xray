#!/usr/bin/env node

/**
 * Govern Reflection — Feed a deep reflection's codex term proposals
 * through the inference governance pipeline.
 *
 * Usage: node scripts/node/govern-reflection.mjs <reflection-path>
 */

import * as fs from "fs";
import * as path from "path";

const REFLECTION_PATH = process.argv[2];
if (!REFLECTION_PATH) {
  console.error("Usage: node scripts/node/govern-reflection.mjs <reflection-path>");
  process.exit(1);
}

const CODEX_TERM_SECTION = "## Codex Term Proposals";
const PRIORITY_SECTION = "## Implementation Priority Matrix";

function parseCodexTerms(content) {
  const startIdx = content.indexOf(CODEX_TERM_SECTION);
  const endIdx = content.indexOf(PRIORITY_SECTION);
  if (startIdx === -1) return [];

  const section = endIdx !== -1
    ? content.slice(startIdx + CODEX_TERM_SECTION.length, endIdx)
    : content.slice(startIdx + CODEX_TERM_SECTION.length);

  const terms = [];
  const blocks = section.split(/\n### /).filter(b => b.trim().length > 0);

  for (const block of blocks) {
    const nameMatch = block.match(/^([^\n]+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();

    const catMatch = block.match(/\*\*Category\*\*:\s*(.+)/);
    const sevMatch = block.match(/\*\*Severity\*\*:\s*(.+)/);
    const ruleMatch = block.match(/\*\*Detection Rule\*\*:\s*"(.+)"/);
    const targetMatch = block.match(/\*\*Implementation Target\*\*:\s*(.+)/);
    const relatedMatch = block.match(/\*\*Existing Related\*\*:\s*(.+)/);

    const severity = sevMatch?.[1]?.trim() ?? "medium";
    const category = catMatch?.[1]?.trim() ?? "design";

    let type = "codify";
    if (category === "anti-pattern") type = "guard";
    else if (category === "aspirational") type = "codify";
    else if (category === "process") type = "automate";
    else if (category === "design") type = "refactor";

    terms.push({
      id: `ext-${Date.now()}-${terms.length}`,
      type,
      title: name,
      description: ruleMatch?.[1] ?? `Implement ${name}`,
      evidence: [
        `Severity: ${severity}`,
        `Target: ${targetMatch?.[1]?.trim() ?? "TBD"}`,
        relatedMatch?.[1] ? `Related: ${relatedMatch[1].trim()}` : "No existing related mechanism",
      ],
      confidence: severity === "blocking" ? 0.95 : severity === "high" ? 0.85 : severity === "medium" ? 0.7 : 0.5,
      source: "recurring_pattern",
      status: "pending",
      severity,
      category,
      detectionRule: ruleMatch?.[1] ?? "",
      implementationTarget: targetMatch?.[1]?.trim() ?? "",
    });
  }

  return terms;
}

async function main() {
  const resolvedPath = path.resolve(REFLECTION_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const terms = parseCodexTerms(content);

  if (terms.length === 0) {
    console.error("No codex term proposals found in reflection.");
    process.exit(1);
  }

  console.log(`\n📋 Parsed ${terms.length} codex term proposals from reflection\n`);
  console.log("Proposals to govern:");
  for (const t of terms) {
    console.log(`  • [${t.type}] ${t.title} (${t.severity}, confidence: ${t.confidence})`);
  }
  console.log(`\n🔄 Feeding ${terms.length} proposals through governance pipeline...\n`);

  const { InferenceCycle } = await import("../../dist/inference/inference-cycle.js");

  const cycle = new InferenceCycle(process.cwd(), undefined, {
    skipApply: true,
    skipDeployVerify: true,
    skipResearcherReview: true,
  });

  const result = await cycle.governExternalProposals(terms);

  console.log("\n═══════════════════════════════════════");
  console.log("  GOVERNANCE RESULTS");
  console.log("═══════════════════════════════════════\n");

  const approved = result.proposals.filter(p => p.status === "approved");
  const rejected = result.proposals.filter(p => p.status === "rejected");

  console.log(`  Approved: ${approved.length}  |  Rejected: ${rejected.length}\n`);

  if (approved.length > 0) {
    console.log("  ✅ APPROVED:\n");
    for (const p of approved) {
      const vote = result.votes.find(v => v.proposalId === p.id);
      console.log(`  ${p.title}`);
      console.log(`    Decision: ${vote?.decision} (confidence: ${vote?.confidence?.toFixed(2)})`);
      if (vote?.details?.length) {
        console.log(`    Votes: ${vote.details.join("; ")}`);
      }
      console.log();
    }
  }

  if (rejected.length > 0) {
    console.log("  ❌ REJECTED:\n");
    for (const p of rejected) {
      const vote = result.votes.find(v => v.proposalId === p.id);
      console.log(`  ${p.title}`);
      console.log(`    Decision: ${vote?.decision} (confidence: ${vote?.confidence?.toFixed(2)})`);
      if (vote?.details?.length) {
        console.log(`    Votes: ${vote.details.join("; ")}`);
      }
      console.log();
    }
  }

  console.log("═══════════════════════════════════════");
  console.log(`  Cycle: ${result.cycleId}`);
  console.log(`  Phase: ${result.phase}`);
  console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log("═══════════════════════════════════════\n");

  // v2 path under logs/ (fwLogger discipline) + .xray/
  const outputPath = path.join(process.cwd(), "logs", "framework", "governance-result.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`  Results saved to: ${outputPath}\n`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
