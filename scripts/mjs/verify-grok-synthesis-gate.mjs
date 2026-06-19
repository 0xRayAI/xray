#!/usr/bin/env node
/**
 * Hook fixture verify — PreToolUse synthesis gate via live Grok hook path.
 * Run: node scripts/mjs/verify-grok-synthesis-gate.mjs
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SYNTHESIS_FIXTURE_SESSION_ID,
  seedSynthesisDueFixture,
} from './delegation-gate-fixture.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const preToolHook = join(packageRoot, 'dist/integrations/grok/hooks/pre-tool-use.js');

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function runHook(fixture, env = {}) {
  const payload = JSON.stringify(fixture);
  const out = execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${preToolHook}"`, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return JSON.parse(out.trim());
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-synth-grok-'));
seedSynthesisDueFixture(tmp);

const baseEnv = {
  GROK_WORKSPACE_ROOT: tmp,
  GROK_SESSION_ID: SYNTHESIS_FIXTURE_SESSION_ID,
};

try {
  const denyWrite = runHook(
    {
      toolName: 'search_replace',
      workspaceRoot: tmp,
      sessionId: SYNTHESIS_FIXTURE_SESSION_ID,
      toolInput: { path: 'src/a.ts', new_string: 'x' },
    },
    baseEnv,
  );
  if (denyWrite.decision === 'deny' && denyWrite.gate === 'synthesis-checkpoint') {
    pass('PreToolUse denies write when synthesis due');
  } else {
    fail('synthesis write deny', JSON.stringify(denyWrite));
  }

  const allowRead = runHook(
    {
      toolName: 'read_file',
      workspaceRoot: tmp,
      sessionId: SYNTHESIS_FIXTURE_SESSION_ID,
      toolInput: { path: 'src/a.ts' },
    },
    baseEnv,
  );
  if (allowRead.decision === 'allow') pass('PreToolUse allows read when synthesis due');
  else fail('synthesis read allow', JSON.stringify(allowRead));

  const allowConsult = runHook(
    {
      toolName: 'CallMcpTool',
      workspaceRoot: tmp,
      sessionId: SYNTHESIS_FIXTURE_SESSION_ID,
      toolInput: {
        server: 'xray-orchestrator',
        toolName: 'analyze-complexity',
        arguments: { tasks: [{ description: 'synthesis reflect', type: 'plan' }] },
      },
    },
    baseEnv,
  );
  if (allowConsult.decision === 'allow') {
    pass('PreToolUse allows analyze-complexity consult when synthesis due');
  } else {
    fail('synthesis consult allow', JSON.stringify(allowConsult));
  }

  const denyGovern = runHook(
    {
      toolName: 'CallMcpTool',
      workspaceRoot: tmp,
      sessionId: SYNTHESIS_FIXTURE_SESSION_ID,
      toolInput: {
        server: 'xray-orchestrator',
        toolName: 'govern-and-apply',
        arguments: { proposal: 'test' },
      },
    },
    baseEnv,
  );
  if (denyGovern.decision === 'deny' && denyGovern.gate === 'synthesis-checkpoint') {
    pass('PreToolUse denies govern-and-apply when synthesis due');
  } else {
    fail('synthesis govern deny', JSON.stringify(denyGovern));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  '\n' +
    (failed === 0
      ? '🎉 Grok synthesis gate verify passed (4/4).'
      : `⚠️  ${failed} synthesis gate check(s) failed.`),
);
process.exit(failed === 0 ? 0 : 1);