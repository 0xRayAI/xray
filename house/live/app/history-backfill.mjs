// One-shot rebuild of card history that the 24h display drop never archived.
// Dry-run is the default. --write appends through the archive, which refuses an id it already has.
import fs from 'node:fs';
import path from 'node:path';
import { appendArchive, initArchive, recordId } from './archive.mjs';

const PARKED = /\b(parked|blocked|waiting|icebox)\b/i;
const BC_ID = /\b(bc-[a-z0-9]+(?:-[a-z0-9]+)*)\b/gi;

export function chooseRepos({ repos, collectorRepos, orgRepos } = {}) {
  const src = (repos && repos.length) ? repos : (collectorRepos && collectorRepos.length) ? collectorRepos : (orgRepos || []);
  const out = [];
  for (const raw of src) {
    const name = String(raw || '').trim();
    if (!/^[^/\s]+\/[^/\s]+$/.test(name) || out.includes(name)) continue;
    out.push(name);
  }
  return out;
}

export function parseGhPages(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  try {
    const one = JSON.parse(trimmed);
    return Array.isArray(one) ? one : [one];
  } catch { /* one JSON value per page */ }
  const out = [];
  let depth = 0;
  let start = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{' || ch === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        const chunk = JSON.parse(trimmed.slice(start, i + 1));
        if (Array.isArray(chunk)) out.push(...chunk);
        else out.push(chunk);
      }
    }
  }
  return out;
}

export function linkedAgents(...texts) {
  const out = [];
  for (const text of texts) {
    for (const match of String(text || '').matchAll(BC_ID)) {
      const id = match[1].toLowerCase();
      if (!out.includes(id)) out.push(id);
    }
  }
  return out.slice(0, 8);
}

export function loadSeats(file) {
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return new Map(); }
  const map = new Map();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return map;
  for (const [login, seat] of Object.entries(raw)) {
    if (typeof seat === 'string' && seat) map.set(login.toLowerCase(), seat);
  }
  return map;
}

export function seatOf(login, seats) {
  if (!login || !seats) return '';
  return seats.get(String(login).toLowerCase()) || '';
}

function labelsOf(item) {
  const raw = Array.isArray(item && item.labels) ? item.labels : [];
  const names = [];
  for (const label of raw) {
    const name = typeof label === 'string' ? label : (label && label.name);
    if (typeof name === 'string' && name && !names.includes(name)) names.push(name);
  }
  return names.slice(0, 8);
}

function parkedLabels(labels) {
  return labels.some(name => PARKED.test(name));
}

export function itemFromIssue(repo, issue) {
  if (!issue || typeof issue !== 'object' || issue.pull_request || !Number.isInteger(issue.number)) return null;
  return normalizeItem(repo, issue, 'issue');
}

export function itemFromPull(repo, pull) {
  if (!pull || typeof pull !== 'object' || !Number.isInteger(pull.number)) return null;
  const item = normalizeItem(repo, pull, 'pr');
  const mergedBy = pull.merged_by && typeof pull.merged_by === 'object' ? pull.merged_by.login : '';
  item.merged_at = typeof pull.merged_at === 'string' ? pull.merged_at : '';
  item.merged_by = typeof mergedBy === 'string' ? mergedBy : '';
  item.head_ref = pull.head && typeof pull.head.ref === 'string' ? pull.head.ref : '';
  item.draft = pull.draft === true;
  item.agents = linkedAgents(item.title, item.head_ref, pull.body);
  return item;
}

function normalizeItem(repo, row, kind) {
  const user = row.user && typeof row.user === 'object' ? row.user.login : '';
  return {
    repo, number: row.number, kind,
    title: typeof row.title === 'string' ? row.title : '',
    url: typeof row.html_url === 'string' ? row.html_url : '',
    user: typeof user === 'string' ? user : '',
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    closed_at: typeof row.closed_at === 'string' ? row.closed_at : '',
    merged_at: '', merged_by: '', head_ref: '', draft: false,
    labels: labelsOf(row),
    agents: linkedAgents(row.title, row.body),
    state: typeof row.state === 'string' ? row.state : '',
  };
}

function itemKey(repo, number) {
  return `${String(repo || '').toLowerCase()}#${Number(number)}`;
}

