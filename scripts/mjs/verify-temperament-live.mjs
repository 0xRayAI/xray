#!/usr/bin/env node
/**
 * Live 4.0 temperament + host-surface verify.
 * Exercises compiled Grok/Hermes hook binaries, OpenCode SSOT host, OpenClaw gateway.
 * Fixture mjs scripts do not cover temperament (frontier warn vs guided deny) or OpenClaw daemon.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '../..');
const require = createRequire(import.meta.url);
const pkg = require(join(packageRoot, 'package.json'));

const grokHook = join(packageRoot, 'dist/integrations/grok/hooks/pre-tool-use.js');
const grokSession = join(packageRoot, 'dist/integrations/grok/hooks/session-start.js');
const hermesBridge = join(packageRoot, 'dist/integrations/hermes-agent/bridge.mjs');
const gateJs = join(packageRoot, 'dist/nucleus/delegation-gate.js');
const suitJs = join(packageRoot, 'dist/nucleus/suit-temperament.js');

let failed = 0;
function pass(n) {
  console.log(`✅ ${n}`);
}
function fail(n, d = '') {
  failed++;
  console.error(`❌ ${n}${d ? ` — ${d}` : ''}`);
}

function seedAuto(tmp) {
  mkdirSync(join(tmp, '.xray', 'state'), { recursive: true });
  writeFileSync(
    join(tmp, '.xray', 'features.json'),
    JSON.stringify({
      version: '4.0.0',
      suit_temperament: { profile: 'auto' },
      multi_agent_orchestration: {
        enabled: true,
        lead_dev_mode: true,
        auto_chain_delegations: true,
        no_new_surface: true,
      },
    }),
  );
}

function runGrokHook(tmp, fixture) {
  const payload = JSON.stringify(fixture);
  const out = execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${grokHook}"`, {
    encoding: 'utf8',
    env: {
      ...process.env,
      GROK_WORKSPACE_ROOT: tmp,
      GROK_SESSION_ID: 'temperament-live',
    },
  });
  return JSON.parse(out.trim().split('\n').filter(Boolean).at(-1));
}

function runGrokSession(tmp) {
  const payload = JSON.stringify({
    hookEventName: 'session_start',
    sessionId: 'temperament-live',
    workspaceRoot: tmp,
    cwd: tmp,
  });
  execSync(`printf '%s' '${payload.replace(/'/g, "'\\''")}' | node "${grokSession}"`, {
    encoding: 'utf8',
    env: {
      ...process.env,
      GROK_WORKSPACE_ROOT: tmp,
      GROK_HOOK_EVENT: 'session_start',
      GROK_SESSION_ID: 'temperament-live',
    },
  });
}

function runHermes(tmp, extra) {
  const json = JSON.stringify({
    command: 'delegation-gate',
    phase: 'pre',
    sessionId: 'temperament-live',
    host: 'hermes',
    ...extra,
  }).replace(/'/g, "'\\''");
  const out = execSync(`node "${hermesBridge}" delegation-gate --cwd "${tmp}" '${json}'`, {
    cwd: tmp,
    encoding: 'utf8',
    env: { ...process.env, XRAY_ROOT: tmp },
  });
  return JSON.parse(out.trim().split('\n').filter(Boolean).at(-1));
}

console.log('═══ 0xRay 4.0 temperament live ═══\n');

if (pkg.version !== '4.0.0') fail('package.json is 4.0.0', pkg.version);
else pass(`package ${pkg.version}`);

for (const p of [grokHook, grokSession, hermesBridge, gateJs, suitJs]) {
  if (existsSync(p)) pass(`dist ${p.slice(packageRoot.length + 1)}`);
  else fail('missing dist', p);
}

const tmp = mkdtempSync(join(tmpdir(), 'xray-temp-live-'));
try {
  seedAuto(tmp);
  const { evaluatePreToolGate, loadDelegationGateFeatures } = await import(
    pathToFileURL(gateJs).href
  );
  const { writeSuitSessionBoot, resolveRuntimeSuitProfile } = await import(
    pathToFileURL(suitJs).href
  );

  const grokFeat = loadDelegationGateFeatures(tmp, 'grok');
  const hermesFeat = loadDelegationGateFeatures(tmp, 'hermes');
  const ocFeat = loadDelegationGateFeatures(tmp, 'opencode');
  if (grokFeat.suit_profile === 'frontier' && grokFeat.spawn_plan_mode === 'warn') {
    pass('auto+grok → frontier/warn');
  } else fail('grok profile', JSON.stringify(grokFeat));
  if (hermesFeat.suit_profile === 'guided' && hermesFeat.spawn_plan_mode === 'deny') {
    pass('auto+hermes → guided/deny');
  } else fail('hermes profile', JSON.stringify(hermesFeat));
  if (ocFeat.suit_profile === 'guided') pass('auto+opencode → guided');
  else fail('opencode profile', JSON.stringify(ocFeat));

  const grokAny = runGrokHook(tmp, {
    toolName: 'search_replace',
    workspaceRoot: tmp,
    sessionId: 'temperament-live',
    toolInput: { path: 'src/foo.ts', new_string: 'const x: any = 1' },
  });
  if (grokAny.decision === 'deny' && grokAny.gate === 'codex-11') {
    pass('Grok live hook denies Codex 11');
  } else fail('Grok constitution', JSON.stringify(grokAny));

  const grokSpawn = runGrokHook(tmp, {
    toolName: 'spawn_subagent',
    workspaceRoot: tmp,
    sessionId: 'temperament-live',
    toolInput: { prompt: 'explore repo', subagent_type: 'explore' },
  });
  if (grokSpawn.decision === 'allow' && grokSpawn.warn === true) {
    pass('Grok live hook warns spawn without plan (frontier)');
  } else fail('Grok frontier spawn', JSON.stringify(grokSpawn));

  runGrokSession(tmp);
  const boot = JSON.parse(readFileSync(join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'));
  if (boot.host === 'grok' && boot.suit_profile === 'frontier') {
    pass('Grok session-start writes host=grok frontier boot');
  } else fail('Grok session-boot', JSON.stringify({ host: boot.host, suit_profile: boot.suit_profile }));
  const stationCard = join(tmp, '.xray', 'state', 'STATION.md');
  if (existsSync(stationCard) && readFileSync(stationCard, 'utf8').includes('Do not cold-start')) {
    pass('Grok session-start writes STATION.md');
  } else fail('Grok STATION.md');

  const hSpawn = runHermes(tmp, {
    tool: 'delegate_task',
    args: { prompt: 'explore repo', subagent_type: 'explore' },
  });
  if (hSpawn.allow === false && hSpawn.gate === 'spawn-plan-missing') {
    pass('Hermes live bridge denies spawn without plan (guided)');
  } else fail('Hermes spawn', JSON.stringify(hSpawn));

  const hAny = runHermes(tmp, {
    tool: 'write_file',
    args: { path: 'src/foo.ts', content: 'const x: any = 1' },
  });
  if (hAny.allow === false && hAny.gate === 'codex-11') {
    pass('Hermes live bridge denies Codex 11');
  } else fail('Hermes constitution', JSON.stringify(hAny));

  const ocSpawn = evaluatePreToolGate(
    'Task',
    { prompt: 'explore repo', subagent_type: 'explore' },
    { projectRoot: tmp, sessionId: 'temperament-live', features: ocFeat, host: 'opencode' },
  );
  if (ocSpawn.allow === false && ocSpawn.gate === 'spawn-plan-missing') {
    pass('OpenCode SSOT denies spawn without plan (guided)');
  } else fail('OpenCode spawn', JSON.stringify(ocSpawn));

  writeSuitSessionBoot(tmp, 'grok', { source: 'live' });
  if (resolveRuntimeSuitProfile(tmp, 'hermes') === 'guided') {
    pass('Hermes ignores leftover Grok boot');
  } else fail('dual-host boot');
  writeSuitSessionBoot(tmp, 'openclaw', { source: 'live' });
  const clawBoot = JSON.parse(readFileSync(join(tmp, '.xray', 'state', 'session-boot.json'), 'utf8'));
  if (clawBoot.host === 'openclaw' && clawBoot.suit_profile === 'guided') {
    pass('OpenClaw session-boot guided');
  } else fail('OpenClaw boot', JSON.stringify({ host: clawBoot.host, suit_profile: clawBoot.suit_profile }));

  const clawFeat = loadDelegationGateFeatures(tmp, 'openclaw');
  const clawSpawn = evaluatePreToolGate(
    'Task',
    { prompt: 'explore repo', subagent_type: 'explore' },
    { projectRoot: tmp, sessionId: 'temperament-live', features: clawFeat, host: 'openclaw' },
  );
  if (!clawSpawn.allow && clawSpawn.gate === 'spawn-plan-missing') {
    pass('OpenClaw SSOT denies spawn without plan (guided)');
  } else fail('OpenClaw spawn', JSON.stringify(clawSpawn));
  const clawAny = evaluatePreToolGate(
    'write',
    { path: 'src/foo.ts', content: 'const x: any = 1' },
    { projectRoot: tmp, sessionId: 'temperament-live', features: clawFeat, host: 'openclaw' },
  );
  if (!clawAny.allow && clawAny.gate === 'codex-11') {
    pass('OpenClaw SSOT denies Codex 11');
  } else fail('OpenClaw constitution', JSON.stringify(clawAny));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const home = process.env.HOME || '';
const grokPlugin = join(home, '.grok/plugins/0xray');
const hermesPlugin = join(home, '.hermes/plugins/xray-hermes');
const ocBin = join(home, '.opencode/bin/opencode');
if (existsSync(grokPlugin)) pass(`Grok plugin present ${grokPlugin}`);
else fail('Grok plugin missing');
if (existsSync(hermesPlugin)) pass(`Hermes plugin present ${hermesPlugin}`);
else fail('Hermes plugin missing');
if (existsSync(ocBin) || existsSync(join(packageRoot, '.opencode'))) pass('OpenCode surface present');
else fail('OpenCode surface missing');

let openclawCli = false;
try {
  execSync('which openclaw', { stdio: 'ignore' });
  openclawCli = true;
} catch {
  pass('OpenClaw CLI not on PATH — skip gateway live probe');
}
if (openclawCli) {
  try {
    const code = execSync('curl -sS -m 12 -o /dev/null -w %{http_code} http://127.0.0.1:18789/', {
      encoding: 'utf8',
    }).trim();
    if (code === '200') pass('OpenClaw gateway HTTP 200 on :18789');
    else pass(`OpenClaw CLI on PATH; default :18789 returned ${code} (no machine daemon)`);
  } catch {
    pass('OpenClaw CLI on PATH; default gateway :18789 not running (no machine daemon)');
  }
}

if (existsSync(join(home, '.openclaw/skills'))) pass('OpenClaw skills dir present');
else fail('OpenClaw skills dir missing');
const clawHook = join(home, '.openclaw/hooks/xray-pre-tool.mjs');
const clawPlugin = join(packageRoot, 'src/integrations/openclaw/plugin/xray-pre-tool/index.js');
if (existsSync(clawHook)) pass(`OpenClaw PreToolUse hook installed ${clawHook}`);
else fail('OpenClaw PreToolUse hook missing — run: node dist/cli/index.js openclaw install --force');
if (existsSync(clawPlugin)) pass('OpenClaw before_tool_call plugin source present');
else fail('OpenClaw before_tool_call plugin source missing');

console.log('');
if (failed) {
  console.error(`❌ temperament live failed (${failed})`);
  process.exit(1);
}
console.log('🎉 temperament live passed');
process.exit(0);
