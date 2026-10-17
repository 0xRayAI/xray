/**
 * Goggles. The plane is state. A session starts on dev.
 * The card is in LENS.md: Entry, Exit, and the other rows.
 * A search inside the current card runs. Any other search returns the card and does not run.
 * Opening a file on that card stays quiet.
 * Opening a file on another plane switches, returns that card, and the open proceeds.
 * A file on no plane stays put and returns the current card.
 * A thing on that plane has its own card. One card can name many plates.
 * A missing plate names the stamp-plate skill. The hook does not write the plate.
 * Compact writes the current card back. It does not add a plane.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const HERE = dirname(fileURLToPath(import.meta.url));
/** Map names. A look does not answer them. Their files stay on the lens. */
const WORN_PLANES = ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'];
export const CARD_PLANES = ['dev', 'integration', 'domain', 'ecosystem'];

const PLANE_PATHS = {
  dev: ['src', 'grok-bot', 'docs-site', 'AGENTS.md', 'package.json', 'README.md'],
  integration: [
    'src/integrations',
    'src/nucleus',
    'src/governance',
    'src/mcps',
    'src/processors',
    'src/reporting',
    'src/core/boot-orchestrator.ts',
    'grok-bot/lib',
    'grok-bot/templates',
  ],
  domain: ['docs-site/docs/plates', 'src/integrations/hooks/plates.cjs', '.agents/skills'],
  ecosystem: ['scripts/foundry', 'node_modules/@0xray'],
};

const PLANE_ROWS = {
  dev: {
    from: '',
    digest: 'This checkout.',
    plate: '',
    entry: 'package.json, src, and grok-bot/OP-PROC.md.',
    exit: 'A change that stays in this repo.',
    files: 'src, grok-bot, docs-site, AGENTS.md, package.json, README.md',
    skills: 'SKILLS.md',
    setup: 'You are in this repo.',
    teardown: 'Leave other repos alone.',
    worn: '',
  },
  integration: {
    from: 'dev',
    digest: 'How one part calls the next.',
    plate: '',
    entry: 'The hook, the dispatch, or the bridge this file sits on.',
    exit: 'The next call. Stop there.',
    files: 'src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates',
    skills: 'SKILLS.md',
    setup: 'One connection at a time.',
    teardown: 'Do not sweep the rest of the repo.',
    worn: '',
  },
  domain: {
    from: 'dev',
    digest: 'The drawing of one area.',
    plate: 'docs-site/docs/plates',
    entry: 'The plate under docs-site/docs/plates, or the plate reader.',
    exit: 'The entry and exit written on that plate.',
    files: 'docs-site/docs/plates, src/integrations/hooks/plates.cjs, .agents/skills',
    skills: '.agents/skills',
    setup: 'One plate is in the frame.',
    teardown: 'The plate is the drawing. The code stays on dev or integration.',
    worn: '',
  },
  ecosystem: {
    from: 'dev',
    digest: 'What this repo wears from outside.',
    plate: '',
    entry: 'scripts/foundry, and the @0xray packages this repo wears.',
    exit: 'Back to this checkout when the change is here.',
    files: 'scripts/foundry, node_modules/@0xray',
    skills: '',
    setup: 'The outside package is not this repo.',
    teardown: 'Do not edit a worn package from here.',
    worn: 'node_modules/@0xray',
  },
};

function builtinCard(id) {
  const row = PLANE_ROWS[id];
  if (!row) return '';
  const lines = [
    ['Plane', id],
    ['From', row.from],
    ['Digest', row.digest],
    ['Plate', row.plate],
    ['Entry', row.entry],
    ['Exit', row.exit],
    ['Files', row.files],
    ['Skills', row.skills],
    ['Setup', row.setup],
    ['Teardown', row.teardown],
    ['Worn', row.worn],
  ];
  return lines.map(([key, value]) => `${key}: ${value}`.trimEnd()).join('\n');
}

function planeOfPath(file) {
  const rel = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  let best = '';
  let winner = '';
  for (const [id, paths] of Object.entries(PLANE_PATHS)) {
    for (const prefix of paths) {
      if (rel === prefix || rel.startsWith(`${prefix}/`)) {
        if (prefix.length > best.length) {
          best = prefix;
          winner = id;
        }
      }
    }
  }
  return winner;
}

