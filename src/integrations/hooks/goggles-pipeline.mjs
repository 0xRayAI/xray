/**
 * Goggles. Kind 0 name-checks the six outer names.
 * A named plane returns its view. Field pipes fill what they can see.
 * The view keeps every field for the next look.
 * A held plane stays quiet. A leave is denied.
 * On this host a search is grep, glob, or a shell that runs one.
 * The lens file stays open. One later read may go on, then the next read stops.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const HERE = dirname(fileURLToPath(import.meta.url));
const WORN_PLANES = ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'];
const CARD_PLANES = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting', 'stamp-plate', 'record-map', 'write-home', 'activity-log', 'session-capture', 'suit-wear', 'suit-organs', 'station-card', 'notes-page', 'reflection-page', 'site-manual', 'package-face', 'suit-settings', 'trail-state', 'inference-files', 'grok-compact', 'payload-heat', 'station-heat', 'pickup-stamp', 'cursor-compact'];
const CARD_FLAVORS = ['digest', 'triage'];
const SCOPE_ZOOM = ['ecosystem', 'part', 'one flow', 'one artifact'];

/** Empty GOGGLES_PLANES_PATH keeps the file beside the organ. */
export function planesFile() {
  const override = process.env.GOGGLES_PLANES_PATH;
  if (typeof override === 'string' && override.trim()) return override.trim();
  return join(HERE, 'goggles-planes.json');
}

function drawnPlanes() {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    return Array.isArray(data.planes) ? data.planes.map((name) => String(name)) : [];
  } catch {
    return [];
  }
}

export function actualityOf(map, worn) {
  const left = Array.isArray(map) ? map : [];
  const right = Array.isArray(worn) ? worn : [];
  const same = left.length === right.length && left.every((name, index) => name === right[index]);
  return same ? '' : 'Actuality. Drift: worn is not the map.';
}

export function actualityLine() {
  return actualityOf(drawnPlanes(), WORN_PLANES);
}

function acceptedPlanes() {
  const map = new Set(drawnPlanes());
  return WORN_PLANES.filter((name) => map.has(name));
}

function readingLine(name, scope) {
  return scope ? `The reading is ${name}. Scope is ${scope}.` : `The reading is ${name}.`;
}

function organDeny(reason) {
  return { gate: 'goggles', decision: 'deny', reason };
}

function plateIdsIn(spoken) {
  const ids = [];
  const re = /docs-site\/docs\/plates\/([a-z0-9-]+)\.md/ig;
  let match;
  while ((match = re.exec(String(spoken || '')))) ids.push(match[1]);
  return ids;
}

function associatedPlates(plane) {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const entry = data[plane];
    const listed = entry && Array.isArray(entry.plates) ? entry.plates.map(String) : [];
    return new Set([plane, ...listed]);
  } catch {
    return new Set([plane]);
  }
}

function planeWord(name, text) {
  return new RegExp(`(?:^|[^A-Za-z0-9-])${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9-]|$)`, 'i').test(String(text || ''));
}

function withoutPaths(text) {
  return String(text || '').replace(/(?:[\w.@~-]+\/)+[\w.-]+/g, ' ');
}

function plateIdsIn(spoken) {
  const ids = [];
  const re = /docs-site\/docs\/plates\/([a-z0-9-]+)\.md/ig;
  let match;
  while ((match = re.exec(String(spoken || '')))) ids.push(match[1]);
  return ids;
}

function associatedPlates(plane) {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const entry = data[plane];
    const listed = entry && Array.isArray(entry.plates) ? entry.plates.map(String) : [];
    return new Set([plane, ...listed]);
  } catch {
    return new Set([plane]);
  }
}

export function organStop(held, action) {
  if (!held) return null;
  if (held.drift) return organDeny(held.drift);
  const plane = held.plane;
  if (!plane) return null;
  const text = String(action?.text || '');
  const paths = (action?.paths || []).map(String).filter(Boolean);
  const tool = String(action?.tool || '');
  const spoken = [text, ...paths].join('\n');
  const drawn = plateIdsIn(spoken);
  if (drawn.length) {
    const allowed = associatedPlates(plane);
    const foreign = drawn.filter((id) => !allowed.has(id));
    if (foreign.length) {
      return organDeny(`The reading is ${plane}. That drawing is not the plane.`);
    }
  }
  const otherFile = otherPlaneFile(plane, spoken);
  if (otherFile) return organDeny(`The reading is ${plane}. The action is ${otherFile}.`);
  const stripped = withoutPaths(text);
  const others = acceptedPlanes().filter((name) => name !== plane && planeWord(name, stripped));
  const namesThis = planeWord(plane, stripped);
  if (others.length > 1 || (others.length === 1 && namesThis)) {
    return organDeny(`The reading is ${plane}. The action names two planes.`);
  }
  if (others.length === 1) {
    return organDeny(`The reading is ${plane}. The action is ${others[0]}.`);
  }
  return scopeStop(plane, held.scope, tool, paths);
}