function kindKey(repo, number, kind) {
  return `${itemKey(repo, number)}:${kind}`;
}

export function readArchiveIndex(dataDir) {
  const index = { eventIds: new Set(), eventKinds: new Set(), cardIds: new Set(), cardsByKey: new Map() };
  const root = path.join(dataDir || '', 'archive');
  let days = [];
  try { days = fs.readdirSync(root); } catch { return index; }
  for (const day of days) {
    for (const kind of ['events', 'cards']) {
      const file = path.join(root, day, kind + '.jsonl');
      let text = '';
      try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      for (const line of text.split('\n')) {
        if (!line) continue;
        let row;
        try { row = JSON.parse(line); } catch { continue; }
        if (!row || typeof row !== 'object') continue;
        if (kind === 'events') {
          if (row.id) index.eventIds.add(String(row.id));
          if (row.repo && row.number != null && row.kind) index.eventKinds.add(kindKey(row.repo, row.number, row.kind));
          continue;
        }
        if (!row.key) continue;
        if (row.id) index.cardIds.add(String(row.id));
        const key = String(row.key).toLowerCase();
        const arr = index.cardsByKey.get(key) || [];
        arr.push(row);
        index.cardsByKey.set(key, arr);
      }
    }
  }
  return index;
}

function eventRow(id, item, kind, when, login, label) {
  return {
    id, t_ct: when, from: 'GitHub', to: 'GitHub', kind, direction: 'internal',
    label: label.slice(0, 54), source: item.url, src_file: 'github-api',
    repo: item.repo, number: item.number, actor: login || '', author: item.user || '',
    credit: 'github',
  };
}

function withSeat(row, login, seats) {
  const seat = seatOf(login, seats);
  if (!seat) return row;
  return { ...row, from: seat, credit: seat.toLowerCase() };
}

function cardBase(item, seats) {
  const key = itemKey(item.repo, item.number);
  return {
    key, repo: item.repo, number: item.number, title: item.title.slice(0, 120), url: item.url,
    owner: seatOf(item.user, seats), kind: item.kind, labels: item.labels, agents: item.agents,
    packet_ok: true,
  };
}

function openCard(item, seats) {
  const parked = !item.closed_at && !item.merged_at && (item.draft || parkedLabels(item.labels));
  return {
    ...cardBase(item, seats),
    stage: item.kind === 'pr' ? 'review' : 'open',
    state: parked ? 'parked' : 'live',
    t_ct: item.created_at, updated_ct: item.created_at,
  };
}

function finalStamp(when, rows) {
  const close = Date.parse(when) || 0;
  let latest = 0;
  for (const row of rows || []) {
    const stamp = Date.parse(row.updated_ct || row.t_ct || '') || 0;
    if (stamp > latest) latest = stamp;
  }
  if (!latest || close > latest) return when;
  return new Date(latest + 1000).toISOString();
}

function finalCard(item, seats, prior) {
  const merged = !!item.merged_at;
  const when = merged ? item.merged_at : item.closed_at;
  const stamp = finalStamp(when, prior);
  return {
    ...cardBase(item, seats),
    stage: 'done', state: 'closed', verb: merged ? 'merged' : 'closed',
    merged_by: merged ? (item.merged_by || item.user || '') : '',
    t_ct: when, updated_ct: stamp,
  };
}

function hasClosed(rows) {
  return (rows || []).some(row => row && (row.state === 'closed' || row.verb === 'merged' || row.verb === 'closed'));
}

function rememberEvent(index, row) {
  index.eventIds.add(row.id);
  index.eventKinds.add(kindKey(row.repo, row.number, row.kind));
}

