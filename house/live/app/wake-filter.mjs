// Per-seat wake filter. The line still lands on the board. A skip is reason "filter".
// SEAT_WAKE_FILTER is "actionable" (default), "all", or JSON {mode, seats}.
// fleet-roster.json "wake_filter" is the same JSON when the env var is unset.
// A seat override of "all" keeps the old wake. "actionable" forces the filter.

const HOUR_MS = 60 * 60 * 1000;
const REVIEW = new Set(['review', 'critic_pass', 'critic_fail', 'verdict']);
const GREEN = new Set(['ci_pass', 'ready', 'live_pass']);
const ROUTED = new Set(['near', 'mill']);

function kindOf(line) {
  return String(line && (line.kind || line.type) || '').trim().toLowerCase();
}

export function readWakeFilter(env = {}, roster = null) {
  const raw = env.SEAT_WAKE_FILTER == null ? '' : String(env.SEAT_WAKE_FILTER).trim();
  if (raw === 'all' || raw === 'off') return { mode: 'all', seats: {} };
  let parsed = null;
  if (raw.startsWith('{')) {
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
  }
  if (!parsed && roster && typeof roster.wake_filter === 'object') parsed = roster.wake_filter;
  const seats = parsed && parsed.seats && typeof parsed.seats === 'object' ? parsed.seats : {};
  const mode = parsed && parsed.mode === 'all' ? 'all' : 'actionable';
  return { mode, seats };
}

export function filterMode(config, seat) {
  const over = config && config.seats ? config.seats[seat] : '';
  if (over === 'all' || over === 'off') return 'all';
  if (over === 'actionable') return 'actionable';
  return config && config.mode === 'all' ? 'all' : 'actionable';
}

function mentioned(line, seat) {
  const list = Array.isArray(line && line.mentions) ? line.mentions : [];
  if (list.some(item => String(item).replace(/^@/, '').toLowerCase() === seat)) return true;
  const hay = `${line && line.title || ''}\n${line && line.reason || ''}`;
  return new RegExp(`(^|[^A-Za-z0-9])@${seat}([^A-Za-z0-9]|$)`, 'i').test(hay);
}

function ownerPrompt(line) {
  const kind = kindOf(line);
  return kind === 'prompt' || kind === 'seat_prompt';
}

function stationLine(line) {
  const kind = kindOf(line);
  return kind === 'station' || String(line && line.id || '').startsWith('nudge:station:');
}

function cancelled(line) {
  const text = `${line && line.conclusion || ''} ${line && line.status || ''} ${line && line.reason || ''}`.toLowerCase();
  return /\bcancell?ed\b/.test(text) || /\bskipped\b/.test(text);
}

function currentHead(line, head) {
  if (cancelled(line)) return false;
  const sha = String(line && line.sha || '').trim().toLowerCase();
  const cur = String(head || '').trim().toLowerCase();
  if (!sha || !cur) return Boolean(sha || !head);
  return sha === cur || cur.startsWith(sha) || sha.startsWith(cur);
}

function assignedR(line, seat) {
  if (!ROUTED.has(seat)) return false;
  if (/packet\s*R/i.test(String(line && line.reason || ''))) return true;
  const raci = String(line && (line.raci || (line.packet && line.packet.raci)) || '');
  return new RegExp(`\\bR\\s*=\\s*${seat}\\b`, 'i').test(raci);
}

function markStation(state, seat, now) {
  const prev = state.stationAt.get(seat) || 0;
  if (prev && now - prev < HOUR_MS) return false;
  state.stationAt.set(seat, now);
  return true;
}

function markGreen(state, line) {
  const sha = String(line.sha || '').trim().toLowerCase();
  const key = `${String(line.repo || '').toLowerCase()}#${Number(line.number) || 0}|${sha || String(line.id || '')}`;
  if (state.greenHeads.has(key)) return false;
  state.greenHeads.add(key);
  return true;
}

export function allowWake(config, seat, line, ctx) {
  const who = String(seat || '').toLowerCase();
  if (filterMode(config, who) === 'all') return { allow: true };
  const state = ctx.state;
  const now = ctx.now;
  if (stationLine(line)) return markStation(state, who, now) ? { allow: true } : { allow: false, reason: 'filter' };
  const kind = kindOf(line);
  // The ladder and the stall clock are already the act-now signal. The filter cuts the GitHub noise.
  if (kind === 'nudge' || kind === 'timed_run' || kind === 'clock' || String(line.type || '').toLowerCase() === 'nudge') return { allow: true };
  if (/^nudge L\d/i.test(String(line.reason || ''))) return { allow: true };
  if (ownerPrompt(line) || mentioned(line, who)) return { allow: true };
  if (REVIEW.has(kind) && ctx.owner === who) return { allow: true };
  if (kind === 'ci_fail' && ctx.owner === who && currentHead(line, ctx.head)) return { allow: true };
  if (who === 'critic' && GREEN.has(kind) && markGreen(state, line)) return { allow: true };
  if (who === 'critic' && GREEN.has(kind)) return { allow: false, reason: 'filter' };
  if (assignedR(line, who)) return { allow: true };
  return { allow: false, reason: 'filter' };
}