function scopeStop(plane, scope, tool, paths) {
  if (!scope || scope === 'ecosystem') return null;
  if (scope === 'part') {
    const dirs = new Set(paths.map((file) => dirname(file)));
    if (dirs.size > 1) return organDeny(`The reading is ${plane}. Scope is part. This action crosses parts.`);
    return null;
  }
  if (scope === 'one flow') {
    if (/grep|search|glob|read|open/i.test(tool) && paths.length !== 1) {
      return organDeny(`The reading is ${plane}. Scope is one flow. This action is not one flow.`);
    }
    return null;
  }
  if (scope === 'one artifact') {
    if (/bash|shell/i.test(tool) || paths.length !== 1) {
      return organDeny(`The reading is ${plane}. Scope is one artifact. This action is wider.`);
    }
  }
  return null;
}

function readingPath(root) {
  return join(root, '.xray', 'state', 'goggles-reading.json');
}

function loadReading(root) {
  try {
    const data = JSON.parse(readFileSync(readingPath(root), 'utf8'));
    if (!data || typeof data !== 'object') return null;
    if (typeof data.drift === 'string' && data.drift) return { drift: data.drift };
    if (typeof data.plane !== 'string' || !data.plane) return null;
    return { plane: data.plane, scope: typeof data.scope === 'string' ? data.scope : '' };
  } catch {
    return null;
  }
}

