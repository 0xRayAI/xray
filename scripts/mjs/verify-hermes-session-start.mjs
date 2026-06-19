#!/usr/bin/env node
/**
 * Hermes session-start bridge — stale plan archival with synthesis exemption.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const bridge = join(packageRoot, 'dist/integrations/hermes-agent/bridge.mjs');

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function runBridge(payload, cwd) {
  const json = JSON.stringify(payload).replace(/'/g, "'\\''");
  const out = execSync(`node "${bridge}" session-start --cwd "${cwd}" '${json}'`, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, XRAY_ROOT: cwd },
  });
  return JSON.parse(out.trim());
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-hermes-session-'));
const planPath = join(tmp, '.xray', 'state', 'lead-dev-plan.json');
mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
writeFileSync(
  join(tmp, '.xray', 'features.json'),
  JSON.stringify({
    multi_agent_orchestration: {
      enabled: true,
      lead_dev_mode: true,
      auto_consult_major_work: true,
    },
    synthesis: { enabled: true, every_n_gates: 1, every_n_turns: 0, every_n_todos_completed: 0 },
  }),
);

const staleAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
const synthesisPlan = {
  active: true,
  persistedAt: staleAt,
  sessionId: 'hermes-session-start-fixture',
  phases: [
    {
      id: 'phase-synthesis',
      name: 'Reflect & realign',
      goal: 'consult',
      definitionOfDone: 'done',
      todos: [
        { id: 's.1', task: 'researcher consult', subagent: 'researcher', status: 'pending' },
        { id: 's.2', task: 'architect consult', subagent: 'architect-tools', status: 'pending' },
        { id: 's.3', task: 'review consult', subagent: 'code-review', status: 'pending' },
      ],
    },
  ],
};
writeFileSync(planPath, JSON.stringify(synthesisPlan, null, 2));

try {
  const result = runBridge({ command: 'session-start', sessionId: 'hermes-session-start-fixture' }, tmp);
  if (result.ok === true) pass('bridge session-start returns ok');
  else fail('session-start ok', JSON.stringify(result));

  if (existsSync(planPath)) pass('aged synthesis plan survives session-start archival');
  else fail('synthesis plan preserved', 'lead-dev-plan.json missing');

  const archived = result.planArchive?.archived === true;
  if (!archived) pass('session-start did not archive protected synthesis plan');
  else fail('synthesis archive skip', JSON.stringify(result.planArchive));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Hermes session-start verify passed (3/3).'
      : `⚠️  ${failed} Hermes session-start check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);