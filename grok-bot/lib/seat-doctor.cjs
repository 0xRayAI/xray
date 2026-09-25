'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PLANT_URLS = {
  clearing: 'https://clearing.rippel.ai',
  clearingRail: 'https://clearing-production-9968.up.railway.app/',
  suitUi: 'https://website-production-c0da.up.railway.app/suit',
  registryMcp: 'https://registry-production-e2c4.up.railway.app/mcp',
};

const SKILL_DIRS = [
  ['.opencode', 'skills'],
  ['.grok', 'plugins', '0xray', 'skills'],
  ['.hermes', 'plugins', 'xray-hermes', 'skills'],
  ['.openclaw', 'skills'],
  ['src', 'skills'],
  ['skills'],
  ['scripts', 'foundry', 'plant', 'skills'],
  ['node_modules', '@0xray', 'foundry', 'plant', 'skills'],
];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function packageIdentity(cwd) {
  const pkg = readJson(path.join(cwd, 'package.json'));
  if (!pkg || typeof pkg !== 'object') return null;
  return {
    name: typeof pkg.name === 'string' ? pkg.name : null,
    version: typeof pkg.version === 'string' ? pkg.version : null,
  };
}

function findSkill(cwd, name) {
  for (const rel of SKILL_DIRS) {
    const file = path.join(cwd, ...rel, name, 'SKILL.md');
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function loadInventory(cwd) {
  return readJson(path.join(cwd, '.xray', 'foundry-inventory.json'));
}

function loadCostume(cwd) {
  const foundry =
    readJson(path.join(cwd, 'foundry.json')) || readJson(path.join(cwd, '.xray', 'foundry.json'));
  return foundry?.costume === true;
}

function millPlantFromInventory(inventory) {
  const skills = inventory?.millPlant?.skills;
  if (!Array.isArray(skills)) return { mill: false, inspect: false };
  return {
    mill: skills.includes('mill'),
    inspect: skills.includes('inspect'),
  };
}

function probeRepertoire(cwd) {
  const pkgPath = path.join(cwd, 'node_modules', '@0xray', 'repertoire', 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      status: 'miss',
      detail: 'node_modules/@0xray/repertoire not found (optional — honest miss)',
    };
  }
  const pkg = readJson(pkgPath) || {};
  const signalsFile = path.join(cwd, 'node_modules', '@0xray', 'repertoire', 'data', 'curated_signals.json');
  const signalsJson = readJson(signalsFile);
  const signals = Array.isArray(signalsJson?.signals) ? signalsJson.signals.length : null;
  return {
    status: 'on',
    name: typeof pkg.name === 'string' ? pkg.name : '@0xray/repertoire',
    version: typeof pkg.version === 'string' ? pkg.version : null,
    signals,
  };
}

function probeOws(home) {
  const owsPath = path.join(home, '.ows');
  try {
    return { present: fs.statSync(owsPath).isDirectory(), path: owsPath };
  } catch {
    return { present: false, path: owsPath };
  }
}

const HOUSE_EXAMPLE_MARKER = '(example)';

function probeHouse(cwd) {
  const file = path.join(cwd, 'house', 'HOUSE.md');
  if (!fs.existsSync(file)) {
    return {
      status: 'warn',
      file,
      detail: 'no house/HOUSE.md, run setup-house',
    };
  }
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return {
      status: 'warn',
      file,
      detail: 'no house/HOUSE.md, run setup-house',
    };
  }
  const unfilled = text.split(/\r?\n/).filter((line) => line.includes(HOUSE_EXAMPLE_MARKER));
  if (unfilled.length > 0) {
    return {
      status: 'fail',
      file,
      detail: 'HOUSE.md still has unfilled example lines',
      unfilled: unfilled.length,
    };
  }
  return { status: 'pass', file, detail: 'house/HOUSE.md' };
}

function nextSteps(report) {
  const steps = [];
  if (!report.plant.ok) {
    steps.push('Fasten mill+inspect: npm i 0xray && npx @0xray/foundry mint --skip-live');
    steps.push('Prove plant: npx @0xray/foundry inspect --skip-live (expect mill + inspect, costume false)');
  } else {
    steps.push('Prove again later: npx @0xray/foundry inspect --skip-live');
  }
  steps.push('Hangar shops: npx groover-hangar (extract / witness / pin)');
  steps.push(
    `Clearing: ${PLANT_URLS.clearing} (also ${PLANT_URLS.clearingRail}) — unpaid GET returns 402; pay USDC on Base via local Open Wallet (${report.ows.path})`,
  );
  steps.push(
    'Signer is ZigZag (approved=true). Hosted /sign may be 410. Product MCP name is clearing — never xray-clearing. Do not mill-plant Clearing into this 0xRay suit.',
  );
  if (!report.ows.present) {
    steps.push('OWS missing: create/fund a local Open Wallet under ~/.ows, then retry a 402 shop');
  }
  steps.push(
    `Identity (optional DID): Groover register → mint → pin. Suit UI: ${PLANT_URLS.suitUi} · registry: ${PLANT_URLS.registryMcp}`,
  );
  return steps;
}