function saveReading(root, rec) {
  const file = readingPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(rec)}\n`);
}

function clearReading(root) {
  const file = readingPath(root);
  if (existsSync(file)) unlinkSync(file);
}

function findScopes(words) {
  let rest = ` ${words.join(' ').toLowerCase()} `;
  const hits = [];
  const ordered = [...SCOPE_ZOOM].sort((a, b) => b.length - a.length);
  for (const scope of ordered) {
    const needle = ` ${scope} `;
    if (!rest.includes(needle)) continue;
    hits.push(scope);
    rest = rest.split(needle).join(' ');
  }
  return hits;
}

function kindPastOne(words) {
  const lower = words.map((word) => word.toLowerCase());
  if (lower.length === 1 && /^\d+$/.test(lower[0]) && Number(lower[0]) > 1) return true;
  for (let i = 0; i < lower.length; i += 1) {
    if (!/^(kind|pull|pull-up|level)$/.test(lower[i])) continue;
    const next = lower[i + 1];
    if (next && /^\d+$/.test(next) && Number(next) > 1) return true;
  }
  return false;
}

function isKindZero(lower) {
  if (lower.includes('actuality')) return true;
  if (lower.length === 1 && lower[0] === '0') return true;
  for (let i = 0; i < lower.length; i += 1) {
    if ((lower[i] === 'kind' || lower[i] === 'level') && lower[i + 1] === '0') return true;
  }
  return false;
}

function namesTheSet(lower) {
  const joined = lower.join(' ');
  if (joined === 'kind 1' || joined === 'level 1') return true;
  const mentionsSet = lower.includes('outer') || lower.includes('outer-loop');
  if (!mentionsSet) return false;
  const planes = acceptedPlanes().filter((name) => lower.includes(name));
  if (planes.length === 0) return true;
  return planes.length === 1 && planes[0] === 'loop' && findScopes(lower).length === 0;
}

function gogglesAnswer(argv) {
  const words = [];
  for (const raw of argv || []) {
    const arg = String(raw || '').trim();
    if (!arg || arg.toLowerCase() === 'pop') continue;
    words.push(arg);
  }
  const lower = words.map((word) => word.toLowerCase());
  const none = (text) => ({ text, cards: null });
  if (lower.includes('calling')) return none('');
  if (kindPastOne(words)) return none('');
  if (words.length === 0) return none('');
  if (namesTheSet(lower)) return none('Name one plane.');
  if (isKindZero(lower)) {
    if (findScopes(words).length) return none('');
    if (acceptedPlanes().some((name) => lower.includes(name))) return none('');
    return none(actualityLine());
  }
  const flavors = CARD_FLAVORS.filter((name) => lower.includes(name));
  if (flavors.length > 1) return none('');
  if (flavors.length === 1) {
    const others = acceptedPlanes().filter((name) => name !== flavors[0] && lower.includes(name));
    if (others.length) return none('');
    const cards = collectCards(flavors[0], lower);
    if (!cards) return none('');
    return { text: cards.map((card) => formatCardText(card)).join('\n\n'), cards };
  }
  const planes = acceptedPlanes().filter((name) => lower.includes(name));
  if (planes.length !== 1) {
    if (!planes.length && cardPlanesNamed(lower).length) {
      const cards = collectCards('digest', lower);
      if (cards && cards.length) {
        return { text: cards.map((card) => formatCardText(card)).join('\n\n'), cards };
      }
    }
    return none('');
  }
  const scopes = findScopes(words.filter((word) => word.toLowerCase() !== planes[0]));
  if (scopes.length > 1) return none('');
  const line = readingLine(planes[0], scopes[0] || '');
  const file = moduleFile(planes[0]);
  return none(file ? `${line} File: ${file}` : line);
}

export function readGoggles(argv) {
  return ok(gogglesAnswer(argv).text);
}

export function lookCards(argv) {
  return gogglesAnswer(argv).cards;
}

function cardPlanesNamed(lower) {
  return CARD_PLANES.filter((name) => lower.includes(name));
}

function listedFiles(plane) {
  return Array.isArray(plane.files) ? plane.files.map(String) : [];
}

function cardView(plane, scope, flavor, root) {
  const listed = listedFiles(plane);
  const view = {
    plane: plane.id,
    flavor,
    scope: scope || '',
    from: plane.id === 'ground' ? '' : (plane.from || 'ground'),
    digest: plane.digest || '',
    plate: plane.plate || '',
    plates: Array.isArray(plane.plates) ? plane.plates : [],
    entry: plane.entry || '',
    exit: plane.exit || '',
    files: listed,
    skills: plane.skills || '',
    setup: plane.setup || '',
    teardown: plane.teardown || '',
    worn: plane.worn || '',
  };
  view.exam = examinePlane(plane, root).text;
  if (flavor === 'triage') {
    const filled = new Set(filledOf(plane));
    view.empty = FIELD_ORDER.filter((name) => !filled.has(name));
  }
  return view;
}

function cardRows(view) {
  const rows = [
    ['Plane', view.plane],
    ['From', view.from],
    ['Digest', view.digest],
    ['Plate', view.plate],
  ];
  if (Array.isArray(view.plates) && view.plates.length) rows.push(['Plates', view.plates.join(', ')]);
  rows.push(
    ['Entry', view.entry],
    ['Exit', view.exit],
    ['Files', view.files.join(', ')],
    ['Skills', view.skills],
    ['Setup', view.setup],
    ['Teardown', view.teardown],
    ['Worn', view.worn],
  );
  return rows;
}

function formatCardText(view) {
  const rows = cardRows(view);
  let text = rows.map(([key, value]) => `${key}: ${value}`.trimEnd()).join('\n');
  if (view.flavor === 'triage') {
    const lines = [];
    if (view.empty.length) lines.push(`Empty: ${view.empty.join(', ')}`);
    lines.push(view.exam);
    text = `${text}\n${lines.join('\n')}`;
  } else if (typeof view.exam === 'string' && view.exam.startsWith('Drift:')) {
    text = `${text}\n${view.exam}`;
  }
  return text;
}

export function formatCardPane(view) {
  const rows = cardRows(view);
  if (view.flavor === 'triage') {
    if (Array.isArray(view.empty) && view.empty.length) rows.push(['Empty', view.empty.join(', ')]);
    if (view.exam) rows.push(['', view.exam]);
  } else if (typeof view.exam === 'string' && view.exam.startsWith('Drift:')) {
    rows.push(['', view.exam]);
  }
  const body = rows.map(([label, value]) => (label ? `${label.padEnd(8)} ${value}` : value).trimEnd());
  const title = `${view.flavor} · ${view.plane}`;
  const width = Math.max(title.length + 2, ...body.map((line) => line.length));
  const top = `┌ ${title} ${'─'.repeat(Math.max(0, width - title.length - 1))}┐`;
  const mid = body.map((line) => `│ ${line.padEnd(width)} │`);
  const bot = `└${'─'.repeat(width + 2)}┘`;
  return [top, ...mid, bot].join('\n');
}

function collectCards(flavor, lower) {
  const named = cardPlanesNamed(lower);
  const scopes = findScopes(lower.filter((word) => word !== flavor && !named.includes(word)));
  if (scopes.length > 1) return null;
  const scope = scopes[0] || '';
  const platesDir = findPlatesDir(HERE);
  const ids = named.length ? named : CARD_PLANES;
  const root = sourceRoot(platesDir);
  const cards = [];
  for (const id of ids) {
    const plane = growPlane(id, platesDir, stateRoot());
    cards.push(cardView(plane, scope, flavor, root));
  }
  return cards;
}

export function findPlatesDir(start) {
  let dir = start;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'docs-site', 'docs', 'plates');
    if (existsSync(join(candidate, 'index.md'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}


function stripFrontmatter(raw) {
  return String(raw).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}


function boxTitles(line) {
  const titles = [];
  for (const part of String(line).split('│')) {
    const title = part.replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]/.test(title)) continue;
    if (title.startsWith('·') || title.includes('LAYER')) continue;
    titles.push(title);
  }
  return titles;
}

function flowEnds(body) {
  if (!body || body.includes('INPUT LAYER')) return null;
  const stages = [];
  let title = '';
  let notes = [];
  let open = false;
  for (const line of String(body).split(/\r?\n/)) {
    if (line.includes('┌')) {
      open = true;
      title = '';
      notes = [];
      continue;
    }
    if (!open) continue;
    if (line.includes('└')) {
      if (title) stages.push({ title, notes: notes.slice() });
      open = false;
      continue;
    }
    if (!/[A-Za-z]/.test(line)) continue;
    const titles = boxTitles(line);
    if (titles.length && !title) {
      title = titles.join(' ');
      continue;
    }
    const note = line.replace(/[│|]/g, ' ').replace(/^[\s·.-]+/, '').trim();
    if (note) notes.push(note);
  }
  if (stages.length < 2) return null;
  const first = stages[0];
  const last = stages[stages.length - 1];
  return {
    entry: first.title,
    exit: last.title,
    setup: first.notes.join(' '),
    teardown: last.notes.join(' '),
  };
}

function doorsOf(body) {
  let layer = '';
  let want = false;
  const found = { input: [], output: [] };
  for (const line of String(body).split(/\r?\n/)) {
    if (line.includes('INPUT LAYER')) { layer = 'input'; want = false; continue; }
    if (line.includes('OUTPUT LAYER')) { layer = 'output'; want = false; continue; }
    if (line.includes('PROCESSING LAYER')) { layer = ''; want = false; continue; }
    if (layer !== 'input' && layer !== 'output') continue;
    if (line.includes('┌')) { want = true; continue; }
    if (!want) continue;
    const titles = boxTitles(line);
    if (!titles.length) continue;
    found[layer].push(...titles);
    want = false;
  }
  const join = (list) => (list.length ? list.join(' · ') : null);
  return { entry: join(found.input), exit: join(found.output) };
}

function takeOf(body) {
  const lines = String(body).split(/\r?\n/);
  const prose = [];
  let pastHeading = false;
  for (const line of lines) {
    if (!pastHeading) {
      if (/^#\s+/.test(line)) pastHeading = true;
      continue;
    }
    if (line.startsWith('```')) break;
    if (!line.trim()) {
      if (prose.length) break;
      continue;
    }
    prose.push(line.trim());
  }
  const paragraph = prose.join(' ');
  const sentence = paragraph.match(/^.*?[.!?](?:\s|$)/);
  return (sentence ? sentence[0] : paragraph).trim();
}


