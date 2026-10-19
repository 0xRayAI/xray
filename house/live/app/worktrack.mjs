// Work the server already heard about: Cursor agent webhooks, inbox packets, wakes, blockers.
// Live state is rebuilt from append-only files on the volume. Nothing here is deleted.
import fs from 'node:fs';
import path from 'node:path';
import { clockStamp } from './chicago-stamp.mjs';

// Seats, display names, aliases and the human lane come from the server's config (configureWorkTrack); nothing here
// names a seat. HUMAN_TO is the `to` value that parks a packet with a person; HUMAN_LANE is that lane's label.
export const SEAT_IDS = [];
export const UNASSIGNED = 'unassigned';
let DISPLAY = {};
let ALIAS = {};
let MIRROR = {};   // seat <-> its mirror seat (an inbox line copied to both counts once; an ack on either counts)
let MIRROR_COPY = new Set();   // the copy side of each pair (kept when both sides hold a line)
let HUMAN_TO = 'human';
let LAUNCH_SEAT = '';
export let HUMAN_LANE = 'Waiting on a human';

export function configureWorkTrack({ seatIds = [], display = {}, alias = {}, mirror = {}, humanTo, humanLane, launchSeat } = {}) {
  SEAT_IDS.length = 0;
  for (const id of seatIds) { const k = String(id || '').toLowerCase(); if (k && !SEAT_IDS.includes(k)) SEAT_IDS.push(k); }
  DISPLAY = {}; ALIAS = {}; MIRROR = {}; MIRROR_COPY = new Set();
  for (const id of SEAT_IDS) DISPLAY[id] = typeof display[id] === 'string' && display[id] ? display[id] : id;
  for (const [k, v] of Object.entries(alias || {})) { const id = String(v || '').toLowerCase(); if (SEAT_IDS.includes(id)) ALIAS[String(k).toLowerCase()] = id; }
  for (const [id, name] of Object.entries(DISPLAY)) { ALIAS[id] = id; ALIAS[name.toLowerCase()] = id; }
  for (const [a, b] of Object.entries(mirror || {})) { const x = String(a).toLowerCase(), y = String(b).toLowerCase(); if (SEAT_IDS.includes(x) && SEAT_IDS.includes(y)) { MIRROR[x] = y; MIRROR[y] = x; MIRROR_COPY.add(y); } }
  if (typeof humanTo === 'string' && /^[a-z0-9_-]{1,40}$/i.test(humanTo)) HUMAN_TO = humanTo.toLowerCase();
  if (typeof humanLane === 'string' && humanLane.trim()) HUMAN_LANE = humanLane.trim().slice(0, 60);
  LAUNCH_SEAT = SEAT_IDS.includes(String(launchSeat || '').toLowerCase()) ? String(launchSeat).toLowerCase() : '';
}

const PACKET_TYPES = new Set(['dispatch', 'ready', 'packet', 'critic_fail', 'needs_human']);

export function displaySeat(id) {
  const key = String(id || '').toLowerCase();
  return DISPLAY[key] || '';
}

export function canonSeatToken(value) {
  const key = String(value || '').trim().toLowerCase();
  if (!key || key.length > 40) return '';
  const id = ALIAS[key] || (SEAT_IDS.includes(key) ? key : '');
  return SEAT_IDS.includes(id) ? id : '';
}

export function toToken(value) {
  const key = String(value || '').trim().toLowerCase();
  if (key === HUMAN_TO) return HUMAN_TO;
  return canonSeatToken(key);
}

function textOf(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (/ghs_|github_pat_|BEGIN |api[_-]?key|bearer |\bsecret\b|cursor[-_]?key/i.test(text)) return '';
  return text.slice(0, max);
}

function httpsUrl(value) {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url.startsWith('https://') || /[\s]/.test(url) || url.includes('@')) return '';
  return url.slice(0, 300);
}

function prOf(parsed) {
  const target = parsed && parsed.target && typeof parsed.target === 'object' ? parsed.target : {};
  const pull = parsed && (parsed.pull_request || parsed.pullRequest);
  const pr = pull && typeof pull === 'object' ? pull : {};
  return httpsUrl(target.prUrl) || httpsUrl(target.pr_url) || httpsUrl(parsed && parsed.prUrl) || httpsUrl(parsed && parsed.pr_url)
    || httpsUrl(pr.html_url) || httpsUrl(pr.url)
    || (typeof target.url === 'string' && target.url.includes('/pull/') ? httpsUrl(target.url) : '');
}