function diagnoseSeat(opts = {}) {
  const cwd = path.resolve(opts.cwd || process.cwd());
  const home = opts.home || os.homedir();
  const seat = packageIdentity(cwd);
  const millFile = findSkill(cwd, 'mill');
  const inspectFile = findSkill(cwd, 'inspect');
  const inventory = loadInventory(cwd);
  const fromInventory = millPlantFromInventory(inventory);
  const mill = Boolean(millFile) || fromInventory.mill;
  const inspect = Boolean(inspectFile) || fromInventory.inspect;
  const plantOk = Boolean(seat) && mill && inspect;
  const house = probeHouse(cwd);
  const report = {
    ok: plantOk && house.status !== 'fail',
    cwd,
    seat,
    plant: {
      ok: plantOk,
      mill,
      inspect,
      millFile,
      inspectFile,
      suit: typeof inventory?.suit === 'string' ? inventory.suit : null,
      dna: typeof inventory?.dna === 'string' ? inventory.dna : null,
      costume: loadCostume(cwd),
      inventoryPresent: Boolean(inventory),
    },
    repertoire: probeRepertoire(cwd),
    ows: probeOws(home),
    house,
    urls: PLANT_URLS,
    next: [],
  };
  report.next = nextSteps(report);
  return report;
}

function formatDoctor(report) {
  const lines = [];
  lines.push('@0xray/grok-bot doctor — seat plant check');
  lines.push('');
  if (!report.seat) {
    lines.push(`Seat: not a project (no package.json) @ ${report.cwd}`);
  } else {
    const label = [report.seat.name, report.seat.version].filter(Boolean).join('@') || 'unnamed';
    lines.push(`Seat: ${label}`);
    lines.push(`Root: ${report.cwd}`);
  }
  lines.push('');
  lines.push(`Plant: ${report.plant.ok ? 'PASS' : 'FAIL'} — mill+inspect ${report.plant.ok ? 'fastened' : 'not fastened'}`);
  lines.push(`  mill: ${report.plant.mill ? 'yes' : 'miss'}${report.plant.millFile ? ` (${report.plant.millFile})` : ''}`);
  lines.push(
    `  inspect: ${report.plant.inspect ? 'yes' : 'miss'}${report.plant.inspectFile ? ` (${report.plant.inspectFile})` : ''}`,
  );
  if (report.plant.inventoryPresent) {
    lines.push(`  inventory: ${report.plant.suit || 'present'}${report.plant.dna ? ` dna=${report.plant.dna}` : ''}`);
  } else {
    lines.push('  inventory: miss (.xray/foundry-inventory.json)');
  }
  lines.push(`  costume: ${report.plant.costume ? 'true (do not dump 45 skills)' : 'false'}`);
  lines.push('');
  if (report.repertoire.status === 'on') {
    const sig = report.repertoire.signals == null ? '' : ` — ${report.repertoire.signals} signals`;
    lines.push(
      `Repertoire: on — ${report.repertoire.name}@${report.repertoire.version || '?'}${sig}`,
    );
  } else {
    lines.push(`Repertoire: miss — ${report.repertoire.detail}`);
  }
  lines.push(
    report.ows.present
      ? `OWS pay: yes — ${report.ows.path}`
      : `OWS pay: miss — ${report.ows.path} (hangar shops return 402 until paid)`,
  );
  if (report.house) {
    let label = 'WARN';
    if (report.house.status === 'pass') label = 'PASS';
    else if (report.house.status === 'fail') label = 'FAIL';
    lines.push(`House: ${label} — ${report.house.detail}`);
  }
  lines.push('');
  lines.push('Next');
  report.next.forEach((step, i) => {
    lines.push(`  ${i + 1}. ${step}`);
  });
  lines.push('');
  return `${lines.join('\n')}`;
}

function parseDoctorArgs(argv) {
  const out = { command: null, cwd: null, home: null, json: false, printLlms: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === 'doctor' || arg === 'ready' || arg === 'help') {
      out.command = arg;
      continue;
    }
    if (arg === '--json') {
      out.json = true;
      continue;
    }
    if (arg === '--print-llms') {
      out.printLlms = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.command = 'help';
      continue;
    }
    if (arg === '--cwd' || arg === '--home') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        const err = new Error(`${arg} needs a path`);
        err.code = 'USAGE';
        throw err;
      }
      if (arg === '--cwd') out.cwd = value;
      else out.home = value;
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      const err = new Error(`unknown flag ${arg}`);
      err.code = 'USAGE';
      throw err;
    }
    const err = new Error(`unknown argument ${arg}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

function usageText(kitRoot) {
  return `@0xray/grok-bot — complete setup path for Grok Bot agents

Commands:
  doctor | ready   Prove mill+inspect, warn if house/HOUSE.md is missing, fail if example lines remain
  (default)        Point at AGENTS.md / SKILLS.md / llms.txt

Flags:
  --cwd <dir>      Seat root (default: cwd)
  --home <dir>     Home for ~/.ows check (tests)
  --json           Machine-readable doctor report
  --print-llms     Print kit llms.txt

Kit files:
  ${path.join(kitRoot, 'AGENTS.md')}
  ${path.join(kitRoot, 'SKILLS.md')}
  ${path.join(kitRoot, 'llms.txt')}

Per key agent: fasten suit → (optional) Groover identity → OWS pay → hangar shops.
`;
}

function runDoctorCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const kitRoot = io.kitRoot || path.resolve(__dirname, '..');
  let parsed;
  try {
    parsed = parseDoctorArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`${message}\n`);
    stdout.write(usageText(kitRoot));
    return 2;
  }
  if (!parsed.command || parsed.command === 'help') {
    stdout.write(usageText(kitRoot));
    const llms = path.join(kitRoot, 'llms.txt');
    if (parsed.printLlms && fs.existsSync(llms)) {
      stdout.write(fs.readFileSync(llms, 'utf8'));
    }
    return 0;
  }
  const report = diagnoseSeat({ cwd: parsed.cwd, home: parsed.home });
  if (parsed.json) {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    stdout.write(formatDoctor(report));
  }
  return report.ok ? 0 : 1;
}

module.exports = {
  PLANT_URLS,
  diagnoseSeat,
  formatDoctor,
  parseDoctorArgs,
  runDoctorCli,
  usageText,
};