function overlayTable() {
  const file = planesFile();
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8'));
}

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function filledOf(plane) {
  const flags = {
    plate: present(plane.plate),
    entry: present(plane.entry),
    exit: present(plane.exit),
    files: present(plane.files) || present(plane.unpathed),
    skills: present(plane.skills),
    setup: present(plane.setup),
    teardown: present(plane.teardown),
    worn: present(plane.worn),
  };
  return FIELD_ORDER.filter((name) => flags[name]);
}

function plateSource(id, platesDir) {
  if (!platesDir || id === 'ground') return { body: '', path: '' };
  const abs = join(platesDir, `${id}.md`);
  if (!existsSync(abs)) return { body: '', path: '' };
  return {
    body: readFileSync(abs, 'utf8'),
    path: join('docs-site', 'docs', 'plates', `${id}.md`),
  };
}

function sectionOf(body, title) {
  if (!body) return '';
  const lines = stripFrontmatter(body).split(/\r?\n/);
  const heading = new RegExp(`^#{1,3}\\s+${title}\\s*$`, 'i');
  let on = false;
  const prose = [];
  for (const line of lines) {
    if (heading.test(line)) {
      on = true;
      continue;
    }
    if (!on) continue;
    if (/^#{1,3}\s+/.test(line) || line.startsWith('```')) break;
    if (!line.trim()) {
      if (prose.length) break;
      continue;
    }
    prose.push(line.trim());
  }
  return prose.join(' ');
}

export function assemblePlane(id, platesDir) {
  const extra = overlayTable()[id] || {};
  const src = plateSource(id, platesDir);
  const doors = src.body ? doorsOf(src.body) : { entry: null, exit: null };
  const flow = src.body ? flowEnds(src.body) : null;
  const digest = extra.digest || (src.body ? takeOf(stripFrontmatter(src.body)) : '');
  const files = Array.isArray(extra.files) ? extra.files.map(String) : [];
  return {
    id,
    digest,
    plate: src.path,
    entry: extra.entry || doors.entry || (flow && flow.entry) || '',
    exit: extra.exit || doors.exit || (flow && flow.exit) || '',
    entryIsMark: Boolean(extra.entry),
    exitIsMark: Boolean(extra.exit),
    files,
    unpathed: extra.unpathed || null,
    skills: extra.skills || '',
    plates: Array.isArray(extra.plates) ? extra.plates.map(String) : [],
    setup: extra.setup || sectionOf(src.body, 'Setup') || (flow && flow.setup) || '',
    teardown: extra.teardown || sectionOf(src.body, 'Teardown') || (flow && flow.teardown) || '',
    worn: extra.worn || '',
    clues: cluesOf(src.body),
    mark: extra.mark || null,
    wornMark: extra.wornMark || null,
    pick: extra.pick || null,
  };
}

const VIEW_KEYS = ['from', 'digest', 'plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];

function stateRoot() {
  const env = process.env.GOGGLES_ROOT;
  if (typeof env === 'string' && env.trim() && env.trim() !== '.') return resolve(env.trim());
  return process.cwd();
}

function sourceRoot(platesDir) {
  return platesDir ? repoRootFrom(platesDir) : stateRoot();
}

function viewsPath(root) {
  return join(root, '.xray', 'state', 'goggles-views.json');
}

function loadViews(root) {
  try {
    const data = JSON.parse(readFileSync(viewsPath(root), 'utf8'));
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function saveViews(root, views) {
  const file = viewsPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(views, null, 2)}\n`);
}

function cluesOf(body) {
  if (!body) return [];
  const clues = [];
  for (const match of String(body).matchAll(/`([^`]{4,80})`/g)) clues.push(match[1]);
  for (const line of String(body).split(/\r?\n/)) {
    if (!line.includes('│')) continue;
    for (const title of boxTitles(line)) {
      if (title.length >= 8 && title.length <= 60) clues.push(title);
    }
  }
  return clues;
}

const sourceCache = new Map();

function sourceTexts(root) {
  if (sourceCache.has(root)) return sourceCache.get(root);
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 8) return;
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'dist') continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (!/\.(ts|mjs|cjs)$/.test(entry.name) || entry.name.endsWith('.test.ts')) continue;
      try {
        out.push({ rel: abs.slice(root.length + 1), text: readFileSync(abs, 'utf8') });
      } catch {
        /* unreadable source is not a plane file */
      }
    }
  };
  walk(join(root, 'src'), 0);
  sourceCache.set(root, out);
  return out;
}