function statusOf(raw) {
  switch (raw) {
    case 'CREATED':
    case 'CREATING':
    case 'CREATE':
    case 'AGENT_CREATED':
      return 'created';
    case 'RUNNING':
    case 'IN_PROGRESS':
    case 'WORKING':
    case 'ACTIVE':
      return 'running';
    case 'PR_OPENED':
    case 'PR_OPEN':
    case 'PULL_REQUEST_OPENED':
    case 'PULL_REQUEST':
      return 'pr_opened';
    case 'FINISHED':
    case 'FINISH':
    case 'COMPLETE':
    case 'COMPLETED':
    case 'DONE':
      return 'finished';
    case 'ERROR':
    case 'TIMED_OUT':
    case 'TIMEOUT':
    case 'EXPIRED':
    case 'CANCELLED':
    case 'CANCELED':
    case 'FAILED':
      return 'failed';
    case '':
      return '';
    default:
      return raw.includes('PR_OPEN') ? 'pr_opened' : '';
  }
}

export function rankOf(status) {
  switch (status) {
    case 'created': return 1;
    case 'running': return 2;
    case 'pr_opened': return 3;
    case 'finished':
    case 'failed': return 4;
    default: {
      /** @type {never} */
      const unexpected = status;
      throw new Error('unknown agent status ' + String(unexpected));
    }
  }
}

export function classifyCursor(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const raw = String(parsed.status || parsed.event || parsed.type || '').toUpperCase().replace(/[\s.-]+/g, '_');
  const pr = prOf(parsed);
  let status = statusOf(raw);
  if (!status && pr) status = 'pr_opened';
  if (!status) return null;
  return { status, rank: rankOf(status), pr, closed: status === 'finished' || status === 'failed' };
}

function agentOf(parsed) {
  const id = typeof parsed.id === 'string' ? parsed.id
    : parsed.agent && typeof parsed.agent === 'object' && typeof parsed.agent.id === 'string' ? parsed.agent.id
    : typeof parsed.agentId === 'string' ? parsed.agentId : '';
  const clean = id.trim();
  return /^[A-Za-z0-9._:-]{4,80}$/.test(clean) ? clean : '';
}

function payloadSeat(parsed) {
  const meta = parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {};
  const source = parsed.source && typeof parsed.source === 'object' ? parsed.source : {};
  const agent = parsed.agent && typeof parsed.agent === 'object' ? parsed.agent : {};
  const agentMeta = agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {};
  const spots = [parsed.seat, parsed.launching_seat, meta.seat, meta.launching_seat, source.seat, agent.seat, agentMeta.seat, agentMeta.launching_seat];
  for (const spot of spots) {
    const id = canonSeatToken(spot);
    if (id) return id;
  }
  return '';
}

function mapSeat(agent, map) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return '';
  if (Object.prototype.hasOwnProperty.call(map, agent)) {
    const id = canonSeatToken(map[agent]);
    if (id) return id;
  }
  for (const [key, value] of Object.entries(map)) {
    if (!key.endsWith('*')) continue;
    const prefix = key.slice(0, -1);
    if (prefix && agent.startsWith(prefix)) {
      const id = canonSeatToken(value);
      if (id) return id;
    }
  }
  return '';
}

function launchSeat(dir, agent) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'arch1-launch.json'), 'utf8'));
    const cards = parsed && parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {};
    for (const row of Object.values(cards)) {
      if (LAUNCH_SEAT && row && row.agentId === agent) return LAUNCH_SEAT;
    }
  } catch { /* no launch file */ }
  return '';
}

export function resolveAgentSeat(parsed, agent, dir, map) {
  return payloadSeat(parsed) || launchSeat(dir, agent) || mapSeat(agent, map) || '';
}

export function seatForAgentId(agent, map) {
  return mapSeat(String(agent || ''), map);
}