/** Empty GOGGLES_PLANES_PATH keeps the file beside the organ. */
const STAMP_LINE = 'Stamp: .agents/skills/stamp-plate/SKILL.md — one plate for this card.';

function mapEntry(id) {
  const table = overlayTable();
  const entry = table[id];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  return entry;
}

/** A plane, or a thing that has a card. */
export function isCardName(id) {
  const name = String(id || '').trim();
  if (!name || name.includes(' ')) return false;
  if (CARD_PLANES.includes(name)) return true;
  return Boolean(mapEntry(name));
}

function thingFiles(entry) {
  if (!entry) return [];
  if (Array.isArray(entry.files)) return entry.files.map(String);
  if (typeof entry.file === 'string' && entry.file.trim()) return [entry.file.trim()];
  return [];
}

function planeSpan(file) {
  const rel = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  let best = 0;
  for (const paths of Object.values(PLANE_PATHS)) {
    for (const prefix of paths) {
      if (rel === prefix || rel.startsWith(`${prefix}/`)) best = Math.max(best, prefix.length);
    }
  }
  return best;
}

export const PATH_OWNER = {
  'src/integrations/hooks/station-hook-runtime.cjs': 'station-card',
  'src/integrations/hooks/wake-cascade.cjs': 'record-map',
  'src/integrations/hooks/session-note-index.cjs': 'notes-page',
  'src/reporting/framework-reporting-system.ts': 'reporting',
  'src/inference/inference-accumulator.ts': 'inference-files',
  'src/integrations/hooks/goggles-pipeline.mjs': 'lens-gate',
};

function covers(listed, rel) {
  return rel === listed || rel.startsWith(`${listed}/`);
}

function rootsOf(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
  if (Array.isArray(entry.root)) return entry.root.map(String).filter((item) => item.trim());
  if (typeof entry.root === 'string' && entry.root.trim()) return [entry.root.trim()];
  return [];
}

function cardMatchPaths(id) {
  if (CARD_PLANES.includes(id)) return PLANE_PATHS[id] || [];
  const row = mapEntry(id);
  if (!row) return [];
  return [...thingFiles(row), ...rootsOf(row)];
}