function fileFromClues(clues, root, planeId) {
  const texts = sourceTexts(root);
  const votes = new Map();
  for (const clue of clues) {
    const hits = [];
    for (const file of texts) {
      if (!file.text.includes(clue)) continue;
      hits.push(file.rel);
      if (hits.length > 8) break;
    }
    if (!hits.length || hits.length > 8) continue;
    const weight = 9 - hits.length;
    for (const rel of hits) votes.set(rel, (votes.get(rel) || 0) + weight);
  }
  const token = String(planeId || '').split('-')[0].toLowerCase();
  const named = token ? [...votes.keys()].filter((rel) => rel.toLowerCase().includes(token)) : [];
  const pool = new Set(named.length ? named : [...votes.keys()]);
  let best = '';
  let bestRank = -1;
  for (const [rel, score] of votes) {
    if (!pool.has(rel)) continue;
    let rank = score * 10;
    if (token && rel.toLowerCase().includes(token)) rank += 20;
    if (rel.startsWith('src/cli/')) rank -= 3;
    if (rank > bestRank || (rank === bestRank && rel.length < best.length)) {
      best = rel;
      bestRank = rank;
    }
  }
  return best;
}

function skillFor(id, root) {
  const dir = join(root, 'src', 'skills');
  if (!existsSync(dir)) return '';
  let names = [];
  try {
    names = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return '';
  }
  const hit = names.filter((name) => name === id || name.startsWith(`${id}-`));
  if (hit.length !== 1) return '';
  const rel = join('src', 'skills', hit[0], 'SKILL.md');
  return existsSync(join(root, rel)) ? rel : '';
}