export function readJsonl(file) {
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const rows = [];
  for (const raw of text.split('\n')) {
    if (!raw) continue;
    try {
      const row = JSON.parse(raw);
      if (row && typeof row === 'object') rows.push(row);
    } catch { /* keep the rest of the log */ }
  }
  return rows;
}

function appendJsonl(file, rec) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(rec) + '\n');
}

export function decideAgent(existing, next) {
  if (!next || typeof next.agent !== 'string' || !next.agent || typeof next.status !== 'string') return 'ignore';
  const rows = existing.filter(row => row && row.agent === next.agent);
  if (next.event_id && existing.some(row => row && row.event_id === next.event_id)) return 'duplicate';
  const rank = rows.reduce((max, row) => Math.max(max, Number(row.rank) || 0), 0);
  if (Number(next.rank) < rank) return 'stale';
  const same = rows.some(row => row.status === next.status && Number(row.rank) === Number(next.rank));
  if (same) {
    const hadPr = rows.some(row => row.pr);
    if (next.pr && !hadPr) return 'append';
    return 'duplicate';
  }
  return 'append';
}

export function acceptCursorWebhook({ dir, raw, headers, map, now = Date.now() }) {
  let parsed;
  try { parsed = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)); }
  catch { return { appended: false, action: 'ignore' }; }
  const classified = classifyCursor(parsed);
  const agent = parsed && typeof parsed === 'object' ? agentOf(parsed) : '';
  if (!classified || !agent) return { appended: false, action: 'ignore' };
  const headerId = headers && (headers['x-webhook-id'] || headers['X-Webhook-ID']) || '';
  const bodyId = typeof parsed.event_id === 'string' ? parsed.event_id : typeof parsed.eventId === 'string' ? parsed.eventId : '';
  const eventId = String(headerId || bodyId || (agent + ':' + classified.status)).slice(0, 200);
  const file = path.join(dir, 'agents.jsonl');
  const existing = readJsonl(file);
  const priorSeat = existing.reduce((seat, row) => (row && row.agent === agent && row.seat && row.seat !== UNASSIGNED ? row.seat : seat), '');
  const seat = resolveAgentSeat(parsed, agent, dir, map) || priorSeat || UNASSIGNED;
  const rec = {
    event_id: eventId,
    agent,
    status: classified.status,
    rank: classified.rank,
    seat,
    t_ct: clockStamp(now),
    title: textOf(parsed.summary || parsed.name || agent, 120) || agent,
    pr: classified.pr || '',
  };
  const action = decideAgent(existing, rec);
  if (action !== 'append') return { appended: false, action };
  appendJsonl(file, rec);
  return { appended: true, action, record: rec };
}

export function appendWake(dir, rec) {
  appendJsonl(path.join(dir, 'wakes.jsonl'), rec);
}

export function readWakeRows(dir) {
  return readJsonl(path.join(dir, 'wakes.jsonl'));
}

function readInboxLines(dir) {
  const inbox = path.join(dir, 'inbox');
  let names = [];
  try { names = fs.readdirSync(inbox); } catch { return []; }
  const byId = new Map();
  for (const name of names) {
    if (!name.endsWith('.jsonl')) continue;
    for (const line of readJsonl(path.join(inbox, name))) {
      if (!line || typeof line.id !== 'string' || !line.id) continue;
      const prev = byId.get(line.id);
      if (!prev || (MIRROR[prev.seat] === line.seat && MIRROR_COPY.has(line.seat))) byId.set(line.id, line);
    }
  }
  return [...byId.values()];
}

