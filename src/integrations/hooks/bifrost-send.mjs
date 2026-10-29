/**
 * Worn-hook sends while Bifrost is active.
 * The suit wire is chat activity, the packet, the card tag, and the turn.
 * Chat activity is one activity-feed prompt: kind prompt, action sent, from owner, note the line.
 * The board defaults to https://bifrost.0xray.dev and ~/.burst/seat-keys.
 * One seat key is the seat. A shell may still set LIVE_URL, XRAY_SEAT, or SEAT_KEYS_DIR.
 * A quiet board sends nothing. Tool output and the key stay off the wire.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SUIT_BOARD = 'https://bifrost.0xray.dev';

const TAG = /^[A-Za-z0-9 ._:@#+/\-]{1,80}$/;
const SEAT = /^[a-z0-9-]{2,16}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const HANDOFF_ID = /^handoff:[a-z0-9_.-]+\/[a-z0-9_.-]+#[1-9]\d{0,6}:(ready|critic_fail|live_pass|merge|ci_fail):[0-9a-f]{7,64}$/;
const KINDS = new Set(['ready', 'critic_fail', 'live_pass', 'merge', 'ci_fail']);

export function ctStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  const match = /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(get('timeZoneName').replace(/^GMT/, ''));
  if (!match) return '';
  const stamp = `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}${match[1]}${match[2].padStart(2, '0')}:${(match[3] || '00').padStart(2, '0')}`;
  return STAMP.test(stamp) ? stamp : '';
}

export function boardOrigin(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return '';
  }
  if (url.username || url.password) return '';
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
  return url.origin;
}

function tagFor(kind, owner, repo, number) {
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return '';
  const tag = `${kind}:${owner}/${repo}#${number}`;
  return TAG.test(tag) ? tag : '';
}

export function refsFromText(text) {
  const src = String(text || '').slice(0, 8000);
  const prs = [];
  const issues = [];
  const seen = new Set();
  const pullRe = /https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9._-]{0,38})\/([A-Za-z0-9_][A-Za-z0-9._-]{0,99})\/pull\/([1-9]\d{0,6})\b/g;
  const issueRe = /https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9._-]{0,38})\/([A-Za-z0-9_][A-Za-z0-9._-]{0,99})\/issues\/([1-9]\d{0,6})\b/g;
  const hashRe = /(?:^|[\s(])([A-Za-z0-9][A-Za-z0-9._-]{0,38})\/([A-Za-z0-9_][A-Za-z0-9._-]{0,99})#([1-9]\d{0,6})\b/g;
  const add = (list, kind, owner, repo, number) => {
    const tag = tagFor(kind, owner, repo, number);
    if (!tag || seen.has(tag)) return;
    seen.add(tag);
    list.push({ tag, owner, repo, number: Number(number) });
  };
  for (const match of src.matchAll(pullRe)) add(prs, 'pr', match[1], match[2], match[3]);
  for (const match of src.matchAll(issueRe)) add(issues, 'issue', match[1], match[2], match[3]);
  for (const match of src.matchAll(hashRe)) {
    if (seen.has(tagFor('pr', match[1], match[2], match[3]))) continue;
    add(issues, 'issue', match[1], match[2], match[3]);
  }
  return { issues: issues.slice(0, 4), prs: prs.slice(0, 4) };
}

export function handoffFromText(text, fromSeat, now = new Date()) {
  const src = String(text || '').slice(0, 8000);
  if (!src.includes('--handoff') || !SEAT.test(fromSeat)) return null;
  const to = /--handoff\s+([a-z0-9-]{2,16})\b/.exec(src);
  const pr = /--pr\s+([A-Za-z0-9][A-Za-z0-9._-]{0,38}\/[A-Za-z0-9_][A-Za-z0-9._-]{0,99})#([1-9]\d{0,6})\b/.exec(src);
  const kind = /--kind\s+(ready|critic_fail|live_pass|merge|ci_fail)\b/.exec(src);
  const sha = /--sha\s+([0-9a-fA-F]{7,64})\b/.exec(src);
  if (!to || !pr || !kind || !sha || !KINDS.has(kind[1])) return null;
  const repo = pr[1];
  const number = Number(pr[2]);
  const head = sha[1].toLowerCase();
  const id = `handoff:${repo.toLowerCase()}#${number}:${kind[1]}:${head}`;
  if (!HANDOFF_ID.test(id)) return null;
  return {
    id,
    t_ct: now.toISOString(),
    seat: to[1],
    from: fromSeat,
    to: to[1],
    type: 'packet',
    kind: kind[1],
    repo,
    number,
    sha: head,
    title: `handoff ${kind[1]}`,
    url: `https://github.com/${repo}/pull/${number}`,
    reason: `handoff ${kind[1]}`,
  };
}

const NOTE_DROP = /[^A-Za-z0-9 ._:@#+/?'",;!()-]/g;

export function promptNote(text) {
  const flat = String(text || '')
    .replace(NOTE_DROP, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
    .trim();
  return flat;
}

const OWNER_KEYS = ['prompt', 'userPrompt', 'user_prompt', 'userMessage', 'message'];

export function ownerLine(event) {
  if (!event || typeof event !== 'object') return '';
  for (const key of OWNER_KEYS) {
    if (typeof event[key] === 'string' && event[key].trim()) return event[key];
  }
  return '';
}

export function hookText(event) {
  if (!event || typeof event !== 'object') return '';
  const bits = [];
  for (const key of ['prompt', 'userPrompt', 'message']) {
    if (typeof event[key] === 'string') bits.push(event[key]);
  }
  const input = event.toolInput;
  if (input && typeof input === 'object' && typeof input.command === 'string') bits.push(input.command);
  const out = event.toolOutput ?? event.toolResult ?? event.result ?? event.output;
  if (typeof out === 'string') bits.push(out);
  return bits.join('\n').slice(0, 8000);
}

function blankState() {
  return { liveUntil: 0, live: false, turn: '', tags: {} };
}

function statePath(root) {
  return path.join(root, '.xray', 'state', 'bifrost-send.json');
}

function loadState(root) {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath(root), 'utf8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return blankState();
    return {
      liveUntil: Number(raw.liveUntil) || 0,
      live: raw.live === true,
      turn: raw.turn === 'start' ? 'start' : '',
      tags: raw.tags && typeof raw.tags === 'object' && !Array.isArray(raw.tags) ? raw.tags : {},
    };
  } catch {
    return blankState();
  }
}

function saveState(root, state) {
  const file = statePath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file);
}

function suitHome(env, home) {
  if (typeof home === 'string' && home.trim()) return home.trim();
  if (typeof env.HOME === 'string' && env.HOME.trim()) return env.HOME.trim();
  return os.homedir();
}

function soleSeat(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return '';
  }
  const seats = names
    .filter((name) => name.endsWith('.key'))
    .map((name) => name.slice(0, -4))
    .filter((seat) => SEAT.test(seat));
  return seats.length === 1 ? seats[0] : '';
}

function configOf(env, home) {
  const origin = boardOrigin(env.LIVE_URL) || boardOrigin(SUIT_BOARD);
  const keys = (typeof env.SEAT_KEYS_DIR === 'string' && env.SEAT_KEYS_DIR.trim())
    || path.join(suitHome(env, home), '.burst', 'seat-keys');
  let seat = typeof env.XRAY_SEAT === 'string' ? env.XRAY_SEAT.trim() : '';
  if (!SEAT.test(seat)) seat = soleSeat(keys);
  if (!origin || !SEAT.test(seat) || !keys) return null;
  return { origin, seat, keys };
}

export function suitConfig(env = {}, home) {
  return configOf(env, home);
}

function readKey(dir, seat) {
  const root = path.resolve(dir);
  const file = path.resolve(root, `${seat}.key`);
  if (path.dirname(file) !== root) return '';
  try {
    const text = fs.readFileSync(file, 'utf8').trim();
    if (!text || text.length > 4096 || /[\r\n]/.test(text)) return '';
    return text;
  } catch {
    return '';
  }
}

function activityLine(action, tag, now) {
  const t_ct = ctStamp(now);
  if (!t_ct) return null;
  const body = { t_ct, kind: 'turn', action };
  if (tag) body.tag = tag;
  return body;
}

function promptLine(seat, note, now) {
  const t_ct = ctStamp(now);
  if (!t_ct || !SEAT.test(seat) || !note) return null;
  return { t_ct, seat, kind: 'prompt', action: 'sent', from: 'owner', to: seat, note };
}

async function boardLive(origin, fetchImpl, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/healthz`, { method: 'GET', signal: ac.signal });
    if (!res || res.status !== 200) return false;
    const body = await res.json();
    return !!(body && body.ok === true && body.board === 'live');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, key, body, fetchImpl, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    return !!(res && (res.status === 200 || res.status === 202));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyBifrost(opts = {}) {
  const env = opts.env || {};
  const root = opts.root || process.cwd();
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const now = opts.now instanceof Date ? opts.now : new Date();
  const sent = [];
  const cfg = configOf(env, opts.home);
  if (!cfg) return { sent, reason: 'off' };
  const key = readKey(cfg.keys, cfg.seat);
  if (!key) return { sent, reason: 'off' };
  const state = loadState(root);
  const nowMs = now.getTime();
  let live = state.liveUntil > nowMs && state.live === true;
  if (!(state.liveUntil > nowMs)) {
    live = await boardLive(cfg.origin, fetchImpl, opts.timeoutMs || 1500);
    state.live = live;
    state.liveUntil = nowMs + 30000;
    try { saveState(root, state); } catch { /* the check still stands */ }
  }
  if (!live) return { sent, reason: 'quiet' };

  const posts = [];
  if (opts.phase === 'start' && state.turn !== 'start') {
    const line = activityLine('start', '', now);
    if (line) posts.push({ path: '/activity', body: line, mark: 'turn' });
  } else if (opts.phase === 'end' && state.turn === 'start') {
    const line = activityLine('end', '', now);
    if (line) posts.push({ path: '/activity', body: line, mark: 'end' });
  } else if (opts.phase === 'prompt' || opts.phase === 'work') {
    if (opts.phase === 'prompt') {
      const note = promptNote(opts.text);
      const mark = note ? `prompt:${note}` : '';
      if (note && !(state.tags[mark] > nowMs)) {
        const line = promptLine(cfg.seat, note, now);
        if (line) posts.push({ path: '/activity', body: line, mark, ttl: 60 * 1000 });
      }
    }
    const refs = refsFromText(opts.text);
    for (const ref of [...refs.issues, ...refs.prs]) {
      if (state.tags[ref.tag] > nowMs) continue;
      const line = activityLine('start', ref.tag, now);
      if (line) posts.push({ path: '/activity', body: line, mark: ref.tag });
    }
    const packet = handoffFromText(opts.text, cfg.seat, now);
    if (packet && !(state.tags[packet.id] > nowMs)) {
      posts.push({ path: '/inbox', body: { lines: [packet] }, mark: packet.id });
    }
  }

  for (const post of posts) {
    const ok = await postJson(`${cfg.origin}${post.path}`, key, post.body, fetchImpl, opts.timeoutMs || 2000);
    if (!ok) continue;
    if (post.path === '/inbox') sent.push('packet');
    else if (post.body.kind === 'prompt') sent.push('prompt');
    else if (post.body.tag) sent.push(post.body.tag);
    else sent.push(post.body.action);
    if (post.mark === 'turn') state.turn = 'start';
    else if (post.mark === 'end') state.turn = '';
    else state.tags[post.mark] = nowMs + (post.ttl || 60 * 60 * 1000);
  }
  try { saveState(root, state); } catch { /* the post already landed */ }
  return { sent, reason: 'live' };
}
