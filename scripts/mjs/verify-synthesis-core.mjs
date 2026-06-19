#!/usr/bin/env node
/**
 * Synthesis PR1 fixture — slice counter + synthesisDue rhythm.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');

const {
  recordExecutionSlice,
  completeSynthesisCheckpoint,
  isSynthesisCheckpointDue,
  loadSynthesisCheckpointState,
} = await import(join(packageRoot, 'dist/nucleus/synthesis.js'));

const sessionId = 'verify-synthesis';
let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-verify-'));
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    synthesis: { enabled: true, every_n_gates: 2, every_n_turns: 0, every_n_todos_completed: 0 },
  }),
);

try {
  recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  if (!isSynthesisCheckpointDue(tmp, sessionId)) pass('not due after 1 gate');
  else fail('premature due after 1 gate');

  const second = recordExecutionSlice('gate', { projectRoot: tmp, sessionId });
  if (second?.becameDue && isSynthesisCheckpointDue(tmp, sessionId)) {
    pass('synthesisDue after gate threshold');
  } else {
    fail('synthesisDue threshold', JSON.stringify(second));
  }

  const completed = completeSynthesisCheckpoint(tmp, sessionId);
  if (completed?.synthesisCount === 1 && !completed.synthesisDue) {
    pass('checkpoint complete resets due');
  } else {
    fail('checkpoint complete', JSON.stringify(completed));
  }

  const state = loadSynthesisCheckpointState(tmp);
  if (state?.slicesSinceLastSynthesis.gates === 0) pass('counters reset after synthesis');
  else fail('counter reset', JSON.stringify(state?.slicesSinceLastSynthesis));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Synthesis verify passed (4/4).'
      : `⚠️  ${failed} synthesis check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);