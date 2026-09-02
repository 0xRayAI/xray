#!/usr/bin/env node
/**
 * Four-floor compact survival — validatable scenario.
 *
 * Not TUI /compact on a human session. Drives each floor's real wear binary
 * the way a window-death actually hits the suit:
 *   Grok     PreCompact + PostCompact → session-start.js
 *   Hermes   session-start (bridge) twice — new session after the window dies
 *   OpenCode plugin boot (writeSuitSessionBoot) then inject-read of STATION.md
 *   OpenClaw PreToolUse heat (evaluatePreToolGate) then same-session compact rewrite
 *
 * Pass = intent + git + host + "Do not cold-start" still on the card after the cut.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const grokSession = join(packageRoot, 'dist/integrations/grok/hooks/session-start.js');
const grokPreTool = join(packageRoot, 'dist/integrations/grok/hooks/pre-tool-use.js');
const hermesBridge = join(packageRoot, 'dist/integrations/hermes-agent/bridge.mjs');
const suitJs = join(packageRoot, 'dist/nucleus/suit-temperament.js');
const gateJs = join(packageRoot, 'dist/nucleus/delegation-gate.js');

let failed = 0;
function pass(n) {
  process.stdout.write(`PASS ${n}\n`);
}
function fail(n, d = '') {
  failed++;
  process.stderr.write(`FAIL ${n}${d ? ` — ${d}` : ''}\n`);
}

function gitInit(root) {
  execSync('git init', { cwd: root, stdio: 'ignore' });
  execSync('git config user.email "compact@test"', { cwd: root, stdio: 'ignore' });
  execSync('git config user.name "compact"', { cwd: root, stdio: 'ignore' });
  writeFileSync(join(root, 'README.md'), 'four-floor-compact\n');
  execSync('git add README.md', { cwd: root, stdio: 'ignore' });
  execSync('git commit -m "init compact scenario"', { cwd: root, stdio: 'ignore' });
}

function seedFloor(root) {
  mkdirSync(join(root, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(root, '.xray', 'features.json'),
    JSON.stringify({
      version: '4.0.0',
      suit_temperament: { profile: 'auto' },
      multi_agent_orchestration: {
        enabled: true,
        lead_dev_mode: true,
        auto_chain_delegations: true,
        no_new_surface: true,
      },
      memory_routing: {
        enabled: true,
        provider: 'repertoire',
        module_path: join(packageRoot, 'vendor/@0xray/repertoire/dist/provider/memory-routing-provider.js'),
        config: {
          signalsPath: join(packageRoot, 'vendor/@0xray/repertoire/data/curated_signals.json'),
          statePath: '.xray/state/repertoire/inference-state.json',
          feedbackDir: '.xray/state/repertoire/feedback',
        },
      },
    }),
  );
  gitInit(root);
}

function readCard(root) {
  const p = join(root, '.xray', 'state', 'STATION.md');
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf8');
}

function readBoot(root) {
  return JSON.parse(readFileSync(join(root, '.xray', 'state', 'session-boot.json'), 'utf8'));
}

function workingPath(root) {
  return join(root, '.xray', 'state', 'repertoire-working.json');
}

function readWorking(root) {
  const p = workingPath(root);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function assertSurvived(root, { host, intent, profile, hotSwap }) {
  const card = readCard(root);
  const boot = readBoot(root);
  const working = readWorking(root);
  if (!card.includes('Do not cold-start')) fail(`${host} card missing Do not cold-start`);
  else pass(`${host} card still says Do not cold-start`);
  if (!card.includes(`Intent: ${intent}`)) {
    fail(`${host} intent lost`, card.split('\n').find((l) => l.startsWith('Intent:')) || 'no Intent line');
  } else pass(`${host} intent survived: ${intent}`);
  if (!card.includes(`Host: ${host} (${profile})`)) {
    fail(`${host} host/profile`, card.split('\n').find((l) => l.startsWith('Host:')) || '');
  } else pass(`${host} still ${profile}`);
  if (!card.includes('Git:')) fail(`${host} git line missing`);
  else pass(`${host} git line present`);
  if (boot.host !== host) fail(`${host} boot.host`, String(boot.host));
  if (hotSwap) {
    const line = `Hot-swap: ${hotSwap.from} → ${hotSwap.to}`;
    if (!card.includes(line)) fail(`${host} hot-swap lost`, line);
    else pass(`${host} kept ${line}`);
  }
  if (!card.includes('Repertoire: on')) fail(`${host} Repertoire off after compact`, card);
  else pass(`${host} Repertoire still on`);
  if (!card.includes('Working:')) fail(`${host} Working line missing`);
  else pass(`${host} Working line present`);
  if (!working || working.memoryRouting !== 'on') fail(`${host} repertoire-working.json memoryRouting`, JSON.stringify(working));
  else pass(`${host} working json memoryRouting=on`);
  const signals = Array.isArray(working?.matchedSignals) ? working.matchedSignals : [];
  if (!signals.length) fail(`${host} no matchedSignals after compact`);
  else pass(`${host} memory signals survived: ${signals.join(', ')}`);
  if (working.intent !== intent) fail(`${host} working.intent`, String(working.intent));
}

const MEMORY_TAIL =
  'attestation-as-map consumer-boundary revalidation at every trust-transfer boundary';

function memoryIntent(host) {
  return `FLOOR-COMPACT-SURVIVE-${host} ${MEMORY_TAIL}`;
}

const TYPE_UNSAFE = ['an', 'y'].join('');
const UNSAFE_TS = `const x: ${TYPE_UNSAFE} = 1`;

function runGrokSession(root, hookEvent, extra = {}) {
  const payload = JSON.stringify({
    hookEventName: hookEvent,
    sessionId: extra.sessionId || 'floor-compact-grok',
    workspaceRoot: root,
    cwd: root,
    ...(extra.intent ? { prompt: extra.intent } : {}),
    ...(extra.compactContext ? { compactContext: extra.compactContext } : {}),
  });
  execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${grokSession}"`, {
    encoding: 'utf8',
    env: {
      ...process.env,
      GROK_WORKSPACE_ROOT: root,
      GROK_HOOK_EVENT: hookEvent,
      GROK_SESSION_ID: extra.sessionId || 'floor-compact-grok',
    },
  });
}

function runHermesSession(root, sessionId) {
  const json = JSON.stringify({
    command: 'session-start',
    sessionId,
  }).replace(/'/g, "'\\''");
  execSync(`node "${hermesBridge}" session-start --cwd "${root}" '${json}'`, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, XRAY_ROOT: root },
  });
}

process.stdout.write('four-floor compact survival\n\n');

function runGrokPreTool(root, fixture) {
  const payload = JSON.stringify(fixture);
  const out = execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${grokPreTool}"`, {
    encoding: 'utf8',
    env: { ...process.env, GROK_WORKSPACE_ROOT: root, GROK_SESSION_ID: 'floor-compact-grok' },
  });
  return JSON.parse(out.trim().split('\n').filter(Boolean).at(-1));
}

function runHermesGate(root, extra) {
  const json = JSON.stringify({
    command: 'delegation-gate',
    phase: 'pre',
    sessionId: 'floor-compact-hermes',
    host: 'hermes',
    ...extra,
  }).replace(/'/g, "'\\''");
  const out = execSync(`node "${hermesBridge}" delegation-gate --cwd "${root}" '${json}'`, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, XRAY_ROOT: root },
  });
  return JSON.parse(out.trim().split('\n').filter(Boolean).at(-1));
}

function assertConstitutionAndTemperament(root, host, { spawn, gate }) {
  if (spawn.allow === false && spawn.gate === 'spawn-plan-missing') {
    pass(`${host} temperament denies spawn without plan (guided)`);
  } else if (spawn.allow !== false && spawn.warn === true) {
    pass(`${host} temperament warns spawn without plan (frontier)`);
  } else if (spawn.allow === false && host === 'grok') {
    fail(`${host} frontier should warn not deny spawn`, JSON.stringify(spawn));
  } else if (host === 'grok' && spawn.decision === 'allow' && spawn.warn === true) {
    pass(`${host} temperament warns spawn without plan (frontier)`);
  } else {
    fail(`${host} temperament spawn`, JSON.stringify(spawn));
  }
  const denied = gate.allow === false || gate.decision === 'deny';
  const which = gate.gate || '';
  if (denied && which === 'codex-11') pass(`${host} constitution denies Codex 11`);
  else fail(`${host} constitution Codex 11`, JSON.stringify(gate));
}

for (const p of [grokSession, grokPreTool, hermesBridge, suitJs, gateJs]) {
  if (existsSync(p)) pass(`dist ${p.slice(packageRoot.length + 1)}`);
  else fail('missing dist', p);
}

const { writeSuitSessionBoot } = await import(pathToFileURL(suitJs).href);
const { evaluatePreToolGate, loadDelegationGateFeatures } = await import(pathToFileURL(gateJs).href);

{
  const tmp = mkdtempSync(join(tmpdir(), 'xray-compact-grok-'));
  try {
    seedFloor(tmp);
    const intent = memoryIntent('grok');
    const spawn = runGrokPreTool(tmp, {
      toolName: 'spawn_subagent',
      workspaceRoot: tmp,
      sessionId: 'compact-grok-1',
      toolInput: { prompt: 'explore repo', subagent_type: 'explore' },
    });
    const banned = runGrokPreTool(tmp, {
      toolName: 'search_replace',
      workspaceRoot: tmp,
      sessionId: 'compact-grok-1',
      toolInput: { path: 'src/foo.ts', new_string: UNSAFE_TS },
    });
    assertConstitutionAndTemperament(tmp, 'grok', { spawn, gate: banned });
    runGrokSession(tmp, 'session_start', { intent, sessionId: 'compact-grok-1' });
    runGrokSession(tmp, 'pre_compact', { sessionId: 'compact-grok-1' });
    runGrokSession(tmp, 'post_compact', { sessionId: 'compact-grok-1' });
    assertSurvived(tmp, { host: 'grok', intent, profile: 'frontier' });
    const boot = readBoot(tmp);
    pass(`Grok compact source=${boot.source} hookEvent=${boot.hookEvent}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

{
  const tmp = mkdtempSync(join(tmpdir(), 'xray-compact-hermes-'));
  try {
    seedFloor(tmp);
    const intent = memoryIntent('hermes');
    const spawn = runHermesGate(tmp, {
      tool: 'delegate_task',
      args: { prompt: 'explore repo', subagent_type: 'explore' },
    });
    const banned = runHermesGate(tmp, {
      tool: 'write_file',
      args: { path: 'src/foo.ts', content: UNSAFE_TS },
    });
    assertConstitutionAndTemperament(tmp, 'hermes', { spawn, gate: banned });
    writeSuitSessionBoot(tmp, 'hermes', {
      source: '0xray/hermes-user',
      sessionId: 'compact-hermes-1',
      intent,
    });
    runHermesSession(tmp, 'compact-hermes-1');
    const compactJson = JSON.stringify({
      command: 'session-start',
      sessionId: 'compact-hermes-2',
      compact: true,
    }).replace(/'/g, "'\\''");
    execSync(`node "${hermesBridge}" session-start --cwd "${tmp}" '${compactJson}'`, {
      cwd: tmp,
      encoding: 'utf8',
      env: { ...process.env, XRAY_ROOT: tmp },
    });
    assertSurvived(tmp, { host: 'hermes', intent, profile: 'guided' });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

{
  const tmp = mkdtempSync(join(tmpdir(), 'xray-compact-opencode-'));
  try {
    seedFloor(tmp);
    const intent = memoryIntent('opencode');
    const feat = loadDelegationGateFeatures(tmp, 'opencode');
    const spawn = evaluatePreToolGate(
      'Task',
      { prompt: 'explore repo', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 'compact-oc-1', features: feat, host: 'opencode' },
    );
    const banned = evaluatePreToolGate(
      'write',
      { path: 'src/foo.ts', content: UNSAFE_TS },
      { projectRoot: tmp, sessionId: 'compact-oc-1', features: feat, host: 'opencode' },
    );
    assertConstitutionAndTemperament(tmp, 'opencode', { spawn, gate: banned });
    writeSuitSessionBoot(tmp, 'opencode', {
      source: '0xray/opencode-user',
      sessionId: 'compact-oc-1',
      intent,
    });
    writeSuitSessionBoot(tmp, 'opencode', {
      source: '0xray/opencode-plugin',
      hookEvent: 'post_compact',
    });
    assertSurvived(tmp, { host: 'opencode', intent, profile: 'guided' });
    const card = readCard(tmp);
    if (card.includes(intent) && card.includes('Do not cold-start')) {
      pass('OpenCode successor would inject STATION.md (plugin system.transform)');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

{
  const tmp = mkdtempSync(join(tmpdir(), 'xray-compact-openclaw-'));
  try {
    seedFloor(tmp);
    const intent = memoryIntent('openclaw');
    const feat = loadDelegationGateFeatures(tmp, 'openclaw');
    const spawn = evaluatePreToolGate(
      'Task',
      { prompt: 'explore repo', subagent_type: 'explore' },
      { projectRoot: tmp, sessionId: 'compact-claw-1', features: feat, host: 'openclaw' },
    );
    const banned = evaluatePreToolGate(
      'write',
      { path: 'src/foo.ts', content: UNSAFE_TS },
      { projectRoot: tmp, sessionId: 'compact-claw-1', features: feat, host: 'openclaw' },
    );
    assertConstitutionAndTemperament(tmp, 'openclaw', { spawn, gate: banned });
    writeSuitSessionBoot(tmp, 'openclaw', {
      source: '0xray/openclaw-user',
      sessionId: 'compact-claw-1',
      intent,
    });
    evaluatePreToolGate(
      'read',
      { path: 'README.md' },
      {
        projectRoot: tmp,
        sessionId: 'compact-claw-1',
        features: feat,
        host: 'openclaw',
        hookEvent: 'post_compact',
      },
    );
    writeSuitSessionBoot(tmp, 'openclaw', {
      source: '0xray/openclaw-compact',
      sessionId: 'compact-claw-1',
      hookEvent: 'post_compact',
    });
    assertSurvived(tmp, { host: 'openclaw', intent, profile: 'guided' });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

{
  const tmp = mkdtempSync(join(tmpdir(), 'xray-compact-swap-'));
  try {
    seedFloor(tmp);
    const intent = memoryIntent('hotswap');
    runGrokSession(tmp, 'session_start', { intent, sessionId: 'swap-1' });
    writeSuitSessionBoot(tmp, 'opencode', { source: '0xray/opencode-plugin', sessionId: 'swap-2' });
    writeSuitSessionBoot(tmp, 'opencode', { source: '0xray/opencode-compact', sessionId: 'swap-2' });
    assertSurvived(tmp, {
      host: 'opencode',
      intent,
      profile: 'guided',
      hotSwap: { from: 'grok', to: 'opencode' },
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed) {
  process.stderr.write(`four-floor compact survival failed (${failed})\n`);
  process.exit(1);
}
process.stdout.write('four-floor compact survival passed\n');
process.exit(0);
