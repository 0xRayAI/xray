/**
 * Goggles. Kind 0 name-checks the six outer names.
 * Digest and triage return one card. Empty stays empty.
 * A held plane stays quiet. A leave is denied.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const HERE = dirname(fileURLToPath(import.meta.url));
const WORN_PLANES = ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'];
const CARD_PLANES = ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting'];
const CARD_FLAVORS = ['digest', 'triage'];
const SCOPE_ZOOM = ['ecosystem', 'part', 'one flow', 'one artifact'];

function drawnPlanes() {
  try {
    const data = JSON.parse(readFileSync(join(HERE, 'goggles-planes.json'), 'utf8'));
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

function planeWord(name, text) {
  return new RegExp(`(?:^|[^A-Za-z0-9-])${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9-]|$)`, 'i').test(String(text || ''));
}

function withoutPaths(text) {
  return String(text || '').replace(/(?:[\w.@~-]+\/)+[\w.-]+/g, ' ');
}

export function organStop(held, action) {
  if (!held) return null;
  if (held.drift) return organDeny(held.drift);
  const plane = held.plane;
  if (!plane) return null;
  const text = String(action?.text || '');
  const paths = (action?.paths || []).map(String).filter(Boolean);
  const tool = String(action?.tool || '');
  if (/docs-site\/docs\/plates\/[a-z0-9-]+\.md/i.test([text, ...paths].join('\n'))) {
    return organDeny(`The reading is ${plane}. That drawing is not the plane.`);
  }
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

export function readGoggles(argv) {
  const words = [];
  for (const raw of argv || []) {
    const arg = String(raw || '').trim();
    if (!arg || arg.toLowerCase() === 'pop') continue;
    words.push(arg);
  }
  const lower = words.map((word) => word.toLowerCase());
  if (lower.includes('calling')) return ok('');
  if (kindPastOne(words)) return ok('');
  if (words.length === 0) return ok('');
  if (namesTheSet(lower)) return ok('Name one plane.');
  if (isKindZero(lower)) {
    if (findScopes(words).length) return ok('');
    if (acceptedPlanes().some((name) => lower.includes(name))) return ok('');
    return ok(actualityLine());
  }
  const flavors = CARD_FLAVORS.filter((name) => lower.includes(name));
  if (flavors.length > 1) return ok('');
  if (flavors.length === 1) {
    const others = acceptedPlanes().filter((name) => name !== flavors[0] && lower.includes(name));
    if (others.length) return ok('');
    return ok(cardLook(flavors[0], lower));
  }
  const planes = acceptedPlanes().filter((name) => lower.includes(name));
  if (planes.length !== 1) return ok('');
  const scopes = findScopes(words.filter((word) => word.toLowerCase() !== planes[0]));
  if (scopes.length > 1) return ok('');
  return ok(readingLine(planes[0], scopes[0] || ''));
}

function cardPlanesNamed(lower) {
  return CARD_PLANES.filter((name) => lower.includes(name));
}

function fileList(plane) {
  const files = Array.isArray(plane.files) ? plane.files : [];
  const unpathed = Array.isArray(plane.unpathed) ? plane.unpathed : [];
  const parts = [...files];
  for (const name of unpathed) {
    parts.push(name === 'mill' ? 'mill has no path' : name);
  }
  return parts.join(', ');
}

function cardRows(plane, scope) {
  const files = Array.isArray(plane.files) ? plane.files : [];
  if (scope === 'one artifact' && files.length !== 1) return null;
  const rows = [
    ['Plane', plane.id],
    ['From', plane.id === 'ground' ? '' : 'ground'],
    ['Digest', plane.digest || ''],
    ['Plate', plane.plate || ''],
    ['Entry', plane.entry || ''],
    ['Exit', plane.exit || ''],
    ['Files', scope === 'one artifact' ? files[0] : fileList(plane)],
    ['Skills', plane.skills || ''],
    ['Setup', plane.setup || ''],
    ['Teardown', plane.teardown || ''],
    ['Worn', plane.worn || ''],
  ];
  if (scope === 'one flow' || scope === 'one artifact') {
    return rows.filter(([key]) => key === 'Plane' || key === 'Digest' || key === 'Files');
  }
  return rows;
}

function triageNote(plane, root) {
  const filled = new Set(filledOf(plane));
  const empty = FIELD_ORDER.filter((name) => !filled.has(name));
  const exam = examinePlane(plane, root);
  const lines = [];
  if (empty.length) lines.push(`Empty: ${empty.join(', ')}`);
  lines.push(exam.text);
  return lines.join('\n');
}

function formatPlaneCard(plane, scope, flavor, root) {
  const rows = cardRows(plane, scope);
  if (!rows) return null;
  let text = rows.map(([key, value]) => `${key}: ${value}`.trimEnd()).join('\n');
  if (flavor === 'triage') text = `${text}\n${triageNote(plane, root)}`;
  return text;
}

function cardLook(flavor, lower) {
  const named = cardPlanesNamed(lower);
  const scopes = findScopes(lower.filter((word) => word !== flavor && !named.includes(word)));
  if (named.length > 1 || scopes.length > 1) return '';
  const scope = scopes[0] || '';
  if (!named.length && (scope === 'part' || scope === 'one flow' || scope === 'one artifact')) return '';
  const platesDir = findPlatesDir(HERE);
  if (!platesDir) return '';
  const ids = named.length ? named : CARD_PLANES;
  const root = repoRootFrom(platesDir);
  const blocks = [];
  for (const id of ids) {
    const plane = assemblePlane(id, platesDir);
    if (!plane) continue;
    const text = formatPlaneCard(plane, scope, flavor, root);
    if (text === null) return '';
    blocks.push(text);
  }
  return blocks.join('\n\n');
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
  const file = join(HERE, 'goggles-planes.json');
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

export function assemblePlane(id, platesDir) {
  const extra = overlayTable()[id] || {};
  let plate = null;
  let digest = extra.digest || '';
  let doors = { entry: null, exit: null };
  if (id !== 'ground') {
    const abs = join(platesDir, `${id}.md`);
    if (!existsSync(abs)) return null;
    const raw = readFileSync(abs, 'utf8');
    plate = join('docs-site', 'docs', 'plates', `${id}.md`);
    if (!digest) digest = takeOf(stripFrontmatter(raw));
    doors = doorsOf(raw);
  }
  if (!digest) return null;
  return {
    id,
    digest,
    plate,
    entry: extra.entry || doors.entry || null,
    exit: extra.exit || doors.exit || null,
    entryIsMark: Boolean(extra.entry),
    exitIsMark: Boolean(extra.exit),
    files: extra.files || null,
    unpathed: extra.unpathed || null,
    skills: extra.skills || null,
    setup: extra.setup || null,
    teardown: extra.teardown || null,
    worn: extra.worn || null,
    mark: extra.mark || null,
    wornMark: extra.wornMark || null,
    pick: extra.pick || null,
  };
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


function examinePlane(plane, root) {
  const files = Array.isArray(plane.files) ? plane.files : [];
  const checkable = files.length > 0 || plane.skills || plane.worn;
  if (!checkable) return drawing();
  for (const rel of files) {
    if (!existsSync(join(root, rel))) return drift(`${rel} is not there`);
  }
  if (plane.mark && !fileHas(root, files[0], plane.mark)) {
    return drift(`${plane.mark} is not in ${files[0]}`);
  }
  if (plane.worn && !fileHas(root, plane.worn, plane.wornMark || plane.mark)) {
    return drift(`the worn build is not ${files[0] || plane.worn}`);
  }
  if (plane.skills && !existsSync(join(root, plane.skills))) {
    return drift(`${plane.skills} is not there`);
  }
  if (plane.entryIsMark && plane.entry && files[0] && !fileHas(root, files[0], plane.entry)) {
    return drift(`${plane.entry} is not in ${files[0]}`);
  }
  if (plane.exitIsMark && plane.exit && files[0] && !fileHas(root, files[0], plane.exit)) {
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
  const raw = [String(text || ''), ...(paths || [])].join('\n');
  if (isGogglesWork(raw)) {
    clearReading(root);
    clearCardLine(root);
    return null;
  }
  const held = loadReading(root);
  if (!held) return null;
  const drift = actualityLine();
  if (drift) return organDeny(drift);
  return organStop(held, { tool: toolName, text, paths });
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

export function handCard(root, intent) {
  try {
    clearCardLine(root);
    const text = String(intent || '');
    if (isGogglesWork(text)) {
      clearReading(root);
      return null;
    }
    const words = intentWords(text);
    const looked = readGoggles(words);
    if (looked.text.startsWith('Actuality. Drift')) {
      saveReading(root, { drift: looked.text });
      return null;
    }
    const planes = acceptedPlanes().filter((name) => words.includes(name));
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
  const text = actualityLine();
  mkdirSync(dirname(lensPath(root)), { recursive: true });
  writeFileSync(lensPath(root), `${text}\n`);
  return ok(text);
}


const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = readGoggles(process.argv.slice(2));
  process.stdout.write(`${result.text}\n`);
  process.exit(result.ok ? 0 : 1);
}
