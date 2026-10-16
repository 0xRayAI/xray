/**
 * Goggles. A named card plane returns its stored card.
 * The card is written once, when Entry and Exit are missing.
 * Later looks read that card. A hand edit stays.
 * A missing file is one live line. It is not stored.
 * Any other look says Name one plane.
 * On this host a search is grep, glob, or a shell that runs one.
 * A shell that reads a project source file is a search.
 * The lens file stays open. One later read may go on, then the next read stops.
 * An opened source file that no lens lists is remembered.
 * The next search stops until that file is on a lens and its plate is on disk.
 * The hook does not author the plate.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const HERE = dirname(fileURLToPath(import.meta.url));
/** Map names. A look does not answer them. Their files stay on the lens. */
const WORN_PLANES = ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'];
export const CARD_PLANES = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting', 'stamp-plate', 'record-map', 'write-home', 'activity-log', 'session-capture', 'suit-wear', 'suit-organs', 'station-card', 'notes-page', 'reflection-page', 'site-manual', 'package-face', 'suit-settings', 'trail-state', 'inference-files', 'grok-compact', 'payload-heat', 'station-heat', 'pickup-stamp', 'cursor-compact', 'work-fresh', 'kept-line', 'lens-gate', 'pre-tool', 'lens-page', 'centrifuge'];

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

