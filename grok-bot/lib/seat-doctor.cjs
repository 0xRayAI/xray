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

function xrayPackageInstalled(cwd) {
  return isFile(path.join(cwd, 'node_modules', '0xray', 'package.json'));
}

function shellTokens(command) {
  const tokens = [];
  let current = '';
  let quote = '';
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = '';
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

// ${NAME:-fallback}rest is the path when the variable is unset. A token with no slash is a PATH name (node, npx).
function literalPathToken(token) {
  let value = token;
  const eq = value.indexOf('=');
  if (eq > 0 && value.slice(0, eq).indexOf('/') === -1) value = value.slice(eq + 1);
  const fallback = /^\$\{[A-Za-z_][A-Za-z0-9_]*:-([^}]*)\}(.*)$/.exec(value);
  if (fallback) value = `${fallback[1]}${fallback[2]}`;
  if (value.indexOf('/') === -1) return null;
  // @scope/name is an npm package on PATH, not a file under cwd.
  if (/^@[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) return null;
  if (value.indexOf('$') !== -1 || value.indexOf('`') !== -1) return null;
  return value;
}

function commandStrings(node, out) {
  if (Array.isArray(node)) {
    for (const item of node) commandStrings(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (typeof node.command === 'string') out.push(node.command);
  if (Array.isArray(node.args)) {
    for (const arg of node.args) {
      if (typeof arg === 'string') out.push(arg);
      else commandStrings(arg, out);
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'command' || key === 'args') continue;
    if (value && typeof value === 'object') commandStrings(value, out);
  }
}

function deadHookPaths(cwd) {
  const dir = path.join(cwd, '.grok', 'hooks');
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const dead = [];
  const seen = new Set();
  const files = names.filter((entry) => entry.endsWith('.json')).sort();
  for (const name of files) {
    const file = path.join(dir, name);
    const json = readJson(file);
    if (!json) continue;
    const commands = [];
    commandStrings(json, commands);
    for (const command of commands) {
      for (const token of shellTokens(command)) {
        const literal = literalPathToken(token);
        if (!literal) continue;
        const resolved = path.resolve(cwd, literal);
        if (fs.existsSync(resolved)) continue;
        const key = `${file}\n${resolved}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dead.push({ file, path: resolved });
      }
    }
  }
  return dead;
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

// A leading `(example)` marker is unfilled. A mid-line mention is not.
const HOUSE_EXAMPLE_LINE = /^\s*[-*]?\s*\(example\)/;
// Opt out of wallet nags. A mid-line mention is not an opt-out.
const WALLET_OFF_LINE = /^\s*[-*]?\s*(?:scope:\s*)?wallet\s+off\s*$/i;

function scopeFromHouseText(text) {
  const off = text.split(/\r?\n/).some((line) => WALLET_OFF_LINE.test(line));
  return { wallet: off ? 'off' : 'on' };
}

function walletStepsOff(report) {
  return Boolean(report.house && report.house.scope && report.house.scope.wallet === 'off');
}

function walkForHouse(start) {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, 'house', 'HOUSE.md');
    if (fs.existsSync(candidate)) return path.resolve(candidate);
    if (dir === root) return null;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function fileFromHouseEnv(envValue) {
  const resolved = path.resolve(envValue);
  try {
    const st = fs.statSync(resolved);
    if (st.isFile()) return resolved;
    if (st.isDirectory()) {
      const direct = path.join(resolved, 'HOUSE.md');
      if (fs.existsSync(direct)) return path.resolve(direct);
    }
  } catch {
    return null;
  }
  return null;
}

function inspectHouseFile(file, via) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return {
      status: 'warn',
      file: null,
      via: null,
      detail: 'house is not enabled here',
    };
  }
  const exampleSibling = path.join(path.dirname(file), 'EXAMPLE.md');
  const scope = scopeFromHouseText(text);
  if (fs.existsSync(exampleSibling)) {
    return {
      status: 'fail',
      file,
      via,
      detail: 'house/EXAMPLE.md exists — delete it',
      scope,
    };
  }
  const unfilled = text.split(/\r?\n/).filter((line) => HOUSE_EXAMPLE_LINE.test(line));
  if (unfilled.length > 0) {
    return {
      status: 'fail',
      file,
      via,
      detail: 'HOUSE.md still has unfilled example lines',
      unfilled: unfilled.length,
      scope,
    };
  }
  return { status: 'pass', file, via, detail: file, scope };
}

function probeHouse(cwd, env) {
  const raw = env && typeof env.GROK_BOT_HOUSE === 'string' ? env.GROK_BOT_HOUSE.trim() : '';
  if (raw) {
    const file = fileFromHouseEnv(raw);
    if (!file) {
      return {
        status: 'warn',
        file: null,
        via: null,
        detail: 'house is not enabled here',
        missing: path.resolve(raw),
      };
    }
    return inspectHouseFile(file, 'GROK_BOT_HOUSE');
  }
  const walked = walkForHouse(cwd);
  if (!walked) {
    return {
      status: 'warn',
      file: null,
      via: null,
      detail: 'house is not enabled here',
    };
  }
  return inspectHouseFile(walked, 'walk-up');
}

function isFile(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function houseTemplateNames(srcDir) {
  return fs.readdirSync(srcDir).filter((name) => {
    if (name === 'EXAMPLE.md') return false;
    return isFile(path.join(srcDir, name));
  });
}

function legacyBoardPath(seatRoot) {
  return path.join(seatRoot, 'ops', 'WAVEBOARD.md');
}

function initHouse(opts = {}) {
  const seatRoot = path.resolve(opts.dir || opts.cwd || process.cwd());
  const kitRoot = opts.kitRoot || path.resolve(__dirname, '..');
  const srcDir = path.join(kitRoot, 'templates', 'house');
  const destDir = path.join(seatRoot, 'house');
  if (!fs.existsSync(srcDir)) {
    return { ok: false, code: 1, message: `templates/house is missing (${srcDir})` };
  }
  const names = houseTemplateNames(srcDir);
  if (opts.migrate) return migrateHouse({ seatRoot, srcDir, destDir, names });
  const conflicts = [];
  for (const name of names) {
    const dest = path.join(destDir, name);
    if (fs.existsSync(dest)) conflicts.push(dest);
  }
  if (conflicts.length > 0) {
    return {
      ok: false,
      code: 1,
      message: `refusing to overwrite existing house files: ${conflicts.join(', ')}`,
    };
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of names) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
  }
  return {
    ok: true,
    code: 0,
    destDir,
    files: names.map((name) => path.join(destDir, name)),
    moved: null,
    message: `copied templates/house to ${destDir}`,
  };
}

function migrateHouse({ seatRoot, srcDir, destDir, names }) {
  const legacy = legacyBoardPath(seatRoot);
  const destBoard = path.join(destDir, 'WAVEBOARD.md');
  if (fs.existsSync(legacy) && !isFile(legacy)) {
    return { ok: false, code: 1, message: `refusing to migrate: ${legacy} is not a file` };
  }
  const legacyIsFile = isFile(legacy);
  if (legacyIsFile && isFile(destBoard)) {
    const templateBoard = path.join(srcDir, 'WAVEBOARD.md');
    const templateText = isFile(templateBoard) ? fs.readFileSync(templateBoard, 'utf8') : null;
    const destText = fs.readFileSync(destBoard, 'utf8');
    if (templateText === null || destText !== templateText) {
      return {
        ok: false,
        code: 1,
        message: `refusing to overwrite ${destBoard} with ${legacy}`,
      };
    }
  }
  fs.mkdirSync(destDir, { recursive: true });
  let moved = null;
  if (legacyIsFile) {
    fs.copyFileSync(legacy, destBoard);
    fs.unlinkSync(legacy);
    moved = destBoard;
  }
  const copied = [];
  const skipped = [];
  for (const name of names) {
    if (name === 'WAVEBOARD.md' && moved) continue;
    const dest = path.join(destDir, name);
    if (isFile(dest)) {
      skipped.push(dest);
      continue;
    }
    fs.copyFileSync(path.join(srcDir, name), dest);
    copied.push(dest);
  }
  const attention = path.join(destDir, 'ATTENTION_STATE.md');
  const parts = [];
  if (moved) parts.push(`moved ${legacy} to ${destBoard}`);
  else parts.push('no ops/WAVEBOARD.md to move');
  if (copied.includes(attention)) parts.push(`started ${attention}`);
  if (copied.length > 0) parts.push(`copied templates/house to ${destDir}`);
  else if (!moved) parts.push(`left existing house files in ${destDir}`);
  return {
    ok: true,
    code: 0,
    destDir,
    files: moved ? [moved, ...copied] : copied,
    moved,
    skipped,
    message: parts.join('; '),
  };
}

function nextSteps(report) {
  const steps = [];
  const installStep = 'npm i 0xray && npx @0xray/foundry inspect --skip-live';
  if (!report.plant.installed) steps.push(installStep);
  const millReady = report.plant.mill && report.plant.inspect;
  if (!millReady) {
    steps.push('Fasten mill+inspect: npm i 0xray && npx @0xray/foundry mint --skip-live');
    steps.push('Prove plant: npx @0xray/foundry inspect --skip-live (expect mill + inspect, costume false)');
  } else if (report.plant.ok) {
    steps.push('Prove again later: npx @0xray/foundry inspect --skip-live');
  } else if (report.plant.installed) {
    steps.push(installStep);
  }
  if (!walletStepsOff(report)) {
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
  const installed = xrayPackageInstalled(cwd);
  const deadHooks = deadHookPaths(cwd);
  const plantOk = Boolean(seat) && mill && inspect && installed && deadHooks.length === 0;
  const house = probeHouse(cwd, opts.env || process.env);
  const report = {
    ok: plantOk && house.status !== 'fail',
    cwd,
    seat,
    plant: {
      ok: plantOk,
      installed,
      deadHooks,
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

function plantLine(report) {
  if (report.plant.ok) return 'Plant: PASS — mill+inspect fastened';
  const parts = [];
  if (!report.plant.mill || !report.plant.inspect) parts.push('mill+inspect not fastened');
  if (!report.plant.installed) parts.push('missing node_modules/0xray/package.json');
  for (const dead of report.plant.deadHooks) {
    parts.push(`${dead.file} missing ${dead.path}`);
  }
  if (parts.length === 0) parts.push('mill+inspect not fastened');
  return `Plant: FAIL — ${parts.join('; ')}`;
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
  lines.push(plantLine(report));
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
  if (walletStepsOff(report)) {
    lines.push('OWS pay: skipped — house Scope wallet off');
  } else {
    lines.push(
      report.ows.present
        ? `OWS pay: yes — ${report.ows.path}`
        : `OWS pay: miss — ${report.ows.path} (hangar shops return 402 until paid)`,
    );
  }
  if (report.house) {
    let label = 'WARN';
    if (report.house.status === 'pass') label = 'PASS';
    else if (report.house.status === 'fail') label = 'FAIL';
    const spoken = report.house.status === 'pass' ? 'house on' : report.house.detail;
    if (report.house.file && report.house.via) {
      const tail = report.house.status === 'fail' ? ` — ${report.house.detail}` : '';
      const lead = report.house.status === 'fail' ? '' : `${spoken} — `;
      lines.push(`House: ${label} — ${lead}${report.house.file} (via ${report.house.via})${tail}`);
    } else {
      lines.push(`House: ${label} — ${spoken}`);
    }
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
  const out = { command: null, cwd: null, home: null, dir: null, json: false, printLlms: false, migrate: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === 'doctor' || arg === 'ready' || arg === 'help') {
      out.command = arg;
      continue;
    }
    if (arg === 'house') {
      const next = argv[i + 1];
      if (next !== 'init') {
        const err = new Error('usage: grok-bot house init');
        err.code = 'USAGE';
        throw err;
      }
      out.command = 'house-init';
      i += 1;
      continue;
    }
    if (arg === '--migrate') {
      out.migrate = true;
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
    if (arg === '--cwd' || arg === '--home' || arg === '--dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        const err = new Error(`${arg} needs a path`);
        err.code = 'USAGE';
        throw err;
      }
      if (arg === '--cwd') out.cwd = value;
      else if (arg === '--home') out.home = value;
      else out.dir = value;
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
  doctor | ready   Prove mill+inspect. Say house on, or house is not enabled here. Fail if example lines remain
  house init       Copy templates/house into ./house. Refuses if a target file exists
  house init --migrate
                   Move ops/WAVEBOARD.md to house/WAVEBOARD.md when that old board is a file. Start ATTENTION_STATE.md from the template when it is missing. Leave a house file you already changed. Refuse when both boards exist and the house board is not the untouched template
  (default)        Point at AGENTS.md / SKILLS.md / llms.txt

Flags:
  --cwd <dir>      Seat root for doctor (default: cwd)
  --dir <path>     Seat root for house init (default: cwd)
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
  if (parsed.migrate && parsed.command !== 'house-init') {
    stderr.write('--migrate is only valid with house init\n');
    stdout.write(usageText(kitRoot));
    return 2;
  }
  if (parsed.command === 'house-init') {
    const result = initHouse({ dir: parsed.dir || parsed.cwd, kitRoot, migrate: parsed.migrate });
    stdout.write(`${result.message}\n`);
    return result.code;
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
  initHouse,
  parseDoctorArgs,
  runDoctorCli,
  usageText,
};
