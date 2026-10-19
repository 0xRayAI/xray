import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

export function readHold(record, now) {
  if (!record || record.jammed || !record.seat || !record.until) return null;
  const until = Date.parse(record.until);
  if (!Number.isFinite(until) || until <= now) return null;
  return record;
}

function lateLine(record, now) {
  if (record && record.jammed) return 'The range is jammed.';
  const hold = readHold(record, now);
  if (hold) return `Late. ${hold.seat} holds the board until ${hold.until}.`;
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
    return { ok: false, code: 1, say: lateLine(existing, now) };
  }
  if (!seat || /\s/.test(seat) || seat.length > 40) {
    return { ok: false, code: 2, say: 'Name a seat.' };
  }
  const outer = chargeOuter(opts.charge, now);
  if (!outer || digest(outer) !== hash) {
    return { ok: false, code: 1, say: 'Miss. The toy does not know you.' };
  }
  const untilMs = nextMondayNineChicago(now);
  const record = {
    mark: '\u{1F52B}',
    seat,
    power: 'board',
    prod: false,
    claimedAt: new Date(now).toISOString(),
    until: new Date(untilMs).toISOString(),
    window: 'Monday 09:00 America/Chicago',
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
    return { ok: false, code: 1, say: lateLine(winner, now) };
  }
  return {
    ok: true,
    code: 0,
    say: `Hit. ${seat} holds the board until ${record.until}.\nOne wave. The toy stays in the house.`,
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
  if (!charge && !seat) {
    stdout.write('The range is cold.\n');
    return 1;
  }
  const result = claimPulsar({
    charge,
    seat,
    now: io.now,
    ledgerPath: io.ledgerPath || defaultLedgerPath(cwd),
  });
  stdout.write(`${result.say}\n`);
  return result.code;
}