function mappedFile(name) {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const entry = data[name];
    if (!entry || typeof entry !== 'object') return '';
    if (typeof entry.file === 'string' && entry.file) return entry.file;
  } catch {
    return '';
  }
  return '';
}

function moduleFile(name) {
  const mapped = mappedFile(name);
  if (mapped) return mapped;
  const platesDir = findPlatesDir(HERE);
  const root = sourceRoot(platesDir);
  const hit = sourceTexts(root).find((file) => file.rel.endsWith(`/${name}.ts`) || file.rel.endsWith(`/${name}.mjs`));
  return hit ? hit.rel : '';
}

function hintLine(name) {
  const cards = lookCards(['digest', name]);
  const files = cards && cards[0] && Array.isArray(cards[0].files) ? cards[0].files : [];
  return files.length ? `${name}: ${files.join(', ')}` : '';
}

export function suitHint(text) {
  const words = intentWords(text);
  const named = CARD_PLANES.filter((name) => words.includes(name));
  if (!named.length) return lookVerb(words) ? 'Name one plane.' : '';
  return named.map(hintLine).filter(Boolean).join('\n');
}

const DEEP_SEARCH = /search_codebase|find_implementation|get_documentation/i;
const HOLDS_ON_NAME = new Set(['dichotomy', 'syncopate', 'synthesis']);
const SHELL_SEARCH = /(?:^|&&|\|\||[;&|`(\n])\s*(?:(?:\/[\w.+/-]+\/)|(?:npx\s+))?(?:rg|grep|ag|ack|fd|find)\b|\bgit\s+grep\b/;

function shellSearches(text) {
  return SHELL_SEARCH.test(String(text || ''));
}

function mappedPlaneFiles(name) {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const entry = data[name];
    if (!entry || typeof entry !== 'object') return [];
    const candidates = [entry.file, entry.worn, entry.skills];
    if (Array.isArray(entry.files)) candidates.push(...entry.files);
    return candidates.filter((file) => typeof file === 'string' && file.includes('.') && file.includes('/'));
  } catch {
    return [];
  }
}

function otherPlaneFile(held, spoken) {
  const text = String(spoken || '');
  for (const name of acceptedPlanes()) {
    if (name === held) continue;
    if (mappedPlaneFiles(name).some((file) => text.includes(file))) return name;
  }
  return '';
}

function mapFiles() {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const files = [];
    for (const name of [...CARD_PLANES, ...WORN_PLANES]) {
      const entry = data[name];
      if (!entry || typeof entry !== 'object') continue;
      const candidates = [entry.file, entry.worn, entry.skills];
      if (Array.isArray(entry.files)) candidates.push(...entry.files);
      for (const file of candidates) {
        if (typeof file === 'string' && file.includes('.') && file.includes('/')) files.push(file);
      }
    }
    return files;
  } catch {
    return [];
  }
}

function opensLensFile(text) {
  const spoken = String(text || '');
  return mapFiles().some((file) => spoken.includes(file));
}

function researchCall(toolName, text) {
  const tool = String(toolName || '');
  const spoken = String(text || '');
  if (/researcher|explorer|deep[- ]?research/i.test(tool) || DEEP_SEARCH.test(tool)) return true;
  if (/bash|shell/i.test(tool) && (/researcher|explorer|deep[- ]?research/i.test(spoken) || DEEP_SEARCH.test(spoken) || shellSearches(spoken))) return true;
  if (/^(grep|glob)$/i.test(tool)) return true;
  return /^read_file$/i.test(tool) && !opensLensFile(spoken);
}

function passPath(root) {
  return join(root, '.xray', 'state', 'goggles-lens-pass.json');
}

function loadReadPass(root) {
  try {
    const data = JSON.parse(readFileSync(passPath(root), 'utf8'));
    if (!data || data.read !== true) return null;
    return data.spent === true ? 'spent' : 'armed';
  } catch {
    return null;
  }
}

function saveReadPass(root, spent) {
  const file = passPath(root);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ read: true, spent: Boolean(spent) })}\n`);
}

/** One plane: the files the suit continues with. A look with no plane stops. Two planes stay quiet. */
export function lensPlane(text) {
  const hint = suitHint(String(text || ''));
  if (hint === 'Name one plane.') return { stop: true, files: [] };
  if (!hint || hint.includes('\n')) return { stop: false, files: [] };
  const mark = hint.indexOf(': ');
  if (mark < 0) return { stop: false, files: [] };
  const files = hint.slice(mark + 2).split(',').map((part) => part.trim()).filter(Boolean);
  return { stop: false, files };
}

