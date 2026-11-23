'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { installNearMill } = require('./near-mill.cjs');
const { formatNearSummary, loadNearSummary, writeNearSummary } = require('./near-summary.cjs');

// mintAfterWear only re-applies the mill plant overlay
// (src/cli/commands/foundry-mint-wear.ts). This command records the foundry the
// person earns with. The shop config and the NEAR receiver come from
// near-mill, which seats the account through near-seat.
// Plan: house/dist/mill/near-first-build-eval-2026-11.md (b) and section 3.3.
const CREATE_USAGE = 'grok-bot foundry-create --id <id> --seat <seat> --account <account>';

function foundryRecordPath(dest) {
  return path.join(dest, '.xray', 'state', 'foundry.json');
}

function foundryIdOf(value) {
  if (typeof value !== 'string') return '';
  const id = value.trim();
  if (id.length === 0 || /[\r\n]/.test(id)) return '';
  return id;
}

function readFoundryFile(file) {
  if (!fs.existsSync(file)) return { kind: 'absent' };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { kind: 'invalid' };
    return { kind: 'record', data };
  } catch {
    return { kind: 'invalid' };
  }
}

function sameFoundry(data, foundryId, receiver) {
  return data.id === foundryId && data.receiver === receiver;
}

function replaceError(existing) {
  if (existing.kind === 'record') {
    const id = typeof existing.data.id === 'string' ? existing.data.id : 'unknown';
    const receiver = typeof existing.data.receiver === 'string' ? existing.data.receiver : 'unknown';
    return new Error(`foundry record is ${id} receiver ${receiver}; pass --force to replace`);
  }
  return new Error('foundry record cannot be read; pass --force to replace');
}

function emitFoundry(opts, record) {
  const line = `Foundry: ${record.id} — receiver ${record.receiver}`;
  if (typeof opts.log === 'function') opts.log(line);
  if (opts.stdout && typeof opts.stdout.write === 'function') opts.stdout.write(`${line}\n`);
}

function emitSummary(opts, summary) {
  const text = formatNearSummary(summary);
  if (typeof opts.log === 'function') opts.log(text.trimEnd());
  if (opts.stdout && typeof opts.stdout.write === 'function') opts.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

function withFoundry(summary, foundryId, seatId) {
  const base = summary && typeof summary === 'object' ? summary : {
    version: 1,
    network: 'testnet',
    accountId: '',
    seat: seatId,
    transactions: [],
    keys: [],
    verified: [],
    credentials: { files: 0, dirs: 0 },
  };
  return {
    ...base,
    foundryId,
    seat: base.seat || seatId,
    pending: {
      listing: 'pending',
      pay: 'pending',
      cap: 'pending',
      escrow: 'pending',
    },
  };
}

function writeFoundryRecord(destFile, body) {
  const dir = path.dirname(destFile);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(destFile)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
  let fd;
  try {
    fd = fs.openSync(tmp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o644);
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } catch (err) {
    if (fd != null) fs.closeSync(fd);
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  fs.closeSync(fd);
  try {
    fs.renameSync(tmp, destFile);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

function keptResult(opts, foundryId, foundryPath, record) {
  return {
    dest: opts.dest,
    foundryId,
    receiver: record.receiver,
    foundryPath,
    record,
    npmPublish: false,
    kept: true,
  };
}

async function createFoundry(opts = {}) {
  const foundryId = foundryIdOf(opts.foundryId);
  if (!foundryId) throw new Error('foundryId is required');
  if (!opts.dest) throw new Error('dest is required');
  if (!opts.seatId) throw new Error('seatId is required');
  if (!opts.accountId) throw new Error('accountId is required');
  const foundryPath = foundryRecordPath(opts.dest);
  const existing = readFoundryFile(foundryPath);
  if (existing.kind === 'record' && sameFoundry(existing.data, foundryId, opts.accountId)) {
    emitFoundry(opts, existing.data);
    const keptSummary = loadNearSummary(opts.dest);
    if (keptSummary) emitSummary(opts, withFoundry(keptSummary, foundryId, opts.seatId));
    return keptResult(opts, foundryId, foundryPath, existing.data);
  }
  if (existing.kind !== 'absent' && !opts.force) throw replaceError(existing);
  const installed = await installNearMill(opts);
  const receiver = installed.seated && installed.seated.accountId;
  if (typeof receiver !== 'string' || receiver.length === 0) throw new Error('NEAR receiver missing');
  const summary = withFoundry(installed.seated && installed.seated.summary, foundryId, opts.seatId);
  if (installed.seatHome) writeNearSummary(installed.seatHome, summary, []);
  const again = readFoundryFile(foundryPath);
  if (again.kind === 'record' && sameFoundry(again.data, foundryId, receiver) && !opts.force) {
    emitFoundry(opts, again.data);
    emitSummary(opts, summary);
    return keptResult(opts, foundryId, foundryPath, again.data);
  }
  if (again.kind !== 'absent' && !sameFoundry(again.data || {}, foundryId, receiver) && !opts.force) {
    throw replaceError(again);
  }
  const kitRoot = opts.kitRoot || path.resolve(__dirname, '..');
  const skillSrc = path.join(kitRoot, 'skills', 'foundry-create', 'SKILL.md');
  const skillTarget = path.join(opts.dest, 'skills', 'foundry-create', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillTarget), { recursive: true });
  fs.copyFileSync(skillSrc, skillTarget);
  const record = {
    id: foundryId,
    receiver,
    network: 'near:testnet',
    shop: {
      hangar: installed.manifest.groover.hangar,
      steps: installed.manifest.groover.steps,
      accepts: installed.manifest.accepts,
    },
  };
  writeFoundryRecord(foundryPath, `${JSON.stringify(record, null, 2)}\n`);
  emitFoundry(opts, record);
  emitSummary(opts, summary);
  return {
    dest: installed.dest,
    seatHome: installed.seatHome,
    seatId: installed.seatId,
    foundryId,
    receiver,
    foundryPath,
    record,
    summary,
    npmPublish: false,
    kept: false,
  };
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${CREATE_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseFoundryCreateArgs(argv) {
  const out = {
    help: false,
    force: false,
    foundryId: null,
    seatId: null,
    accountId: null,
    cwd: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--force') {
      out.force = true;
      continue;
    }
    if (arg === '--id' || arg === '--seat' || arg === '--account' || arg === '--cwd') {
      const value = takeValue(argv, i, arg);
      if (arg === '--id') out.foundryId = value;
      else if (arg === '--seat') out.seatId = value;
      else if (arg === '--account') out.accountId = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${CREATE_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

async function runFoundryCreateCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const create = io.createFoundry || createFoundry;
  let parsed;
  try {
    parsed = parseFoundryCreateArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`${message}\n`);
    return 2;
  }
  if (parsed.help) {
    stdout.write(`${CREATE_USAGE}\n`);
    return 0;
  }
  if (!parsed.foundryId || !parsed.seatId || !parsed.accountId) {
    stderr.write(`${CREATE_USAGE}\n`);
    return 2;
  }
  try {
    await create({
      dest: parsed.cwd || io.cwd || process.cwd(),
      foundryId: parsed.foundryId,
      seatId: parsed.seatId,
      accountId: parsed.accountId,
      force: parsed.force,
      credentialsHome: io.credentialsHome,
      kitRoot: io.kitRoot,
      stdout,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`${message}\n`);
    return 1;
  }
  return 0;
}

module.exports = {
  CREATE_USAGE,
  createFoundry,
  foundryRecordPath,
  parseFoundryCreateArgs,
  runFoundryCreateCli,
  writeFoundryRecord,
};
