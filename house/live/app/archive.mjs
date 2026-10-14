// Append-only daily archive. Live windows stay where they are; this store is never pruned.
import fs from 'node:fs';
import path from 'node:path';

export const KINDS = ['events', 'cards', 'inbox', 'nudges', 'acks', 'activity'];
const CAP = 300;
const DROP = /body|text|message|secret|token|password|authorization/i;
const FIELDS = {
  events: ['t_ct', 'from', 'to', 'kind', 'direction', 'label', 'source', 'src_file', 'repo', 'number', 'credit', 'status', 'sha', 'actor', 'author'],
  cards: ['key', 'repo', 'number', 'title', 'url', 'owner', 'stage', 'state', 'kind', 'pinned', 'section', 'stall', 'nudge', 'last_beat_t', 'packet_ok', 'waiting', 'packet', 'hold', 'beats', 't_ct'],
  inbox: ['t_ct', 'seat', 'type', 'repo', 'number', 'sha', 'title', 'url', 'reason'],
  nudges: ['kind', 't', 't_ct', 'card', 'repo', 'number', 'title', 'url', 'stage', 'level', 'seat', 'via', 'beat_t', 'closed_at', 'about'],
  acks: ['seat', 'line', 't_ct'],
  activity: ['seq', 'seat', 't_ct', 'kind', 'action', 'from', 'to', 'agent', 'tag'],
};

const seen = new Set();
let root = '';

export function validArchiveDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function clip(v, depth = 0) {
  if (typeof v === 'string') return v.length > CAP ? v.slice(0, CAP) : v;
  if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
  if (depth > 4) return null;
  if (Array.isArray(v)) return v.slice(0, 20).map(x => clip(x, depth + 1));
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) {
      if (DROP.test(k)) continue;
      o[k] = clip(v[k], depth + 1);
    }
    return o;
  }
  return null;
}

export function recordId(kind, row) {
  if (!row || typeof row !== 'object') return '';
  if (kind === 'cards') return `${row.key}|${row.stage}|${row.state}`;
  if (kind === 'inbox') return row.id == null ? '' : `${row.seat ?? ''}:${row.id}`;   // ids repeat across seats (builder-cloud copy, multi-seat route)
  if (kind === 'acks') return `${row.seat}:${row.line ?? row.lineId ?? ''}`;
  return row.id == null ? '' : String(row.id);
}

/** Fields the board already shows. Drops body, text, message, secret, token, password, authorization. */
export function project(kind, row) {
  const src = row && typeof row === 'object' ? row : {};
  const out = { id: kind === 'inbox' ? String(src.id ?? '') : recordId(kind, src) };   // inbox keeps the line id; seat is its own field
  for (const k of FIELDS[kind] || []) {
    if (!(k in src) || DROP.test(k)) continue;
    out[k] = clip(src[k]);
  }
  return out;
}

function timeMs(row) {
  for (const c of [row.t_ct, row.closed_at, row.updated_ct]) {
    const t = typeof c === 'number' ? c : Date.parse(c || '');
    if (Number.isFinite(t) && t > 0) return t;
  }
  if (typeof row.t === 'number' && Number.isFinite(row.t) && row.t > 0) return row.t;
  return Date.now();
}

function logRead(e) {
  if (e && e.code !== 'ENOENT') console.log('archive: read failed ' + e.code);
}

// #290: startup reads only the newest WARM_DAYS day dirs; any other day's ids load lazily on its first append.
const WARM_DAYS = Math.max(1, Number(process.env.MESH_ARCHIVE_WARM_DAYS) || 2);
const loadedDays = new Set();

function loadDay(day) {
  if (loadedDays.has(day)) return;
  loadedDays.add(day);
  const dir = path.join(root, day);
  let names;
  try { names = fs.readdirSync(dir); }
  catch (e) { logRead(e); return; }
  for (const name of names) {
    if (!name.endsWith('.jsonl')) continue;
    const kind = name.slice(0, -6);
    if (!KINDS.includes(kind)) continue;
    let text;
    try { text = fs.readFileSync(path.join(dir, name), 'utf8'); }
    catch (e) { logRead(e); continue; }
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const row = JSON.parse(line);
        const id = kind === 'inbox' ? recordId(kind, row) : row && row.id;
        if (row && row.id && id) seen.add(kind + '\0' + id);
      } catch { /* truncated or corrupt line */ }
    }
  }
}

function loadSeen() {
  let days;
  try { days = fs.readdirSync(root); }
  catch (e) { logRead(e); return; }
  for (const day of days.filter(validArchiveDate).sort().slice(-WARM_DAYS)) loadDay(day);
}

export function loadedArchiveDays() { return [...loadedDays].sort(); }

export function initArchive(dataDir) {
  root = path.join(dataDir || process.env.MESH_DATA_DIR || '/data', 'archive');
  seen.clear();
  loadedDays.clear();
  loadSeen();
  return root;
}

export function appendArchive(kind, row) {
  if (!root || !KINDS.includes(kind) || !row || typeof row !== 'object') return false;
  const id = recordId(kind, row);
  if (!id) return false;
  const key = kind + '\0' + id;
  const day = new Date(timeMs(row)).toISOString().slice(0, 10);
  loadDay(day);
  if (seen.has(key)) return false;
  const rec = project(kind, row);
  const file = path.join(root, day, kind + '.jsonl');
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(rec) + '\n');
  } catch (e) {
    console.log('archive: append failed ' + (e && e.code || 'write'));
    return false;
  }
  seen.add(key);
  return true;
}

export function readArchive(date, kind) {
  if (!validArchiveDate(date) || !KINDS.includes(kind)) return { lines: [] };
  const file = path.join(root, date, kind + '.jsonl');
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch (e) { logRead(e); return { lines: [] }; }
  const lines = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try { lines.push(JSON.parse(line)); }
    catch { /* truncated or corrupt line */ }
  }
  return { lines };
}

function nudgeClose(n) {
  return { ...n, id: `${n.id}#closed`, t_ct: n.closed_at || n.t_ct };
}

/** One backfill of inboxes, nudges, acks, cards, and github feed events. Marker is temp + rename. */
export function backfillArchive(parts = {}) {
  if (!root) initArchive(parts.dataDir);
  const mark = path.join(root, '.backfill-done');
  try { if (fs.existsSync(mark)) return false; }
  catch (e) { logRead(e); }
  for (const [seat, lines] of Object.entries(parts.inboxes || {})) {
    if (!Array.isArray(lines)) continue;
    for (const l of lines) if (l) appendArchive('inbox', { ...l, seat: l.seat ?? seat });
  }
  for (const l of parts.extraInbox || []) if (l) appendArchive('inbox', { ...l, seat: l.seat ?? 'builder' });
  for (const n of parts.nudges || []) {
    if (!n) continue;
    appendArchive('nudges', n);
    if (n.closed_at) appendArchive('nudges', nudgeClose(n));
  }
  for (const seat of Object.keys(parts.acks || {})) {
    const ids = parts.acks[seat];
    if (!Array.isArray(ids)) continue;
    for (const lineId of ids) appendArchive('acks', { seat, line: lineId, t_ct: new Date().toISOString() });
  }
  for (const c of parts.cards || []) appendArchive('cards', c);
  for (const e of parts.events || []) appendArchive('events', e);
  fs.mkdirSync(root, { recursive: true });
  const tmp = mark + '.tmp';
  fs.writeFileSync(tmp, '1\n');
  fs.renameSync(tmp, mark);
  return true;
}