/** Longest listed path. A root may equal the plane. A tie uses PATH_OWNER, or stays the plane. */
export function thingOfPath(file) {
  const rel = String(file || '').replace(/\\/g, '/').replace(/^\.\//, '');
  const table = overlayTable();
  let best = -1;
  const hits = [];
  for (const [id, entry] of Object.entries(table)) {
    if (CARD_PLANES.includes(id)) continue;
    const row = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null;
    if (!row) continue;
    const span = planeSpan(rel);
    const consider = (listed, floor) => {
      if (!covers(listed, rel) || listed.length < floor) return;
      if (listed.length > best) {
        best = listed.length;
        hits.length = 0;
      }
      if (listed.length === best) hits.push({ id, listed });
    };
    for (const listed of thingFiles(row)) consider(listed, span + 1);
    for (const listed of rootsOf(row)) consider(listed, span);
  }
  const ids = [];
  for (const hit of hits) {
    if (!ids.includes(hit.id)) ids.push(hit.id);
  }
  if (ids.length === 1) return ids[0];
  if (!ids.length) return '';
  const owner = PATH_OWNER[hits[0].listed];
  return owner && ids.includes(owner) ? owner : '';
}


function platePath(id) {
  if (CARD_PLANES.includes(id)) return '';
  const dir = findPlatesDir(HERE);
  if (!dir) return '';
  const abs = join(dir, `${id}.md`);
  return existsSync(abs) ? join('docs-site', 'docs', 'plates', `${id}.md`) : '';
}

function showCard(id, block) {
  if (CARD_PLANES.includes(id)) return block;
  const path = platePath(id);
  let shown = block;
  if (path && /^Plate:[ \t]*$/m.test(shown)) shown = shown.replace(/^Plate:[ \t]*$/m, `Plate: ${path}`);
  if (!path && !shown.includes('Stamp:')) shown = `${shown}\n${STAMP_LINE}`;
  return shown;
}

function readHold(root) {
  try {
    const data = JSON.parse(readFileSync(join(root, '.xray', 'state', 'goggles-plane.json'), 'utf8'));
    const named = typeof data.card === 'string' ? data.card : '';
    const plane = CARD_PLANES.includes(data.plane) ? data.plane : '';
    const card = isCardName(named) ? named : (plane || '');
    if (plane) return { plane, card: card || plane };
    if (card && CARD_PLANES.includes(card)) return { plane: card, card };
  } catch {
    /* no hold yet */
  }
  return null;
}

function planeForCard(id) {
  if (CARD_PLANES.includes(id)) return id;
  for (const file of thingFiles(mapEntry(id))) {
    const plane = planeOfPath(file);
    if (plane) return plane;
  }
  return 'dev';
}

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

function clearReading(root) {
  const file = readingPath(root);
  if (existsSync(file)) unlinkSync(file);
}

function lensRoot(projectRoot) {
  if (typeof projectRoot === 'string' && projectRoot.trim() && projectRoot.trim() !== '.') {
    return resolve(projectRoot.trim());
  }
  return stateRoot();
}

function cardRow(block, label) {
  const match = String(block || '').match(new RegExp(`^${label}:[ \t]*(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function splitRow(block, label) {
  return cardRow(block, label).split(',').map((part) => part.trim()).filter(Boolean);
}

function installedPack(root) {
  return /\/node_modules\/0xray$/.test(String(root || '').replace(/\\/g, '/'));
}

export function liveDrift(block, root) {
  if (installedPack(root)) return '';
  const files = splitRow(block, 'Files');
  const worn = cardRow(block, 'Worn');
  const held = Boolean(worn) && existsSync(join(root, worn));
  const packed = (rel) => held && (rel.startsWith('src/') || rel.startsWith('grok-bot/'));
  for (const rel of files) {
    if (existsSync(join(root, rel))) continue;
    if (packed(rel)) continue;
    return `Drift: ${rel} is not there`;
  }
  const skills = cardRow(block, 'Skills');
  if (skills.includes('/') && !existsSync(join(root, skills)) && !packed(skills)) {
    return `Drift: ${skills} is not there`;
  }
  return '';
}

function viewFromBlock(block, drift) {
  const plane = cardRow(block, 'Plane');
  return {
    card: cardRow(block, 'Card') || plane,
    plane,
    stamp: cardRow(block, 'Stamp'),
    scope: '',
    from: cardRow(block, 'From'),
    digest: cardRow(block, 'Digest'),
    plate: cardRow(block, 'Plate'),
    plates: splitRow(block, 'Plates'),
    entry: cardRow(block, 'Entry'),
    exit: cardRow(block, 'Exit'),
    files: splitRow(block, 'Files'),
    skills: cardRow(block, 'Skills'),
    setup: cardRow(block, 'Setup'),
    teardown: cardRow(block, 'Teardown'),
    worn: cardRow(block, 'Worn'),
    exam: drift || '',
  };
}

function storedCard(root, id) {
  const kept = readLensCard(root, id);
  if (kept) return kept;
  return fillLensCard(root, id);
}

function presentCard(projectRoot, id) {
  const block = storedCard(lensRoot(projectRoot), id);
  if (!block) return null;
  const shown = showCard(id, block);
  const drift = liveDrift(shown, sourceRoot(findPlatesDir(HERE)));
  return {
    text: drift ? `${shown}\n${drift}` : shown,
    view: viewFromBlock(shown, drift),
  };
}

function gogglesAnswer(argv, projectRoot, hold) {
  const words = [];
  for (const raw of argv || []) {
    const arg = String(raw || '').trim();
    if (!arg || arg.toLowerCase() === 'pop') continue;
    words.push(arg);
  }
  const lower = words.map((word) => word.toLowerCase());
  const named = cardsNamed(lower);
  const root = lensRoot(projectRoot);
  let id = '';
  if (named.length === 1) id = named[0];
  else if (words.length === 0) {
    if (hold) ensurePlane(root);
    id = currentCard(root);
  } else return { text: 'Name one plane.', cards: null };
  if (hold && named.length === 1) holdPlane(root, id);
  const card = presentCard(root, id);
  if (!card) return { text: 'Name one plane.', cards: null };
  return { text: card.text, cards: [card.view] };
}

export function readGoggles(argv, projectRoot) {
  return ok(gogglesAnswer(argv, projectRoot, true).text);
}

export function lookCards(argv, projectRoot) {
  return gogglesAnswer(argv, projectRoot, false).cards;
}

function cardsNamed(lower) {
  const found = [];
  for (const word of lower) {
    if (isCardName(word) && !found.includes(word)) found.push(word);
  }
  return found;
}

function listedFiles(plane) {
  return Array.isArray(plane.files) ? plane.files.map(String) : [];
}

function cardRows(view) {
  const rows = [];
  if (view.card && view.card !== view.plane) rows.push(['Card', view.card]);
  rows.push(
    ['Plane', view.plane],
    ['From', view.from],
    ['Digest', view.digest],
    ['Plate', view.plate],
  );
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

export function formatCardPane(view) {
  const rows = cardRows(view);
  if (typeof view.exam === 'string' && view.exam.startsWith('Drift:')) {
    rows.push(['', view.exam]);
  }
  const body = rows.map(([label, value]) => (label ? `${label.padEnd(8)} ${value}` : value).trimEnd());
  const title = view.card && view.card !== view.plane ? view.card : view.plane;
  const width = Math.max(title.length + 2, ...body.map((line) => line.length));
  const top = `┌ ${title} ${'─'.repeat(Math.max(0, width - title.length - 1))}┐`;
  const mid = body.map((line) => `│ ${line.padEnd(width)} │`);
  const bot = `└${'─'.repeat(width + 2)}┘`;
  const pane = [top, ...mid, bot].join('\n');
  return pane;
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
  if (!platesDir) return { body: '', path: '' };
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
  const listed = Array.isArray(extra.files)
    ? extra.files.map(String)
    : (typeof extra.file === 'string' && extra.file.trim() ? [extra.file.trim()] : []);
  const roots = rootsOf(extra);
  const files = [...roots.filter((item) => !listed.includes(item)), ...listed];
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

function hintLine(name) {
  const cards = lookCards([name]);
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

const SOURCE_FILE = /(?:^|[^A-Za-z0-9_])((?:src|scripts|docs-site|\.agents|grok-bot)\/[\w./-]*\.[A-Za-z0-9]+)(?=$|[^A-Za-z0-9_./-])/g;
const SOURCE_READER = /(?:^|[^A-Za-z0-9_])(?:python3|node|cat|head|tail|sed|less|more|bat|awk)(?=$|[^A-Za-z0-9_])/;
const STAMP_TARGET = /docs-site\/docs\/plates\/[a-z0-9-]+\.md|goggles-planes\.json|\.agents\/skills\/[a-z0-9-]+\/SKILL\.md|src\/memory-routing\/plates\.ts|src\/integrations\/hooks\/plates\.cjs|docs-site\/sidebars\.ts|docs-site\/docs\/plates\/index\.md/;

function isStampPath(file) {
  return STAMP_TARGET.test(String(file || '').replace(/\\/g, '/'));
}

function openedSourcePaths(text) {
  const spoken = `\n${String(text || '').replace(/\\/g, '/')}`;
  const found = [];
  for (const match of spoken.matchAll(SOURCE_FILE)) {
    const file = match[1];
    if (!file || isStampPath(file) || found.includes(file)) continue;
    found.push(file);
  }
  return found;
}

function shellReadsSource(text) {
  const spoken = String(text || '');
  return SOURCE_READER.test(spoken) && openedSourcePaths(spoken).length > 0;
}

/** One plane: the files the suit continues with. A look with no plane stops. Two planes stay quiet. */
function researchCall(toolName, text) {
  const tool = String(toolName || '');
  const spoken = String(text || '');
  if (/researcher|explorer|deep[- ]?research/i.test(tool) || DEEP_SEARCH.test(tool)) return true;
  if (/bash|shell/i.test(tool) && (/researcher|explorer|deep[- ]?research/i.test(spoken) || DEEP_SEARCH.test(spoken) || shellSearches(spoken) || shellReadsSource(spoken))) return true;
  if (/^(grep|glob)$/i.test(tool)) return true;
  return /^read_file$/i.test(tool) && !opensLensFile(spoken);
}

export function lensPlane(text) {
  const hint = suitHint(String(text || ''));
  if (hint === 'Name one plane.') return { stop: true, files: [] };
  if (!hint || hint.includes('\n')) return { stop: false, files: [] };
  const mark = hint.indexOf(': ');
  if (mark < 0) return { stop: false, files: [] };
  const files = hint.slice(mark + 2).split(',').map((part) => part.trim()).filter(Boolean);
  return { stop: false, files };
}

export function holdPlane(root, id) {
  const name = String(id || '').trim();
  if (!name || name.includes(' ') || !isCardName(name)) return;
  const plane = planeForCard(name);
  const dest = join(root, '.xray', 'state', 'goggles-plane.json');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify({ plane, card: name })}\n`);
  maintainLens(root);
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

function openPaths(text) {
  const raw = String(text || '').replace(/\\/g, '/');
  const found = [];
  const re = /(?:^|[^A-Za-z0-9_])((?:src|scripts|docs-site|\.agents|grok-bot|node_modules\/@0xray)\/[\w./@-]*|AGENTS\.md|package\.json|README\.md|\.mcp\.json)/g;
  let match = re.exec(raw);
  while (match) {
    found.push(match[1].replace(/\/+$/, ''));
    match = re.exec(raw);
  }
  return found;
}

function isSearch(tool, text) {
  const name = String(tool || '');
  const spoken = String(text || '');
  if (/researcher|explorer|deep[- ]?research/i.test(name) || DEEP_SEARCH.test(name)) return true;
  if (/semanticsearch|codebase_search/i.test(name)) return true;
  if (/^(grep|glob|rg|ripgrep)$/i.test(name)) return true;
  return /bash|shell/i.test(name) && (shellSearches(spoken) || DEEP_SEARCH.test(spoken) || /researcher|explorer|deep[- ]?research/i.test(spoken));
}

function isRead(tool, text) {
  if (/^(read_file|read)$/i.test(String(tool || ''))) return true;
  return /bash|shell/i.test(String(tool || '')) && shellReadsSource(text) && !shellSearches(text);
}

function currentPlane(root) {
  const held = readHold(root);
  if (held && CARD_PLANES.includes(held.plane)) return held.plane;
  return 'dev';
}

function currentCard(root) {
  const held = readHold(root);
  if (held && held.card) return held.card;
  return currentPlane(root);
}

function ensurePlane(root) {
  const held = readHold(root);
  if (held && CARD_PLANES.includes(held.plane)) return held.plane;
  holdPlane(root, 'dev');
  return 'dev';
}

function cardText(root, id) {
  const card = presentCard(root, id);
  return card && card.text ? card.text : '';
}

/** The current card, for the boot payload. Starts on dev. */
export function planeCard(root) {
  const plane = ensurePlane(root);
  return { plane, card: cardText(root, currentCard(root)) };
}

function targetOf(file) {
  const thing = thingOfPath(file);
  const plane = planeOfPath(file) || (thing ? planeForCard(thing) : '');
  if (!plane) return null;
  return { plane, card: thing || plane };
}

/** A search inside the current card runs. A file open follows the path. */
export function lensBeforeResearch(root, toolName, text) {
  const spoken = String(text || '');
  const searching = isSearch(toolName, spoken);
  const reading = isRead(toolName, spoken);
  if (!searching && !reading) return null;
  ensurePlane(root);
  const current = currentCard(root);
  if (searching) {
    const owned = cardMatchPaths(current);
    const paths = openPaths(spoken);
    const inside = owned.length > 0
      && paths.length > 0
      && paths.every((file) => owned.some((listed) => covers(listed, file)));
    if (inside) return null;
    return { gate: 'lens', decision: 'deny', reason: cardText(root, current) };
  }
  const targets = [];
  for (const file of openPaths(spoken)) {
    const target = targetOf(file);
    if (target && !targets.includes(target.card)) targets.push(target.card);
  }
  if (targets.length === 1 && targets[0] === current) return null;
  if (targets.length === 1) {
    holdPlane(root, targets[0]);
    return { gate: 'lens', decision: 'allow', reason: cardText(root, targets[0]) };
  }
  return { gate: 'lens', decision: 'allow', reason: cardText(root, current) };
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

export function growPlane(id, platesDir, _root) {
  const seen = seenFields(assemblePlane(id, platesDir), sourceRoot(platesDir));
  const grown = { id };
  for (const key of VIEW_KEYS) grown[key] = freshField(seen, key);
  if (id === 'ground') grown.from = '';
  const base = assemblePlane(id, platesDir);
  return { ...base, ...grown };
}

function repoRootFrom(platesDir) {
  return dirname(dirname(dirname(platesDir)));
}

function ok(text) {
  return { ok: true, text };
}

export function look(argv, projectRoot) {
  return readGoggles(argv, projectRoot);
}


function isGogglesWork(text) {
  return /(?<![A-Za-z0-9-])goggles(?![A-Za-z0-9-])/i.test(String(text || ''));
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
    if (isGogglesWork(text) && text.length <= 200) {
      clearReading(root);
      clearCardLine(root);
    }
    return null;
  } catch {
    return null;
  }
}


export function lensPath(root) {
  return join(root, '.xray', 'state', 'LENS.md');
}


function heldCardPlane(root) {
  const held = readHold(root);
  if (!held || !held.card) return null;
  return { id: held.card, scope: '' };
}

function readLensText(root) {
  try {
    return readFileSync(lensPath(root), 'utf8');
  } catch {
    return '';
  }
}

function blockId(part) {
  const card = String(part || '').match(/^Card:\s*(\S+)/m);
  if (card) return card[1];
  const plane = String(part || '').match(/^Plane:\s*(\S+)/);
  return plane ? plane[1] : '';
}

function lensCards(text) {
  const cards = new Map();
  for (const part of String(text || '').split(/\n\n/)) {
    const id = blockId(part);
    if (!id) continue;
    const block = part.replace(/\s*$/, '');
    if (!isCardName(id) && !cardIsFilled(block)) continue;
    cards.set(id, block);
  }
  return cards;
}

function cardIsFilled(block) {
  return /^Entry:/m.test(block) && /^Exit:/m.test(block);
}

function cardOrder(text, cards) {
  const order = [];
  for (const part of String(text || '').split(/\n\n/)) {
    const id = blockId(part);
    if (!id || !cards.has(id) || order.includes(id)) continue;
    order.push(id);
  }
  for (const id of cards.keys()) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

function writeLensBody(root, prev, cards) {
  const parts = [];
  for (const id of cardOrder(prev, cards)) parts.push(cards.get(id));
  mkdirSync(dirname(lensPath(root)), { recursive: true });
  writeFileSync(lensPath(root), parts.length ? `${parts.join('\n\n')}\n` : '');
}

function lensCardText(root, held) {
  const built = builtinCard(held.id);
  if (built) return built;
  const platesDir = findPlatesDir(HERE);
  const plane = growPlane(held.id, platesDir, root);
  const place = planeForCard(held.id);
  const view = {
    card: held.id,
    plane: place,
    from: place,
    digest: plane.digest || '',
    plate: plane.plate || '',
    plates: Array.isArray(plane.plates) ? plane.plates : [],
    entry: plane.entry || '',
    exit: plane.exit || '',
    files: listedFiles(plane),
    skills: plane.skills || '',
    setup: plane.setup || '',
    teardown: plane.teardown || '',
    worn: plane.worn || '',
  };
  return cardRows(view).map(([key, value]) => `${key}: ${value}`.trimEnd()).join('\n');
}

/** The stored card. Empty until Entry and Exit are in the file. */
export function readLensCard(root, id) {
  const block = lensCards(readLensText(root)).get(String(id || '').trim()) || '';
  return cardIsFilled(block) ? block : '';
}

/** Write the plane card once. A later pass reads the stored rows. */
export function fillLensCard(root, id) {
  const plane = String(id || '').trim();
  if (!isCardName(plane)) return '';
  const kept = readLensCard(root, plane);
  if (kept) return kept;
  const prev = readLensText(root);
  const cards = lensCards(prev);
  const block = lensCardText(root, { id: plane, scope: '' });
  cards.set(plane, block);
  writeLensBody(root, prev, cards);
  return block;
}

export function maintainLens(root) {
  const held = heldCardPlane(root);
  if (held) fillLensCard(root, held.id);
  const prev = readLensText(root);
  const cards = lensCards(prev);
  writeLensBody(root, prev, cards);
  return ok('');
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
  const answered = gogglesAnswer(process.argv.slice(2), undefined, true);
  const pane = process.stdout.isTTY && Array.isArray(answered.cards) && answered.cards.length > 0;
  const text = pane ? answered.cards.map((card) => formatCardPane(card)).join('\n\n') : answered.text;
  process.stdout.write(`${text}\n`);
  process.exit(0);
}
