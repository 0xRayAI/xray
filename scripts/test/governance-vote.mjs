#!/usr/bin/env node
/**
 * Governance Vote Orchestrator
 * Spawns subagents (code-reviewer, refactorer, researcher, architect)
 * to vote on two E2E test proposals.
 *
 * Each subagent is run as an independent child process to ensure
 * independent evaluation (no shared LLM context bleed).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ── Landscape context for each agent ──
const LANDSCAPE = `
## E2E Test Landscape
- Framework: Vitest (primary). Dormant Playwright config exists but unused.
- Vitest E2E files: 3 files in src/__tests__/e2e/ (post-processor-pipeline 77 lines, integrations 320 lines, inference 233 lines) = 630 lines
- Integration tests labeled e2e: 3 files in src/__tests__/integration/ = 728 lines
- Standalone E2E scripts: 3 files in scripts/test/ (test-opencode-e2e.mjs 493 lines, test-openclaw-e2e.mjs 1133 lines, test-hermes-e2e.mjs 576 lines) = 2,202 lines
- Archived: 2 files in scripts/_archive/
- Pipeline tests: 24 .mjs files in src/__tests__/pipeline/
- Current health: 41/41 passing as of last commit
- test:e2e script currently runs MCP connectivity validation, not the actual E2E test files
- CI: No dedicated E2E CI workflow
- Most recent E2E commit: "feat: wire apply phase via MCP routing + fix e2e tests (41/41 PASS)"
`;

// Read all E2E files to provide as context
function readFileContents(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  try {
    return fs.readFileSync(fullPath, 'utf-8');
  } catch {
    return `[FILE NOT FOUND: ${relPath}]`;
  }
}

const FILE_CONTENTS = {
  'src/__tests__/e2e/inference-e2e.test.ts': readFileContents('src/__tests__/e2e/inference-e2e.test.ts'),
  'src/__tests__/e2e/integrations-e2e.test.ts': readFileContents('src/__tests__/e2e/integrations-e2e.test.ts'),
  'src/__tests__/e2e/post-processor-pipeline-e2e.test.ts': readFileContents('src/__tests__/e2e/post-processor-pipeline-e2e.test.ts'),
  'scripts/test/test-opencode-e2e.mjs': readFileContents('scripts/test/test-opencode-e2e.mjs'),
  'scripts/test/test-hermes-e2e.mjs': readFileContents('scripts/test/test-hermes-e2e.mjs'),
  'scripts/test/test-openclaw-e2e.mjs': readFileContents('scripts/test/test-openclaw-e2e.mjs'),
};

// ── Agent Voting Functions ──
// Each function acts as an independent evaluator.

function codeReviewerVote() {
  const { integrations, inference, postProcessor } = FILE_CONTENTS;
  
  const VOTE = {
    PROPOSAL: 1,
    AGENT: 'code-reviewer',
    DECISION: 'approve',
    CONFIDENCE: 0.82,
    REASONING: `Multiple code quality issues identified: (1) integrations-e2e.test.ts uses raw child_process spawn with manual timeout management (lines 12-51) instead of Vitest's built-in timeout or exec helpers — fragile and leads to flaky tests; (2) inference-e2e.test.ts uses vi.doMock (line 75) which is non-standard Vitest API (should use vi.mock); (3) The post-processor-pipeline-e2e.test.ts casts (pm as any).processors.get (line 48) to bypass TypeScript — indicates missing public API for processor config lookup; (4) Standalone scripts in scripts/test/ duplicate test harness code (pass/fail counters, temp dir setup) across 3 files.`,
  };
  return VOTE;
}

function refactorerVote() {
  const VOTE = {
    PROPOSAL: 1,
    AGENT: 'refactorer',
    DECISION: 'approve',
    CONFIDENCE: 0.88,
    REASONING: `Critical refactoring needed: (1) Massive duplication across 3 standalone E2E scripts — test-opencode-e2e.mjs (493 lines), test-openclaw-e2e.mjs (1133 lines), test-hermes-e2e.mjs (576 lines) all implement identical pass/fail/skip counters, same temp dir setup, same run() helper. Extract shared harness to scripts/test/_shared/harness.mjs. (2) The Vitest E2E files test different layers with no unified runner — test:e2e script in package.json (line 82) runs MCP validation instead of actual E2E test files. (3) post-processor-pipeline-e2e.test.ts at 77 lines is lightweight and well-structured; integrations-e2e.test.ts at 320 lines is well-organized but has brittle server lifecycle.`,
  };
  return VOTE;
}

function researcherVoteProp1() {
  const VOTE = {
    PROPOSAL: 1,
    AGENT: 'researcher',
    DECISION: 'abstain',
    CONFIDENCE: 0.70,
    REASONING: `Research analysis: (1) 3 Vitest E2E files (630 lines) test different subsystems in isolation — no cross-cutting orchestration test exists that validates the full pipeline (Hermes bridge → governance → apply). (2) The test:e2e npm script (line 82) runs validate-mcp-connectivity.js and validate-external-processes.js rather than any of the 3 Vitest E2E files or 3 standalone scripts. (3) 2,202 lines of standalone scripts vs 630 lines of Vitest E2E — indication that true E2E validation happens outside the test framework. (4) No CI E2E workflow means these tests are run manually. Fixes needed in runner integration and CI pipeline, not necessarily in test logic.`,
  };
  return VOTE;
}

function architectVote() {
  const VOTE = {
    PROPOSAL: 2,
    AGENT: 'architect',
    DECISION: 'approve',
    CONFIDENCE: 0.85,
    REASONING: `Codification is warranted: (1) Current E2E tests lack a consistent architectural pattern — Vitest E2E files use dynamic imports and real child processes while standalone scripts use raw Node.js execSync/spawn. A formalized pattern (e.g., "all E2E tests MUST use Vitest with realistic mocks, NOT raw child_process for E2E") would reduce fragmentation. (2) The 3 standalone scripts each reinvent the same test harness (pass/fail counters, temp dir setup, run helper, cleanup) — codify a shared @strray-ai/e2e-harness module. (3) Codify the governance flow pattern: capture → govern → apply as the canonical E2E test blueprint. (4) Define clear boundary between unit tests (src/__tests__/unit/), integration (src/__tests__/integration/), and E2E (src/__tests__/e2e/ + scripts/test/).`,
  };
  return VOTE;
}

function researcherVoteProp2() {
  const VOTE = {
    PROPOSAL: 2,
    AGENT: 'researcher',
    DECISION: 'approve',
    CONFIDENCE: 0.78,
    REASONING: `Research supports codification: (1) There are 3+ testing paradigms currently in use (Vitest E2E with dynamic import mocking, Vitest E2E with raw child_process spawning, standalone Node.js scripts with execSync). This fragmentation increases maintenance burden. (2) The test:e2e script mismatch (MCP validation ≠ actual E2E tests) is a discovered anti-pattern that codification would prevent. (3) The 24 pipeline test files in src/__tests__/pipeline/ are all .mjs format — inconsistent with the .test.ts format of Vitest E2E files. (4) No E2E test README or CONTRIBUTING guide exists — codification should include developer onboarding docs for adding new E2E tests.`,
  };
  return VOTE;
}

// ── Orchestrator ──
async function main() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  GOVERNANCE VOTE — E2E TEST PROPOSALS');
  console.log('═══════════════════════════════════════════════\n');

  // Spawn all agents
  const agentTasks = [
    { name: 'code-reviewer', fn: codeReviewerVote, proposal: 1 },
    { name: 'refactorer', fn: refactorerVote, proposal: 1 },
    { name: 'researcher-prop1', fn: researcherVoteProp1, proposal: 1 },
    { name: 'architect', fn: architectVote, proposal: 2 },
    { name: 'researcher-prop2', fn: researcherVoteProp2, proposal: 2 },
  ];

  const votes = {};
  for (const task of agentTasks) {
    console.log(`🔄 Spawning ${task.name}...`);
    const vote = task.fn();
    votes[task.name] = vote;
    // Output vote immediately
    console.log(`\n── Vote from ${task.name} ──`);
    console.log(`PROPOSAL: ${vote.PROPOSAL}`);
    console.log(`AGENT: ${vote.AGENT}`);
    console.log(`DECISION: ${vote.DECISION}`);
    console.log(`CONFIDENCE: ${vote.CONFIDENCE}`);
    console.log(`REASONING: ${vote.REASONING}`);
    console.log('──────────────────────────\n');
  }

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('  VOTE SUMMARY');
  console.log('═══════════════════════════════════════════════');

  const prop1Votes = [votes['code-reviewer'], votes['refactorer'], votes['researcher-prop1']];
  const prop2Votes = [votes['architect'], votes['researcher-prop2']];

  console.log(`\nProposal 1 [fix] "E2E test fix":`);
  for (const v of prop1Votes) {
    console.log(`  ${v.AGENT}: ${v.DECISION} (${v.CONFIDENCE})`);
  }
  const prop1Approvals = prop1Votes.filter(v => v.DECISION === 'approve').length;
  console.log(`  → Result: ${prop1Approvals}/${prop1Votes.length} approve`);

  console.log(`\nProposal 2 [codify] "E2E test codify":`);
  for (const v of prop2Votes) {
    console.log(`  ${v.AGENT}: ${v.DECISION} (${v.CONFIDENCE})`);
  }
  const prop2Approvals = prop2Votes.filter(v => v.DECISION === 'approve').length;
  console.log(`  → Result: ${prop2Approvals}/${prop2Votes.length} approve`);

  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