function readAcks(dir) {
  const out = {};
  let parsed = {};
  try { parsed = JSON.parse(fs.readFileSync(path.join(dir, 'acks.json'), 'utf8')); } catch { return out; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
  for (const [seat, ids] of Object.entries(parsed)) {
    out[String(seat).toLowerCase()] = new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
  }
  return out;
}

function lineAcked(acks, seat, id) {
  if (acks[seat] && acks[seat].has(id)) return true;
  const twin = MIRROR[seat];
  if (twin && acks[twin] && acks[twin].has(id)) return true;
  return false;
}

export function isBlocker(line) {
  if (!line || typeof line !== 'object') return false;
  const type = String(line.type || '').toLowerCase();
  const kind = String(line.kind || '').toLowerCase();
  const flag = String(line.flag || '').toLowerCase();
  const to = String(line.to || '').toLowerCase();
  return type === 'needs_human' || kind === 'needs_human' || flag === 'needs_human' || to === HUMAN_TO;
}

export function isPacket(line) {
  if (!line || typeof line !== 'object') return false;
  const type = String(line.type || '').toLowerCase();
  const kind = String(line.kind || '').toLowerCase();
  if (PACKET_TYPES.has(type) || PACKET_TYPES.has(kind)) return true;
  if (isBlocker(line)) return true;
  return false;
}

function wokenIds(wakes) {
  const ids = new Set();
  for (const row of wakes || []) {
    if (!row || row.ok !== true) continue;
    if (typeof row.id === 'string' && row.id) ids.add(row.id);
    if (Array.isArray(row.ids)) for (const id of row.ids) if (typeof id === 'string' && id) ids.add(id);
  }
  return ids;
}

function packetItem(line, { acked, woken, closed, now, windowMs }) {
  const seat = String(line.seat || '').toLowerCase();
  const from = canonSeatToken(line.from);
  const title = textOf(line.title, 120) || String(line.id);
  const steps = ['sent', 'delivered'];
  let phase = 'delivered';
  if (woken) { steps.push('woken'); phase = 'woken'; }
  if (acked) { steps.push('acked'); phase = 'acked'; }
  const age = now - Date.parse(line.t_ct || '');
  const overdue = !acked && !closed && Number.isFinite(age) && age > windowMs;
  const working = woken && !acked && !closed;
  const labels = [phase];
  if (working) labels.push('working on ' + title);
  if (overdue) labels.push('overdue');
  const seats = [];
  if (from && !seats.includes(from)) seats.push(from);
  if (seat && SEAT_IDS.includes(seat) && !seats.includes(seat)) seats.push(seat);
  const blocked = isBlocker(line) && !acked && !closed;
  const lanes = blocked ? [HUMAN_LANE] : seats.map(id => displaySeat(id)).filter(Boolean);
  return {
    id: String(line.id),
    kind: 'packet',
    phase,
    steps,
    label: labels.join(' · '),
    labels,
    title,
    url: typeof line.url === 'string' ? line.url.slice(0, 300) : '',
    pr: '',
    seats,
    lane: lanes[0] || displaySeat(seat) || seat,
    lanes,
    overdue,
    flagged: overdue,
    working,
    closed: !!closed,
    seat_name: working ? displaySeat(seat) : '',
    t_ct: typeof line.t_ct === 'string' ? line.t_ct : '',
    agent: '',
    status: phase,
  };
}

const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/;
const CARD_REF = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#\d{1,8}$/;
const PR_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d{1,8})(?:\/|\?|#|$)/;

export function cardRefOf(value) {
  const raw = String(value || '').trim();
  if (CARD_REF.test(raw)) return raw;
  const match = PR_URL.exec(raw);
  return match ? `${match[1]}/${match[2]}#${Number(match[3])}` : '';
}

function boardStateOfStatus(status) {
  if (status === 'failed') return 'failed';
  if (status === 'finished') return 'finished';
  if (status === 'running' || status === 'created' || status === 'pr_opened') return 'running';
  return '';
}

function boardStateOfAction(action) {
  switch (String(action || '').toLowerCase()) {
    case 'cancel': return 'failed';
    case 'finished':
    case 'finish': return 'finished';
    case 'launch':
    case 'reply': return 'running';
    default: return '';
  }
}

function safePr(value) {
  const raw = String(value || '').trim();
  if (CARD_REF.test(raw)) return raw;
  if (PR_URL.test(raw)) return raw.slice(0, 300);
  return '';
}

/** The critic cloud id for one PR. A running agent wins, then the newest. A failed id is used only when it is the only one. */
export function criticCloudId(cardKey, agents) {
  const key = String(cardKey || '').trim().toLowerCase();
  if (!key) return '';
  const rows = (Array.isArray(agents) ? agents : []).filter((row) => {
    if (!row || String(row.seat || '').toLowerCase() !== 'critic') return false;
    return String(row.card || '').trim().toLowerCase() === key && typeof row.bcId === 'string' && row.bcId;
  });
  if (!rows.length) return '';
  const usable = rows.filter((row) => row.state !== 'failed');
  const pool = usable.length ? usable : rows;
  pool.sort((a, b) => {
    const run = (b.state === 'running' ? 1 : 0) - (a.state === 'running' ? 1 : 0);
    if (run) return run;
    return (Date.parse(b.updated_ct) || 0) - (Date.parse(a.updated_ct) || 0) || String(b.bcId).localeCompare(String(a.bcId));
  });
  return pool[0].bcId;
}

/** Copy critic_bc onto each card from the critic cloud row for that PR. A card with no critic row keeps a stored id. */
export function stampCriticCloud(cards, agents) {
  return (Array.isArray(cards) ? cards : []).map((card) => {
    if (!card || typeof card !== 'object') return card;
    const id = criticCloudId(card.key, agents);
    if (!id || card.critic_bc === id) return card;
    return { ...card, critic_bc: id };
  });
}

/** One board row per cloud agent. Latest line wins the state; an earlier seat, card, or PR stays. */
export function boardCloudAgents({ agents = [], activity = [], links = [] } = {}) {
  const events = [];
  for (const row of agents || []) {
    if (!row || typeof row !== 'object') continue;
    const state = boardStateOfStatus(row.status);
    if (!state) continue;
    events.push({
      bcId: row.agent,
      seat: row.seat && row.seat !== UNASSIGNED ? row.seat : '',
      pr: typeof row.pr === 'string' ? row.pr : '',
      card: '',
      state,
      updated_ct: typeof row.t_ct === 'string' ? row.t_ct : '',
    });
  }
  for (const row of activity || []) {
    if (!row || typeof row !== 'object') continue;
    if (row.kind !== 'cloud_agent' && row.kind !== 'agent') continue;
    const state = boardStateOfAction(row.action);
    if (!state) continue;
    const tag = typeof row.tag === 'string' ? row.tag : '';
    events.push({
      bcId: row.agent,
      seat: row.seat || row.by || '',
      pr: '',
      card: CARD_REF.test(tag) ? tag : '',
      state,
      updated_ct: typeof row.t_ct === 'string' ? row.t_ct : '',
    });
  }
  events.sort((a, b) => (Date.parse(a.updated_ct) || 0) - (Date.parse(b.updated_ct) || 0));
  const by = new Map();
  for (const ev of events) {
    const id = String(ev.bcId || '').trim();
    if (!AGENT_ID.test(id)) continue;
    const prev = by.get(id);
    const pr = safePr(ev.pr) || (prev && prev.pr) || '';
    const card = (CARD_REF.test(ev.card) ? ev.card : '') || cardRefOf(pr) || (prev && prev.card) || '';
    const seat = canonSeatToken(ev.seat) || (prev && prev.seat) || '';
    by.set(id, { bcId: id, seat, card, pr, state: ev.state, updated_ct: ev.updated_ct || (prev && prev.updated_ct) || '' });
  }
  for (const link of links || []) {
    if (!link || typeof link !== 'object') continue;
    const id = String(link.bcId || link.agent || '').trim();
    if (!AGENT_ID.test(id)) continue;
    const seat = canonSeatToken(link.seat) || '';
    const card = CARD_REF.test(String(link.card || '')) ? String(link.card) : cardRefOf(link.card) || cardRefOf(link.pr);
    const pr = safePr(link.pr);
    const prev = by.get(id);
    if (!prev) {
      const state = link.state === 'failed' || link.state === 'finished' || link.state === 'running' ? link.state : 'running';
      by.set(id, { bcId: id, seat, card, pr, state, updated_ct: typeof link.updated_ct === 'string' ? link.updated_ct : '' });
      continue;
    }
    if (!prev.seat && seat) prev.seat = seat;
    if (!prev.card && card) prev.card = card;
    if (!prev.pr && pr) prev.pr = pr;
  }
  return [...by.values()].sort((a, b) => (Date.parse(b.updated_ct) || 0) - (Date.parse(a.updated_ct) || 0) || a.bcId.localeCompare(b.bcId));
}

function agentItems(agents) {
  const byAgent = new Map();
  for (const row of agents || []) {
    if (!row || typeof row.agent !== 'string' || !row.agent) continue;
    const cur = byAgent.get(row.agent);
    const rank = Number(row.rank) || 0;
    const at = String(row.t_ct || '');
    const named = row.seat && row.seat !== UNASSIGNED ? row.seat : '';
    if (!cur || rank > Number(cur.rank) || (rank === Number(cur.rank) && at >= String(cur.t_ct || ''))) {
      const keptSeat = named || (cur && cur.seat && cur.seat !== UNASSIGNED ? cur.seat : '') || UNASSIGNED;
      byAgent.set(row.agent, { ...row, pr: row.pr || (cur && cur.pr) || '', seat: keptSeat });
    } else if (cur) {
      if (!cur.pr && row.pr) cur.pr = row.pr;
      if ((!cur.seat || cur.seat === UNASSIGNED) && named) cur.seat = named;
    }
  }
  const items = [];
  for (const row of byAgent.values()) {
    const failed = row.status === 'failed';
    const closed = failed || Number(row.rank) >= 4 || row.status === 'finished';
    const seat = row.seat && row.seat !== UNASSIGNED ? canonSeatToken(row.seat) : '';
    const lane = seat ? displaySeat(seat) : UNASSIGNED;
    const title = textOf(row.title, 120) || row.agent;
    const pr = typeof row.pr === 'string' ? row.pr : '';
    const state = failed ? 'failed' : closed ? 'finished' : 'running';
    items.push({
      id: 'agent:' + row.agent,
      kind: 'agent',
      phase: failed ? 'failed' : closed ? 'closed' : row.status,
      steps: [state],
      label: failed ? 'failed' : closed ? 'closed' : 'working',
      labels: [failed ? 'failed' : closed ? 'closed' : 'working'],
      title,
      url: pr,
      pr,
      card: cardRefOf(pr),
      bcId: row.agent,
      state,
      seats: seat ? [seat] : [],
      lane,
      lanes: [lane],
      overdue: false,
      flagged: false,
      working: !closed,
      closed,
      seat_name: !closed && seat ? displaySeat(seat) : '',
      t_ct: typeof row.t_ct === 'string' ? row.t_ct : '',
      updated_ct: typeof row.t_ct === 'string' ? row.t_ct : '',
      agent: row.agent,
      status: state === 'running' ? row.status : state,
    });
  }
  return items;
}

export function deriveTrack({ lines, acks, wakes, agents, now, windowMs, closedKeys }) {
  const woken = wokenIds(wakes);
  const closed = closedKeys instanceof Set ? closedKeys : new Set(closedKeys || []);
  const items = [];
  for (const line of lines || []) {
    if (!isPacket(line)) continue;
    const seat = String(line.seat || '').toLowerCase();
    const key = String(line.repo || '').toLowerCase() + '#' + Number(line.number);
    items.push(packetItem(line, {
      acked: lineAcked(acks || {}, seat, line.id),
      woken: woken.has(line.id),
      closed: closed.has(key),
      now,
      windowMs,
    }));
  }
  items.push(...agentItems(agents));
  items.sort((a, b) => (Date.parse(b.t_ct) || 0) - (Date.parse(a.t_ct) || 0));
  const lanes = [];
  const byLane = new Map();
  for (const item of items) {
    for (const name of item.lanes.length ? item.lanes : [item.lane]) {
      if (!byLane.has(name)) { const bucket = []; byLane.set(name, bucket); lanes.push({ name, items: bucket }); }
      byLane.get(name).push({ id: item.id, label: item.label, title: item.title, url: item.url });
    }
  }
  return { items, overdue: items.filter(item => item.overdue).map(item => item.id), lanes };
}

export function deriveTrackFromDir(dir, now, windowMs, closedKeys) {
  return deriveTrack({
    lines: readInboxLines(dir),
    acks: readAcks(dir),
    wakes: readWakeRows(dir),
    agents: readJsonl(path.join(dir, 'agents.jsonl')),
    now,
    windowMs,
    closedKeys,
  });
}

export function loadSeatAgentMap(raw) {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