function liveDrift(block, root) {
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
  return {
    plane: cardRow(block, 'Plane'),
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
  const drift = liveDrift(block, sourceRoot(findPlatesDir(HERE)));
  return {
    text: drift ? `${block}\n${drift}` : block,
    view: viewFromBlock(block, drift),
  };
}

function gogglesAnswer(argv, projectRoot) {
  const words = [];
  for (const raw of argv || []) {
    const arg = String(raw || '').trim();
    if (!arg || arg.toLowerCase() === 'pop') continue;
    words.push(arg);
  }
  const lower = words.map((word) => word.toLowerCase());
  const named = cardPlanesNamed(lower);
  if (named.length !== 1) return { text: 'Name one plane.', cards: null };
  const card = presentCard(projectRoot, named[0]);
  if (!card) return { text: 'Name one plane.', cards: null };
  return { text: card.text, cards: [card.view] };
}

export function readGoggles(argv, projectRoot) {
  return ok(gogglesAnswer(argv, projectRoot).text);
}

export function lookCards(argv, projectRoot) {
  return gogglesAnswer(argv, projectRoot).cards;
}

function cardPlanesNamed(lower) {
  return CARD_PLANES.filter((name) => lower.includes(name));
}

function listedFiles(plane) {
  return Array.isArray(plane.files) ? plane.files.map(String) : [];
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

export function formatCardPane(view) {
  const rows = cardRows(view);
  if (typeof view.exam === 'string' && view.exam.startsWith('Drift:')) {
    rows.push(['', view.exam]);
  }
  const body = rows.map(([label, value]) => (label ? `${label.padEnd(8)} ${value}` : value).trimEnd());
  const title = view.plane;
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

function isLensWrite(toolName) {
  return /write|edit|replace/i.test(String(toolName || ''));
}

function debtFile(root) {
  return join(root, '.xray', 'state', 'goggles-lens-debt.json');
}

function loadDebt(root) {
  try {
    const data = JSON.parse(readFileSync(debtFile(root), 'utf8'));
    return Array.isArray(data.paths) ? data.paths.filter((file) => typeof file === 'string') : [];
  } catch {
    return [];
  }
}

function saveDebt(root, paths) {
  const unique = [];
  for (const file of paths) {
    if (!unique.includes(file)) unique.push(file);
  }
  const dest = debtFile(root);
  if (!unique.length) {
    try {
      unlinkSync(dest);
    } catch {
      /* already clear */
    }
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify({ paths: unique })}\n`);
}

function lensRecords() {
  try {
    const data = JSON.parse(readFileSync(planesFile(), 'utf8'));
    const records = [];
    if (!data || typeof data !== 'object') return records;
    for (const [name, entry] of Object.entries(data)) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      if (!Array.isArray(entry.files)) continue;
      records.push([name, entry.files.filter((file) => typeof file === 'string')]);
    }
    return records;
  } catch {
    return [];
  }
}

function plateIsOnDisk(root, name) {
  const beside = findPlatesDir(HERE);
  if (beside && existsSync(join(beside, `${name}.md`))) return true;
  return existsSync(join(root, 'docs-site', 'docs', 'plates', `${name}.md`));
}

function lensCovers(root, file) {
  for (const [name, files] of lensRecords()) {
    if (!files.includes(file)) continue;
    if (name === 'ground' || plateIsOnDisk(root, name)) return true;
  }
  return false;
}

function unsettledDebt(root) {
  const prior = loadDebt(root);
  const kept = prior.filter((file) => !lensCovers(root, file));
  if (kept.length !== prior.length) saveDebt(root, kept);
  return kept;
}

function rememberOpened(root, text) {
  const fresh = openedSourcePaths(text).filter((file) => !lensCovers(root, file));
  if (!fresh.length) return;
  saveDebt(root, [...loadDebt(root), ...fresh]);
}

function debtReason(paths) {
  return `Opened ${paths.join(', ')} has no lens.`;
}

function researchCall(toolName, text) {
  const tool = String(toolName || '');
  const spoken = String(text || '');
  if (/researcher|explorer|deep[- ]?research/i.test(tool) || DEEP_SEARCH.test(tool)) return true;
  if (/bash|shell/i.test(tool) && (/researcher|explorer|deep[- ]?research/i.test(spoken) || DEEP_SEARCH.test(spoken) || shellSearches(spoken) || shellReadsSource(spoken))) return true;
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

export function holdPlane(root, id) {
  const plane = String(id || "").trim();
  if (!plane || plane.includes(" ")) return;
  const dest = join(root, ".xray", "state", "goggles-plane.json");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify({ plane })}\n`);
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

/** Name one plane and the tool continues. Name none, or more than one, and the search stops. */
export function lensBeforeResearch(root, toolName, text) {
  const spoken = String(text || '');
  const openDebt = unsettledDebt(root);
  const research = researchCall(toolName, spoken);
  if (openDebt.length && research) {
    return { gate: 'lens', decision: 'deny', reason: debtReason(openDebt) };
  }
  if (openDebt.length && isLensWrite(toolName) && !isStampPath(spoken)) {
    return { gate: 'lens', decision: 'deny', reason: debtReason(openDebt) };
  }
  if (!research) return null;
  const names = CARD_PLANES.filter((name) => intentWords(spoken).includes(name));
  if (names.length === 1) {
    holdPlane(root, names[0]);
    stampPlane(root, names[0]);
    rememberOpened(root, spoken);
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
  const reading = loadReading(root);
  if (reading && !reading.drift && CARD_PLANES.includes(reading.plane)) {
    return { id: reading.plane, scope: reading.scope || '' };
  }
  try {
    const data = JSON.parse(readFileSync(join(root, '.xray', 'state', 'goggles-plane.json'), 'utf8'));
    const plane = data && typeof data.plane === 'string' ? data.plane : '';
    if (CARD_PLANES.includes(plane)) return { id: plane, scope: '' };
  } catch {
    /* no held plane */
  }
  return null;
}

function readLensText(root) {
  try {
    return readFileSync(lensPath(root), 'utf8');
  } catch {
    return '';
  }
}

function lensCards(text) {
  const cards = new Map();
  for (const part of String(text || '').split(/\n\n/)) {
    const match = part.match(/^Plane:\s*(\S+)/);
    if (!match || !CARD_PLANES.includes(match[1])) continue;
    cards.set(match[1], part.replace(/\s*$/, ''));
  }
  return cards;
}

function cardIsFilled(block) {
  return /^Entry:/m.test(block) && /^Exit:/m.test(block);
}

function cardOrder(text, cards) {
  const order = [];
  for (const part of String(text || '').split(/\n\n/)) {
    const match = part.match(/^Plane:\s*(\S+)/);
    if (!match || !cards.has(match[1]) || order.includes(match[1])) continue;
    order.push(match[1]);
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
  const platesDir = findPlatesDir(HERE);
  const plane = growPlane(held.id, platesDir, root);
  const view = {
    plane: plane.id,
    from: plane.id === 'ground' ? '' : (plane.from || 'ground'),
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
  if (!CARD_PLANES.includes(plane)) return '';
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
  const answered = gogglesAnswer(process.argv.slice(2));
  const pane = process.stdout.isTTY && Array.isArray(answered.cards) && answered.cards.length > 0;
  const text = pane ? answered.cards.map((card) => formatCardPane(card)).join('\n\n') : answered.text;
  process.stdout.write(`${text}\n`);
  process.exit(0);
}