function lensPage(root, names) {
  if (!names.length) return 'Name one plane.';
  const platesDir = findPlatesDir(HERE);
  const parts = [];
  for (const id of names) {
    const plane = growPlane(id, platesDir, root);
    parts.push(formatCardText(cardView(plane, '', 'digest', sourceRoot(platesDir))));
  }
  return parts.join('\n\n');
}

function stampPlane(root, id) {
  try {
    const plates = createRequire(import.meta.url)('./plates.cjs');
    if (!plates.PLATE_IDS.includes(id)) return;
    plates.stampPlateIfMissing(root, id);
  } catch {
    /* a missed stamp must not fail the stop */
  }
}

/** Name one plane and the tool continues. Name none, or more than one, and the search stops. */
export function lensBeforeResearch(root, toolName, text) {
  const spoken = String(text || '');
  if (!researchCall(toolName, spoken)) return null;
  const names = CARD_PLANES.filter((name) => intentWords(spoken).includes(name));
  if (names.length === 1) {
    stampPlane(root, names[0]);
    return null;
  }
  if (/^read_file$/i.test(String(toolName || ''))) {
    if (loadReadPass(root) === 'armed') {
      saveReadPass(root, true);
      return null;
    }
    if (loadReadPass(root) !== 'spent') saveReadPass(root, false);
    return { gate: 'lens', decision: 'deny', reason: 'Name one plane.' };
  }
  return { gate: 'lens', decision: 'deny', reason: 'Name one plane.' };
}

function seenFields(plane, root) {
  const files = Array.isArray(plane.files) ? plane.files.slice() : [];
  let worn = plane.worn || '';
  if (!files.length && Array.isArray(plane.unpathed) && plane.unpathed.includes('mill')) {
    if (existsSync(join(root, 'scripts', 'foundry'))) files.push('scripts/foundry');
  }
  if (!files.length && Array.isArray(plane.clues) && plane.clues.length) {
    const found = fileFromClues(plane.clues, root, plane.id);
    if (found) files.push(found);
  }
  let skills = plane.skills || '';
  if (!skills) skills = skillFor(plane.id, root);
  if (!worn) {
    for (const file of files) {
      if (!file.startsWith('src/')) continue;
      let rel = file.slice(4);
      if (rel.endsWith('.ts')) rel = rel.replace(/\.ts$/, '.js');
      else if (!/\.(cjs|mjs|js)$/.test(rel)) continue;
      const next = `dist/${rel}`;
      if (existsSync(join(root, next))) {
        worn = next;
        break;
      }
    }
  }
  return {
    from: plane.id === 'ground' ? '' : 'ground',
    digest: plane.digest || '',
    plate: plane.plate || '',
    entry: plane.entry || '',
    exit: plane.exit || '',
    files,
    skills,
    setup: plane.setup || '',
    teardown: plane.teardown || '',
    worn,
  };
}

function freshField(seen, key) {
  if (key === 'files') return Array.isArray(seen.files) ? seen.files.map(String) : [];
  return seen[key] || '';
}

export function growPlane(id, platesDir, root) {
  const seen = seenFields(assemblePlane(id, platesDir), sourceRoot(platesDir));
  const views = loadViews(root);
  const grown = { id };
  for (const key of VIEW_KEYS) grown[key] = freshField(seen, key);
  if (id === 'ground') grown.from = '';
  views[id] = {};
  for (const key of VIEW_KEYS) views[id][key] = grown[key];
  saveViews(root, views);
  const base = assemblePlane(id, platesDir);
  return { ...base, ...grown };
}

function repoRootFrom(platesDir) {
  return dirname(dirname(dirname(platesDir)));
}

function miss(text) {
  return { ok: false, text };
}

function ok(text) {
  return { ok: true, text };
}

function holds() {
  return { kind: 'holds', text: 'Holds.' };
}

function drift(text) {
  return { kind: 'drift', text: `Drift: ${text}` };
}

function drawing() {
  return { kind: 'drawing', text: 'Drawing only.' };
}

function fileHas(root, rel, mark) {
  if (!rel || !mark) return false;
  const full = join(root, rel);
  return existsSync(full) && readFileSync(full, 'utf8').includes(mark);
}


function factoryName(rel) {
  return rel.startsWith('src/') || rel.startsWith('grok-bot/');
}

function wornHolds(plane, root) {
  if (!plane.worn || !existsSync(join(root, plane.worn))) return false;
  if (!plane.wornMark) return true;
  return fileHas(root, plane.worn, plane.wornMark);
}

