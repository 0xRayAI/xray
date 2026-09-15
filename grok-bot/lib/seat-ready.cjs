/**
 * Seat ready/doctor — prove mill plant on disk; print hangar/Clearing next steps.
 * Chat is not proof. Does not fasten a suit. Does not spend.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const FACTORY_SHOPS = ['shop-extract', 'shop-witness', 'shop-pin'];
const CLEARING_EXTRACT =
  'https://clearing-production-9968.up.railway.app/v1/extract?url=https://example.com';
const CLEARING_HEALTH = 'https://clearing.rippel.ai';

function existsFile(file) {
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function existsDir(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function skillPresent(root, name) {
  const rels = [
    path.join('.opencode', 'skills', name, 'SKILL.md'),
    path.join('.grok', 'plugins', '0xray', 'skills', name, 'SKILL.md'),
    path.join('.grok', 'plugins', name, 'skills', name, 'SKILL.md'),
    path.join('.hermes', 'plugins', 'xray-hermes', 'skills', name, 'SKILL.md'),
    path.join('.openclaw', 'skills', name, 'SKILL.md'),
  ];
  return rels.some((rel) => existsFile(path.join(root, rel)));
}

function millPlant(root) {
  const mill = skillPresent(root, 'mill');
  const inspect = skillPresent(root, 'inspect');
  const inventory = readJson(path.join(root, '.xray', 'foundry-inventory.json'));
  const millSkills = inventory?.millPlant?.skills;
  const inventoryMill =
    Array.isArray(millSkills) && millSkills.includes('mill') && millSkills.includes('inspect');
  return {
    mill,
    inspect,
    ok: Boolean((mill && inspect) || inventoryMill),
    inventory: inventory
      ? {
          suit: inventory.suit || null,
          costume: inventory.costume === true,
          dna: typeof inventory.dna === 'string' ? inventory.dna : null,
        }
      : null,
  };
}

function hangarPlant(root) {
  const shops = {};
  for (const name of FACTORY_SHOPS) {
    shops[name] = skillPresent(root, name);
  }
  const planted = FACTORY_SHOPS.filter((name) => shops[name]);
  return { shops, ok: planted.length === FACTORY_SHOPS.length, planted };
}

function owsVault(home) {
  const dir = path.join(home, '.ows');
  return { path: dir, ok: existsDir(dir) };
}

async function clearingLive(fetchFn) {
  try {
    const res = await fetchFn(CLEARING_HEALTH, { method: 'GET' });
    const status = Number(res.status) || 0;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const healthy =
      status === 200 && body && (body.status === 'healthy' || body.server === 'clearing');
    return { ok: Boolean(healthy), status, server: body?.server || null };
  } catch (err) {
    return { ok: false, status: 0, detail: err instanceof Error ? err.message : String(err) };
  }
}

function nextSteps(report) {
  const steps = [];
  if (!report.packageJson) {
    steps.push('Create a project with package.json, then: npm i 0xray@4.0.12 @0xray/foundry@0.1.10 && npx @0xray/foundry mint --skip-live');
    return steps;
  }
  if (!report.mill.ok) {
    steps.push('Fasten mill+inspect: npm i 0xray@4.0.12 @0xray/foundry@0.1.10 && npx @0xray/foundry mint --skip-live && npx @0xray/foundry inspect --skip-live');
  }
  if (!report.hangar.ok) {
    steps.push('Plant shops: npx groover-hangar (from this project root)');
  }
  if (!report.ows.ok) {
    steps.push('Pay setup: install Open Wallet, ows wallet create --name agent-treasury-1, fund USDC on Base');
  }
  steps.push(`Unpaid shop smoke (expect 402): curl -sI '${CLEARING_EXTRACT}'`);
  if (!report.identityHint) {
    steps.push('Identity when needed: Groover register → mint → pin (never demo id 86025)');
  }
  return steps;
}

function parseArgs(argv) {
  const out = { skipLive: false, json: false, cwd: null, home: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-live') out.skipLive = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--cwd') out.cwd = argv[++i] || null;
    else if (arg.startsWith('--cwd=')) out.cwd = arg.slice('--cwd='.length);
  }
  return out;
}

async function inspectSeat(root, opts = {}) {
  const home = opts.home || os.homedir();
  const fetchFn = opts.fetch || fetch;
  const skipLive = Boolean(opts.skipLive);
  const pkg = existsFile(path.join(root, 'package.json'));
  const mill = millPlant(root);
  const hangar = hangarPlant(root);
  const ows = owsVault(home);
  const clearing = skipLive
    ? { ok: true, skipped: true, detail: '--skip-live' }
    : await clearingLive(fetchFn);
  const report = {
    kind: 'grok-bot-ready',
    root,
    packageJson: pkg,
    mill,
    hangar,
    ows,
    clearing,
    identityHint: false,
    ready: Boolean(pkg && mill.ok),
  };
  report.next = nextSteps(report);
  return report;
}

function formatReport(report) {
  const yn = (ok) => (ok ? 'YES' : 'NO');
  const millLine = report.mill.inventory
    ? `${yn(report.mill.ok)} (suit ${report.mill.inventory.suit || 'unknown'})`
    : yn(report.mill.ok);
  const hangarLine = report.hangar.ok
    ? 'YES (extract, witness, pin)'
    : `NO (have: ${report.hangar.planted.join(', ') || 'none'})`;
  const clearingLine = report.clearing.skipped
    ? 'skip'
    : yn(report.clearing.ok);
  const lines = [
    '@0xray/grok-bot ready — is this seat planted?',
    '',
    `Ready: ${yn(report.ready)}`,
    `Mill+inspect: ${millLine}`,
    `Hangar shops: ${hangarLine}`,
    `OWS vault (~/.ows): ${yn(report.ows.ok)}`,
    `Clearing live: ${clearingLine}`,
    '',
    'Next:',
    ...report.next.map((step, i) => `${i + 1}. ${step}`),
    '',
    'A friend would hear: this command checks whether the seat has a mill suit, then tells you the next shop/pay step. Chat is not proof.',
    '',
  ];
  return lines.join('\n');
}

module.exports = {
  FACTORY_SHOPS,
  CLEARING_EXTRACT,
  CLEARING_HEALTH,
  parseArgs,
  inspectSeat,
  formatReport,
  nextSteps,
};