export function planBackfill(items, index, seats) {
  const events = [];
  const cards = [];
  let skippedEvents = 0;
  let skippedCards = 0;
  const byRepo = {};
  const seen = index || { eventIds: new Set(), eventKinds: new Set(), cardIds: new Set(), cardsByKey: new Map() };
  for (const item of items || []) {
    if (!item || !item.repo || !Number.isInteger(item.number) || !item.created_at) continue;
    const bucket = byRepo[item.repo] || (byRepo[item.repo] = { cards: 0, events: 0 });
    const short = item.repo.split('/')[1] || item.repo;
    const mark = item.kind === 'pr' ? '#' : ' issue #';
    const candidates = [];
    candidates.push(withSeat(eventRow(
      item.kind === 'pr' ? `${item.repo}#${item.number}:open` : `${item.repo}!${item.number}:open`,
      item, item.kind === 'pr' ? 'pr_open' : 'issue_open', item.created_at, item.user,
      `${short}${mark}${item.number} opened`,
    ), item.user, seats));
    if (item.kind === 'pr' && item.merged_at) {
      const merged = withSeat(eventRow(
        `${item.repo}#${item.number}:merged`, item, 'merged', item.merged_at, item.merged_by || item.user,
        `merged ${short} #${item.number}`,
      ), item.merged_by || item.user, seats);
      merged.merged_by = item.merged_by || '';
      candidates.push(merged);
    } else if (item.closed_at) {
      candidates.push(withSeat(eventRow(
        item.kind === 'pr' ? `${item.repo}#${item.number}:close` : `${item.repo}!${item.number}:close`,
        item, item.kind === 'pr' ? 'pr_close' : 'issue_close', item.closed_at, item.user,
        `closed ${short}${mark}${item.number}`,
      ), item.user, seats));
    }
    for (const row of candidates) {
      if (seen.eventIds.has(row.id) || seen.eventKinds.has(kindKey(row.repo, row.number, row.kind))) {
        skippedEvents++;
        continue;
      }
      events.push(row);
      rememberEvent(seen, row);
      bucket.events++;
    }
    const key = itemKey(item.repo, item.number);
    const prior = seen.cardsByKey.get(key) || [];
    const want = [];
    if (!prior.length) want.push(openCard(item, seats));
    else skippedCards++;
    if ((item.merged_at || item.closed_at) && !hasClosed(prior)) want.push(finalCard(item, seats, prior));
    else if (item.merged_at || item.closed_at) skippedCards++;
    for (const card of want) {
      const id = recordId('cards', card);
      if (!id || seen.cardIds.has(id)) { skippedCards++; continue; }
      cards.push(card);
      seen.cardIds.add(id);
      const arr = seen.cardsByKey.get(key) || [];
      arr.push({ ...card, id });
      seen.cardsByKey.set(key, arr);
      bucket.cards++;
    }
  }
  return { events, cards, skippedEvents, skippedCards, byRepo, closedCards: cards.filter(card => card.state === 'closed').length };
}

export function applyPlan(dataDir, plan, opts = {}) {
  const cards = plan && Array.isArray(plan.cards) ? plan.cards : [];
  const events = plan && Array.isArray(plan.events) ? plan.events : [];
  if (!opts.write) return { wrote: false, cards: 0, events: 0 };
  initArchive(dataDir);
  let wroteCards = 0;
  let wroteEvents = 0;
  for (const row of events) if (appendArchive('events', row)) wroteEvents++;
  for (const row of cards) if (appendArchive('cards', row)) wroteCards++;
  return { wrote: true, cards: wroteCards, events: wroteEvents };
}

export async function runBackfill(opts = {}) {
  const repos = chooseRepos(opts);
  const index = readArchiveIndex(opts.dataDir);
  const items = [];
  const errors = [];
  for (const repo of repos) {
    try {
      const page = await opts.fetchItems(repo);
      for (const item of page || []) if (item) items.push(item);
    } catch (err) {
      errors.push({ repo, error: String(err && err.message || err).slice(0, 200) });
    }
  }
  const plan = planBackfill(items, index, opts.seats);
  for (const repo of repos) if (!plan.byRepo[repo]) plan.byRepo[repo] = { cards: 0, events: 0 };
  const applied = applyPlan(opts.dataDir, plan, { write: opts.write === true });
  return {
    dry_run: opts.write !== true,
    repos, errors,
    cards: plan.cards.length,
    closed_cards: plan.closedCards,
    events: plan.events.length,
    skipped_cards: plan.skippedCards,
    skipped_events: plan.skippedEvents,
    wrote_cards: applied.cards,
    wrote_events: applied.events,
    by_repo: plan.byRepo,
  };
}

export function tally(report) {
  return { cards: report.cards, events: report.events, skipped_cards: report.skipped_cards, skipped_events: report.skipped_events };
}