export function examinePlane(plane, root) {
  const files = Array.isArray(plane.files) ? plane.files : [];
  const checkable = files.length > 0 || plane.skills || plane.worn;
  if (!checkable) return drawing();
  const held = wornHolds(plane, root);
  if (plane.worn && !held) {
    return drift(`the worn build is not ${files[0] || plane.worn}`);
  }
  for (const rel of files) {
    if (existsSync(join(root, rel))) continue;
    if (held && factoryName(rel)) continue;
    return drift(`${rel} is not there`);
  }
  if (plane.mark && files[0] && existsSync(join(root, files[0])) && !fileHas(root, files[0], plane.mark)) {
    return drift(`${plane.mark} is not in ${files[0]}`);
  }
  if (plane.skills && !existsSync(join(root, plane.skills)) && !(held && factoryName(plane.skills))) {
    return drift(`${plane.skills} is not there`);
  }
  if (plane.entryIsMark && plane.entry && files[0] && existsSync(join(root, files[0])) && !fileHas(root, files[0], plane.entry)) {
    return drift(`${plane.entry} is not in ${files[0]}`);
  }
  if (plane.exitIsMark && plane.exit && files[0] && existsSync(join(root, files[0])) && !fileHas(root, files[0], plane.exit)) {
    return drift(`${plane.exit} is not in ${files[0]}`);
  }
  return holds();
}


export function look(argv) {
  return readGoggles(argv);
}


function isGogglesWork(text) {
  return /(?<![A-Za-z0-9-])goggles(?![A-Za-z0-9-])/i.test(String(text || ''));
}


export function cardStop(root, toolName, text, paths = []) {
  const held = loadReading(root);
  if (!held) return null;
  const drift = actualityLine();
  if (drift) return organDeny(drift);
  const stopped = organStop(held, { tool: toolName, text, paths });
  if (stopped) return stopped;
  return { gate: 'goggles', decision: 'allow' };
}

function stationFile(root) {
  return join(root, '.xray', 'state', 'STATION.md');
}

function withoutCardLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .filter((row) => !/^Card:\s/.test(row.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function clearCardLine(root) {
  const dest = stationFile(root);
  if (!existsSync(dest)) return;
  const prev = readFileSync(dest, 'utf8');
  const next = withoutCardLines(prev).replace(/\s*$/, '');
  const body = next ? `${next}\n` : '';
  if (body !== prev) writeFileSync(dest, body);
}


function intentWords(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

function lookVerb(words) {
  return words.includes('look') || words.includes('name');
}

export function handCard(root, intent) {
  try {
    const text = String(intent || '');
    const words = intentWords(text);
    if (isGogglesWork(text) && text.length <= 200) {
      clearReading(root);
      clearCardLine(root);
      return null;
    }
    const asked = lookVerb(words);
    const planes = acceptedPlanes().filter((name) => words.includes(name));
    if (!asked && planes.length === 0) return null;
    if (!asked && planes.length === 1 && !HOLDS_ON_NAME.has(planes[0])) return null;
    clearCardLine(root);
    const looked = readGoggles(words);
    if (looked.text.startsWith('Actuality. Drift')) {
      saveReading(root, { drift: looked.text });
      return null;
    }
    if (planes.length !== 1) {
      clearReading(root);
      return null;
    }
    const scopes = findScopes(words.filter((word) => word !== planes[0]));
    if (scopes.length > 1) {
      clearReading(root);
      return null;
    }
    const next = { plane: planes[0], scope: scopes[0] || '' };
    const prev = loadReading(root);
    if (prev && prev.plane === next.plane && (prev.scope || '') === next.scope && !prev.drift) return null;
    saveReading(root, next);
    return null;
  } catch {
    return null;
  }
}


export function lensPath(root) {
  return join(root, '.xray', 'state', 'LENS.md');
}


export function maintainLens(root) {
  const drift = actualityLine();
  const text = drift || 'quiet (match)';
  mkdirSync(dirname(lensPath(root)), { recursive: true });
  writeFileSync(lensPath(root), `${text}\n`);
  return ok(drift);
}


function sameInvoked(argvPath, modulePath) {
  try {
    return realpathSync(argvPath) === realpathSync(modulePath);
  } catch {
    return resolve(argvPath) === resolve(modulePath);
  }
}

const isMain = Boolean(process.argv[1]) && sameInvoked(process.argv[1], fileURLToPath(import.meta.url));
if (isMain) {
  const answered = gogglesAnswer(process.argv.slice(2));
  const pane = process.stdout.isTTY && Array.isArray(answered.cards) && answered.cards.length > 0;
  const text = pane ? answered.cards.map((card) => formatCardPane(card)).join('\n\n') : answered.text;
  process.stdout.write(`${text}\n`);
  process.exit(0);
}
