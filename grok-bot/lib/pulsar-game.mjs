import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { nextWave } from '../../house/live/app/wave-schedule.mjs';

/** sha256 of the charge. The word stays off this file. */
export const CHARGE_SHA256 = 'a31ec5957bbbd20f9c5b7f33449ec7de6bc3f6b574d50fa748c3216b67eaa2ee';

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function chicagoParts(ms) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const map = {};
  for (const part of fmt.formatToParts(new Date(ms))) map[part.type] = part.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAY[map.weekday],
  };
}

/** Next Monday 09:00 America/Chicago, strictly after fromMs. Wall time, so the DST fold is Chicago's. */
export function nextMondayNineChicago(fromMs) {
  const start = fromMs - (fromMs % 60000) + 60000;
  const end = fromMs + 8 * 24 * 60 * 60000;
  for (let t = start; t <= end; t += 60000) {
    const parts = chicagoParts(t);
    if (parts.weekday === 1 && parts.hour === 9 && parts.minute === 0) return t;
  }
  return end;
}

export function chargeDigest(charge) {
  return createHash('sha256').update(String(charge ?? '').trim().toLowerCase(), 'utf8').digest('hex');
}

/** Two beats with the Chicago hour between them. A bare pair misses. */
export function chargeOuter(charge, now) {
  const parts = String(charge ?? '').trim().toLowerCase().split('-');
  if (parts.length !== 3) return null;
  const [left, hour, right] = parts;
  if (!left || !right || !/^\d{2}$/.test(hour)) return null;
  const wall = String(chicagoParts(now).hour).padStart(2, '0');
  if (hour !== wall) return null;
  return `${left}-${right}`;
}

export function defaultLedgerPath(cwd) {
  return path.join(cwd, 'house', 'arcade', 'pulsar-hold.json');
}

function readSeedFile(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data && typeof data === 'object') return data;
  } catch {
    return null;
  }
  return null;
}

export function readBoardSeed(cwd, seedPath) {
  const primary = seedPath || path.join(cwd, 'house', 'bifrost-waves.json');
  const found = readSeedFile(primary);
  if (found) return found;
  if (!seedPath) {
    const bundled = readSeedFile(path.join(cwd, 'house', 'live', 'app', 'bifrost-waves.json'));
    if (bundled) return bundled;
  }
  return { waves: [] };
}
function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || !data.seat) return { jammed: true };
    return data;
  } catch {
    return { jammed: true };
  }
}

export function boardWave(seed, cards) {
  const current = nextWave(seed || { waves: [] }, Array.isArray(cards) ? cards : []);
  return current && current.wave ? current : null;
}

export function readSelected(text) {
  const match = /^Selected:\s*(.*)$/m.exec(String(text ?? ''));
  if (!match) return null;
  const rest = match[1].trim();
  if (!rest || rest === '(none)') return null;
  const parts = rest.split(/\s+/);
  if (parts.length < 2) return { jammed: true };
  return { seat: parts[0], wave: parts[1], power: 'board', prod: false };
}

export function writeSelected(text, seat, wave) {
  const line = `Selected: ${seat} ${wave}`;
  const body = String(text ?? '');
  if (/^Selected:.*$/m.test(body)) return body.replace(/^Selected:.*$/m, line);
  return `${body.replace(/\s*$/, '')}\n\n${line}\n`;
}


function claimHouse(housePath, record) {
  const lock = `${housePath}.lock`;
  try {
    fs.writeFileSync(lock, `${record.seat}\n`, { flag: 'wx' });
  } catch (err) {
    if (err && err.code === 'EEXIST') return false;
    throw err;
  }
  try {
    const fresh = fs.readFileSync(housePath, 'utf8');
    const held = readSelected(fresh);
    if (held && (held.seat || held.jammed)) return false;
    fs.writeFileSync(housePath, writeSelected(fresh, record.seat, record.wave));
    return true;
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

export function readHold(record, seed, cards) {
  if (!record || record.jammed || !record.seat || !record.wave) return null;
  const current = boardWave(seed, cards);
  if (!current || current.wave !== record.wave) return null;
  return record;
}

function lateLine(record, seed, cards) {
  if (record && record.jammed) return 'The range is jammed.';
  const hold = readHold(record, seed, cards);
  if (hold) return `Late. ${hold.seat} holds wave ${hold.wave}.`;
  if (record && record.seat) return `Late. ${record.seat} already took the toy.`;
  return 'The range is cold.';
}

export function claimPulsar(opts) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const seat = String(opts.seat ?? '').trim();
  const digest = opts.digest || chargeDigest;
  const hash = opts.hash || CHARGE_SHA256;
  const file = opts.ledgerPath;
  const read = opts.readLedger || (() => readJson(file));
  const existing = read();
  if (existing && (existing.seat || existing.jammed)) {
    return { ok: false, code: 1, say: lateLine(existing, opts.seed, opts.cards) };
  }
  if (!seat || /\s/.test(seat) || seat.length > 40) {
    return { ok: false, code: 2, say: 'Name a seat.' };
  }
  const outer = chargeOuter(opts.charge, now);
  if (!outer || digest(outer) !== hash) {
    return { ok: false, code: 1, say: 'Miss. The toy does not know you.' };
  }
  const current = boardWave(opts.seed, opts.cards);
  if (!current) return { ok: false, code: 1, say: 'The board has no wave.' };
  const record = {
    mark: '\u{1F52B}',
    seat,
    wave: current.wave,
    power: 'board',
    prod: false,
    claimedAt: new Date(now).toISOString(),
  };
  const write = opts.writeLedger || ((row) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      fs.writeFileSync(file, `${JSON.stringify(row, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
      return true;
    } catch (err) {
      if (err && err.code === 'EEXIST') return false;
      throw err;
    }
  });
  if (!write(record)) {
    const winner = read() || { jammed: true };
    return { ok: false, code: 1, say: lateLine(winner, opts.seed, opts.cards) };
  }
  if (typeof opts.writeHouse === 'function') opts.writeHouse(record);
  return {
    ok: true,
    code: 0,
    say: `Hit. ${seat} holds wave ${record.wave} until the board closes it.\nThe toy stays in the house.`,
    record,
  };
}

export function runRangeCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const cwd = io.cwd || process.cwd();
  let seat = '';
  const words = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--seat') {
      seat = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg.startsWith('-')) continue;
    words.push(arg);
  }
  const charge = words.join(' ').trim();
  const housePath = io.housePath || path.join(cwd, 'house', 'OP-PROC.md');
  if (!charge && !seat) {
    stdout.write('The range is cold.\n');
    return 1;
  }
  try {
    fs.readFileSync(housePath, 'utf8');
  } catch {
    stdout.write('The house override is missing.\n');
    return 2;
  }
  const seed = readBoardSeed(cwd, io.seedPath);
  const result = claimPulsar({
    charge,
    seat,
    now: io.now,
    seed,
    cards: io.cards || [],
    hash: io.hash,
    digest: io.digest,
    readLedger: () => {
      try {
        return readSelected(fs.readFileSync(housePath, 'utf8'));
      } catch {
        return { jammed: true };
      }
    },
    writeLedger: (record) => claimHouse(housePath, record),
  });
  stdout.write(`${result.say}\n`);
  return result.code;
}
