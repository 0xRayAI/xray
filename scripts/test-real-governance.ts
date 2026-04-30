import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { InferenceCycle } from "../src/inference/inference-cycle.js";
import { SessionInference } from "../src/inference/session-capture.js";

function makeSession(id: string, commits: number, problems: string[]): SessionInference {
  return {
    sessionId: id,
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    span: { from: "abc1234", to: "def5678" },
    problems,
    approaches: ["Incremental refactoring approach"],
    wrongTurns: ["Initially tried broad rewrite before narrowing scope"],
    solutions: problems.map((p) => `Resolved: ${p}`),
    reasoningChain: problems.map((p) => ({
      from: "approach",
      to: "solution",
      reasoning: `Incremental approach → resolved ${p}`,
    })),
    patterns: [],
    metrics: {
      commits,
      filesChanged: commits * 3,
      insertions: commits * 45,
      deletions: commits * 20,
      filesAdded: Math.floor(commits * 0.5),
      filesRemoved: Math.floor(commits * 0.2),
    },
  };
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "strray-governance-real-"));
  const inferenceDir = path.join(tmpDir, "docs", "inference");
  fs.mkdirSync(inferenceDir, { recursive: true });

  const problemSets = [
    [
      "Bug: fix: null pointer in processor registry lookup (aa1111)",
      "Bug: fix: race condition in async processor execution (bb2222)",
      "Accumulated dead code: unused imports in cycle module",
    ],
    [
      "Bug: fix: null pointer in processor registry lookup (cc3333)",
      "Technical debt requiring stability focus in module loader",
    ],
    [
      "Bug: fix: race condition in async processor execution (dd4444)",
      "Manual step that should be automated: version bumping",
      "Accumulated dead code: legacy handler exports",
    ],
    [
      "Bug: fix: null pointer in processor registry lookup (ee5555)",
      "Bug: fix: timing issue in test parallel execution (ff6666)",
      "Manual step that should be automated: changelog generation",
    ],
    [
      "Bug: fix: null pointer in processor registry lookup (gg7777)",
      "Technical debt requiring stability focus in validator chain",
      "Missing guard for edge case: empty corpus in accumulator",
    ],
  ];

  for (let i = 0; i < problemSets.length; i++) {
    const session = makeSession(`real-gov-s${i}`, 8 + i * 2, problemSets[i]!);
    fs.writeFileSync(
      path.join(inferenceDir, `session-real-gov-s${i}.json`),
      JSON.stringify(session, null, 2),
    );
  }

  console.log(`\n=== Real Governance E2E Test ===`);
  console.log(`Temp dir: ${tmpDir}`);
  console.log(`Sessions: ${problemSets.length}, Total commits: ${problemSets.reduce((s, _, i) => s + 8 + i * 2, 0)}`);
  console.log(`\nRunning InferenceCycle WITHOUT mock (real opencode agents)...\n`);

  const cycle = new InferenceCycle(tmpDir);

  const result = await cycle.maybeRunCycle();

  console.log(`\n=== Cycle Result ===`);
  console.log(`Triggered: ${result.triggered}`);
  console.log(`Phase: ${result.phase}`);
  console.log(`Reason: ${result.triggerReason}`);

  if (result.corpusSummary) {
    console.log(`\nCorpus:`);
    console.log(`  Sessions: ${result.corpusSummary.sessions}`);
    console.log(`  Total commits: ${result.corpusSummary.totalCommits}`);
    console.log(`  Recurring problems: ${result.corpusSummary.recurringProblems}`);
    console.log(`  Recurring patterns: ${result.corpusSummary.recurringPatterns}`);
  }

  if (result.proposals.length > 0) {
    console.log(`\nProposals (${result.proposals.length}):`);
    for (const p of result.proposals) {
      console.log(`  [${p.status}] ${p.type}: ${p.title}`);
      console.log(`    Confidence: ${(p.confidence * 100).toFixed(0)}%  Evidence: ${p.evidence.length} items`);
    }
  }

  if (result.votes.length > 0) {
    console.log(`\nVotes (${result.votes.length}):`);
    let realVotes = 0;
    let fallbackVotes = 0;
    for (const v of result.votes) {
      const isFallback = v.details.some((d) => d.includes("fallback"));
      if (isFallback) {
        fallbackVotes++;
      } else {
        realVotes++;
      }
      console.log(`  Proposal ${v.proposalId}: ${v.decision} (${(v.confidence * 100).toFixed(0)}%)`);
      for (const d of v.details) {
        console.log(`    ${d}`);
      }
    }
    console.log(`\n  Real agent votes: ${realVotes}`);
    console.log(`  Fallback votes:   ${fallbackVotes}`);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  const hasRealVotes = result.votes.some((v) => !v.details.some((d) => d.includes("fallback")));

  if (!hasRealVotes) {
    console.log(`\n⚠️  No real agent votes detected — all governance used heuristic fallback`);
    console.log(`   This means opencode agents did not respond.`);
    process.exit(1);
  }

  console.log(`\n✅ Real governance cycle complete — agents voted via opencode`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
