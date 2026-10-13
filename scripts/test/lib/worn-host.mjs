#!/usr/bin/env node
/**
 * Every host suite wears a consumer and asks that CLI to use the worn suit.
 * Homes stay disposable: Hermes uses HERMES_HOME, OpenClaw uses
 * OPENCLAW_STATE_DIR and OPENCLAW_CONFIG_PATH. The live gateway is not restarted.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const SUIT_SERVERS = [
  'xray-governance',
  'xray-skills',
  'xray-orchestrator',
  'xray-enforcer',
  'xray-researcher',
  'xray-code-review',
  'xray-architect-tools',
];

function projectRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

function tail(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(-220);
}

function run(bin, args, opts = {}) {
  try {
    const stdout = execFileSync(bin, args, {
      cwd: opts.cwd,
      env: opts.env || process.env,
      encoding: 'utf8',
      timeout: opts.timeout || 90000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return { code: 0, stdout: stdout || '', stderr: '' };
  } catch (err) {
    return {
      code: typeof err.status === 'number' ? err.status : 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || err.message || ''),
    };
  }
}

function combined(result) {
  return `${result.stdout}\n${result.stderr}`;
}

function liveFiles() {
  const home = os.homedir();
  return [
    path.join(home, '.hermes', 'config.yaml'),
    path.join(home, '.openclaw', 'openclaw.json'),
    path.join(home, '.openclaw', 'exec-approvals.json'),
    path.join(home, '.grok', 'trusted_folders.toml'),
  ];
}

function stampFile(file) {
  try {
    const stat = fs.statSync(file);
    return `${stat.size}:${Math.floor(stat.mtimeMs)}`;
  } catch {
    return 'missing';
  }
}

function stampLive() {
  const stamp = {};
  for (const file of liveFiles()) stamp[file] = stampFile(file);
  return stamp;
}

function realCli(wornCli) {
  try {
    return fs.realpathSync(wornCli);
  } catch {
    return wornCli;
  }
}

function mentionsWornCli(text, wornCli) {
  const body = String(text || '');
  if (body.includes(wornCli)) return true;
  const real = realCli(wornCli);
  return real !== wornCli && body.includes(real);
}

function hasFactoryLaunch(text) {
  const body = String(text || '');
  return body.includes('/dev/xray/dist/cli/index.js') || body.includes('/.grok/wears/0xray/');
}

function hasNpxLaunch(text) {
  return /npx\s+-y\s+0xray|\bnpx\b[^\n]{0,40}\b0xray\b/.test(String(text || ''));
}

function missingServers(text) {
  const body = String(text || '');
  return SUIT_SERVERS.filter((name) => !body.includes(name));
}

function assertWornText(text, wornCli, label, pass, fail) {
  if (!mentionsWornCli(text, wornCli)) {
    fail(label, 'worn CLI missing');
    return false;
  }
  if (hasFactoryLaunch(text)) {
    fail(label, 'factory CLI still present');
    return false;
  }
  if (hasNpxLaunch(text)) {
    fail(label, 'npx launch still present');
    return false;
  }
  pass(label);
  return true;
}

function readWornFile(file, wornCli, label, pass, fail) {
  if (!fs.existsSync(file)) {
    fail(label, 'file missing');
    return false;
  }
  return assertWornText(fs.readFileSync(file, 'utf8'), wornCli, label, pass, fail);
}

function assertConferOff(consumer, pass, fail) {
  const featuresPath = path.join(consumer, '.xray', 'features.json');
  if (!fs.existsSync(featuresPath)) {
    fail('confer stays off', 'features.json missing');
    return;
  }
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
  const orchestration = features.multi_agent_orchestration || {};
  const confer = features.confer || {};
  const enabled = confer.enabled === true || orchestration.confer_on_synthesis === true || confer.on_synthesis === true;
  if (enabled) fail('confer stays off', 'wear turned confer on');
  else pass('confer stays off');
}

function assertPlant(consumer, pass, fail) {
  const inventoryPath = path.join(consumer, '.xray', 'foundry-inventory.json');
  const millSkill = path.join(consumer, '.opencode', 'skills', 'mill', 'SKILL.md');
  const inspectSkill = path.join(consumer, '.opencode', 'skills', 'inspect', 'SKILL.md');
  if (!fs.existsSync(inventoryPath)) {
    fail('mill and inspect', 'foundry inventory missing');
    return;
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const plant = Array.isArray(inventory.plant) ? inventory.plant : [];
  const skills = (inventory.millPlant && inventory.millPlant.skills) || [];
  const fastened = plant.includes('mill')
    && skills.includes('mill')
    && skills.includes('inspect')
    && fs.existsSync(millSkill)
    && fs.existsSync(inspectSkill);
  if (fastened) pass('mill and inspect are fastened');
  else fail('mill and inspect', 'plant or skill files missing');
}

function packTarball(root) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-worn-pack-'));
  const packed = run('npm', ['pack', '--pack-destination', dest], { cwd: root, timeout: 120000 });
  if (packed.code !== 0) {
    throw new Error(tail(packed.stderr || packed.stdout));
  }
  const tarball = fs.readdirSync(dest).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error('npm pack produced no tarball');
  return path.join(dest, tarball);
}

function installConsumer(root, tarball) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-worn-consumer-'));
  const pack = tarball || packTarball(root);
  const git = run('git', ['init'], { cwd: dir });
  if (git.code !== 0) throw new Error(tail(git.stderr || git.stdout));
  const init = run('npm', ['init', '-y'], { cwd: dir, timeout: 30000 });
  if (init.code !== 0) throw new Error(tail(init.stderr || init.stdout));
  const installed = run('npm', ['install', pack], { cwd: dir, timeout: 180000 });
  if (installed.code !== 0) throw new Error(tail(installed.stderr || installed.stdout));
  return dir;
}

function ensureConsumer(opts) {
  const existing = opts.consumerDir;
  if (existing && fs.existsSync(path.join(existing, 'node_modules', '0xray', 'package.json'))) {
    if (!fs.existsSync(path.join(existing, '.git'))) {
      const git = run('git', ['init'], { cwd: existing });
      if (git.code !== 0) throw new Error(tail(git.stderr || git.stdout));
    }
    return { dir: existing, owned: false };
  }
  return { dir: installConsumer(opts.projectRoot || projectRoot(), opts.tarball || null), owned: true };
}

function isolatedHome(pinHome) {
  return { ...process.env, HOME: pinHome, USERPROFILE: pinHome };
}

function syncHermesRegistry(consumer, pinHome) {
  const wiring = path.join(consumer, 'node_modules', '0xray', 'scripts', 'node', 'bridge-mcp-wiring.cjs');
  if (!fs.existsSync(wiring)) {
    return { code: 1, stdout: '', stderr: 'installed package has no Hermes registry writer' };
  }
  const source = [
    'const wiring = require(process.env.XRAY_WIRING);',
    'const result = wiring.syncHermesMcpRegistry(process.env.XRAY_CONSUMER);',
    'process.stdout.write(JSON.stringify({ count: result && result.count }));',
  ].join('\n');
  return run(process.execPath, ['-e', source], {
    env: {
      ...isolatedHome(pinHome),
      XRAY_WIRING: wiring,
      XRAY_CONSUMER: consumer,
    },
    timeout: 60000,
  });
}

function hermesEnv(pinHome) {
  const hermesHome = path.join(pinHome, '.hermes');
  fs.mkdirSync(hermesHome, { recursive: true });
  return {
    ...isolatedHome(pinHome),
    HERMES_HOME: hermesHome,
    HERMES_ACCEPT_HOOKS: '1',
  };
}

function writeOpenClawConfig(consumer, pinHome) {
  const mcpPath = path.join(consumer, '.mcp.json');
  const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  const stateDir = path.join(pinHome, 'openclaw-state');
  fs.mkdirSync(stateDir, { recursive: true });
  const configPath = path.join(stateDir, 'openclaw.json');
  const body = { mcp: { servers: mcp.mcpServers || {} } };
  fs.writeFileSync(configPath, `${JSON.stringify(body, null, 2)}\n`);
  // A missing approvals file in a custom state dir makes OpenClaw archive the live one.
  const approvalsPath = path.join(stateDir, 'exec-approvals.json');
  const approvals = {
    version: 1,
    socket: { path: path.join(stateDir, 'exec-approvals.sock') },
    defaults: {},
    agents: {},
  };
  fs.writeFileSync(approvalsPath, `${JSON.stringify(approvals, null, 2)}\n`, { mode: 0o600 });
  return { stateDir, configPath };
}

function openclawEnv(stateDir, configPath) {
  return {
    ...process.env,
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_CONFIG_PATH: configPath,
  };
}

function assertServerList(text, label, pass, fail) {
  const missing = missingServers(text);
  if (missing.length) fail(label, `missing ${missing.join(', ')}`);
  else pass(label);
}

function proveOpencode(consumer, wornCli, pass, fail) {
  readWornFile(path.join(consumer, 'opencode.json'), wornCli, 'opencode.json launches the worn CLI', pass, fail);
  const listed = run('opencode', ['mcp', 'list'], { cwd: consumer, timeout: 120000 });
  const text = combined(listed);
  if (listed.code !== 0) {
    fail('opencode mcp list', tail(text));
    return;
  }
  assertWornText(text, wornCli, 'opencode mcp list shows the worn CLI', pass, fail);
  assertServerList(text, 'opencode mcp list has the suit servers', pass, fail);
  if (!/connected/i.test(text) || /disconnected/i.test(text)) {
    fail('opencode mcp list connects', tail(text));
  } else {
    pass('opencode mcp list connects');
  }
}

function proveGrok(consumer, wornCli, pinHome, pass, fail) {
  readWornFile(path.join(consumer, '.grok', 'config.toml'), wornCli, 'project .grok/config.toml launches the worn CLI', pass, fail);
  const pluginMcp = path.join(consumer, '.grok', 'plugins', '0xray', '.mcp.json');
  readWornFile(pluginMcp, wornCli, 'project Grok plugin launches the worn CLI', pass, fail);
  const sock = path.join(pinHome, '.grok', 'leader-worn.sock');
  fs.mkdirSync(path.dirname(sock), { recursive: true });
  const env = isolatedHome(pinHome);
  const listed = run('grok', ['mcp', 'list', '--leader-socket', sock], {
    cwd: consumer,
    env,
    timeout: 90000,
  });
  const listText = combined(listed);
  if (listed.code !== 0) {
    fail('grok mcp list', tail(listText));
    return;
  }
  assertWornText(listText, wornCli, 'grok mcp list shows the worn CLI', pass, fail);
  if (!listText.includes('(project)')) fail('grok mcp list', 'project servers not labeled (project)');
  else pass('grok mcp list reads the project config');
  assertServerList(listText, 'grok mcp list has the suit servers', pass, fail);
  const doctor = run('grok', ['mcp', 'doctor', 'xray-orchestrator', '--json', '--leader-socket', sock], {
    cwd: consumer,
    env,
    timeout: 120000,
  });
  const doctorText = combined(doctor);
  if (doctor.code !== 0 || !mentionsWornCli(doctorText, wornCli)) {
    fail('grok mcp doctor', tail(doctorText));
  } else {
    pass('grok mcp doctor reaches the worn orchestrator');
  }
}

function proveHermes(consumer, wornCli, pinHome, pass, fail) {
  const pluginMcp = path.join(consumer, '.hermes', 'plugins', 'xray-hermes', '.mcp.json');
  readWornFile(pluginMcp, wornCli, 'project Hermes plugin launches the worn CLI', pass, fail);
  const synced = syncHermesRegistry(consumer, pinHome);
  if (synced.code !== 0) {
    fail('hermes registry', tail(combined(synced)));
    return;
  }
  pass('hermes registry written on the disposable home');
  const env = hermesEnv(pinHome);
  const configPath = run('hermes', ['config', 'path'], { env, timeout: 30000 });
  const pathText = combined(configPath).trim();
  const expected = path.join(pinHome, '.hermes', 'config.yaml');
  if (configPath.code !== 0 || !pathText.includes(expected)) {
    fail('hermes config path', tail(pathText));
  } else if (!fs.existsSync(expected)) {
    fail('hermes config file', 'path printed but file missing');
  } else {
    pass('hermes config path is the disposable home');
    assertWornText(fs.readFileSync(expected, 'utf8'), wornCli, 'hermes config file launches the worn CLI', pass, fail);
  }
  const listed = run('hermes', ['mcp', 'list'], { env, timeout: 30000 });
  const listText = combined(listed);
  if (listed.code !== 0) fail('hermes mcp list', tail(listText));
  else assertServerList(listText, 'hermes mcp list has the suit servers', pass, fail);
  const tested = run('hermes', ['mcp', 'test', 'xray-orchestrator'], { env, timeout: 120000 });
  const testText = combined(tested);
  if (!/Connected \(/.test(testText) || /Connection failed/.test(testText) || /Tools discovered: 0\b/.test(testText)) {
    fail('hermes mcp test', tail(testText));
  } else {
    pass('hermes mcp test connects to the worn orchestrator');
  }
}

function proveOpenclaw(consumer, wornCli, pinHome, pass, fail) {
  readWornFile(path.join(consumer, '.mcp.json'), wornCli, 'project .mcp.json launches the worn CLI', pass, fail);
  const pluginRecord = path.join(consumer, '.xray', 'config', 'openclaw.json');
  if (!fs.existsSync(pluginRecord)) {
    fail('openclaw project plugin', 'openclaw.json missing');
  } else {
    const recorded = JSON.parse(fs.readFileSync(pluginRecord, 'utf8'));
    const pluginPath = String(recorded.pluginPath || '');
    const indexJs = pluginPath ? path.join(pluginPath, 'index.js') : '';
    if (!pluginPath.includes('/node_modules/') || !fs.existsSync(indexJs)) {
      fail('openclaw project plugin', 'installed plugin path missing');
    } else {
      pass('openclaw project plugin records the installed package');
    }
  }
  const { stateDir, configPath } = writeOpenClawConfig(consumer, pinHome);
  const env = openclawEnv(stateDir, configPath);
  const listed = run('openclaw', ['mcp', 'list', '--json'], { env, timeout: 60000 });
  const listText = combined(listed);
  if (listed.code !== 0) {
    fail('openclaw mcp list', tail(listText));
    return;
  }
  assertWornText(listText, wornCli, 'openclaw mcp list shows the worn CLI', pass, fail);
  assertServerList(listText, 'openclaw mcp list has the suit servers', pass, fail);
  const probed = run('openclaw', ['mcp', 'probe', 'xray-orchestrator', '--json'], { env, timeout: 120000 });
  const probeText = combined(probed);
  if (probed.code !== 0 || !/xray-orchestrator/.test(probeText) || /"ok"\s*:\s*false|connection failed|probe failed/i.test(probeText)) {
    fail('openclaw mcp probe', tail(probeText));
  } else {
    pass('openclaw mcp probe connects to the worn orchestrator');
  }
}

const PROVE = {
  opencode: proveOpencode,
  grok: proveGrok,
  hermes: proveHermes,
  openclaw: proveOpenclaw,
};

export function proveWornHost(opts) {
  const host = opts.host;
  const pass = opts.pass;
  const fail = opts.fail;
  const prove = PROVE[host];
  opts.section(`Worn ${host} CLI`);
  if (!prove) {
    fail(`${host} worn CLI`, 'unknown host');
    return;
  }
  const before = stampLive();
  const pinHome = fs.mkdtempSync(path.join(os.tmpdir(), `xray-worn-${host}-home-`));
  let ownedDir = null;
  try {
    const consumer = ensureConsumer(opts);
    if (consumer.owned) ownedDir = consumer.dir;
    const wornCli = path.join(consumer.dir, 'node_modules', '0xray', 'dist', 'cli', 'index.js');
    if (!fs.existsSync(wornCli)) {
      fail(`${host} worn CLI`, 'installed dist/cli/index.js missing');
      return;
    }
    const wore = run(process.execPath, [wornCli, 'wear'], {
      cwd: consumer.dir,
      env: isolatedHome(pinHome),
      timeout: 180000,
    });
    if (wore.code !== 0) {
      fail(`${host} wear`, tail(combined(wore)));
      return;
    }
    pass(`${host} wear finished`);
    assertConferOff(consumer.dir, pass, fail);
    assertPlant(consumer.dir, pass, fail);
    if (host === 'opencode') proveOpencode(consumer.dir, wornCli, pass, fail);
    else prove(consumer.dir, wornCli, pinHome, pass, fail);
  } catch (err) {
    fail(`${host} worn proof`, tail(err && err.message ? err.message : err));
  } finally {
    const changed = liveFiles().filter((file) => stampFile(file) !== before[file]);
    if (changed.length) fail(`${host} left the live home alone`, changed.map((file) => path.basename(file)).join(', '));
    else pass(`${host} left the live home alone`);
    if (!opts.keep) {
      fs.rmSync(pinHome, { recursive: true, force: true });
      if (ownedDir) fs.rmSync(ownedDir, { recursive: true, force: true });
    }
  }
}
