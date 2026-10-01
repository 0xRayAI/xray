/**
 * Goggles. One machine over a plane body.
 * A plane is data: the same fields, empty when absent.
 * Peer writes a scratch. Examine checks only that scratch against disk.
 * Triage picks one line that is already in a file, or none. Cascade opens that line.
 * Teardown deletes the scratch. A depth number is not a look.
 * A pop with no name is a glimpse of every plane.
 * A pop of a plane returns its card, how to get up to speed, and how to deep dive.
 * The outcome is one kind for that plane, related to the plane it came from.
 * A pop of one field returns that field. An empty field stays empty.
 * A slow look opens a plane only when that name was already popped.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const LOOKS = new Set(['peer', 'examine', 'triage', 'cascade']);
const NOT_PLANES = new Set(['domain', 'eco', 'outer', 'outer-loop']);
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

function frontmatter(raw) {
  return /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
}

function plateType(raw) {
  return /^plate_type:\s*(.+?)\s*$/m.exec(frontmatter(raw))?.[1] ?? '';
}

function stripFrontmatter(raw) {
  return String(raw).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

function cleanTitle(title) {
  return title.replace(/\s+v\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
}

export function cascadeOf(body) {
  const lines = String(body).split(/\r?\n/);
  const stages = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes('┌')) continue;
    const header = lines[i + 1] ?? '';
    const match = header.match(/│\s*([^│]*?)\s*│/);
    if (!match) continue;
    const title = cleanTitle(match[1]);
    if (!title || title.startsWith('·')) continue;
    stages.push(title);
  }
  const layers = stages
    .map((title) => title.match(/\b([A-Z][A-Z ]*?LAYER)\b/)?.[1]?.trim() ?? '')
    .filter(Boolean);
  return layers.length ? layers : stages;
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

export function listPipelineIds(platesDir) {
  if (!platesDir) return [];
  const ids = [];
  for (const name of readdirSync(platesDir)) {
    if (!name.endsWith('.md') || name === 'index.md') continue;
    const raw = readFileSync(join(platesDir, name), 'utf8');
    if (plateType(raw) === 'domain model') continue;
    const id = name.slice(0, -3);
    if (cascadeOf(stripFrontmatter(raw)).length === 0) continue;
    ids.push(id);
  }
  ids.sort();
  return ids;
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

function formatPeer(rec) {
  const filled = Array.isArray(rec.filled) ? rec.filled : [];
  return [`From: ${rec.from}`, `Digest: ${rec.digest}`, `Filled: ${filled.join(', ')}`].join('\n');
}

function formatLens(rec) {
  const lines = [formatPeer(rec)];
  if (rec.examineText) lines.push(rec.examineText);
  if (rec.triage) lines.push(rec.triage);
  return lines.join('\n');
}

function blankStep(rec) {
  return { ...rec, examine: null, examineText: null, triage: null, stop: true };
}

function peerRec(plane) {
  const who = plane.id === 'ground' ? 'ground' : `pipeline/${plane.id}`;
  return blankStep({
    from: 'ground',
    digest: plane.digest,
    filled: filledOf(plane),
    plane: who,
    id: plane.id,
    itemFile: null,
  });
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

function sourceLine(root, plane) {
  if (!plane.pick || !Array.isArray(plane.files) || !plane.files[0]) return null;
  const full = join(root, plane.files[0]);
  if (!existsSync(full)) return null;
  const line = readFileSync(full, 'utf8')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.includes(plane.pick));
  return line || null;
}

function triageOf(exam, plane, root) {
  if (exam.kind === 'drawing') return { stop: true, text: 'Pick: none', line: null };
  if (exam.kind === 'drift') {
    return { stop: true, text: `Pick: ${exam.text.slice('Drift: '.length)}`, line: null };
  }
  const line = sourceLine(root, plane);
  if (plane.pick && line) return { stop: false, text: `Pick: ${plane.pick}`, line };
  return { stop: true, text: 'Pick: none', line: null };
}

function readScratch(file) {
  if (!file || !existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || !data.digest) return null;
    return data;
  } catch {
    return null;
  }
}

function fileStore(file) {
  return {
    load() {
      return readScratch(file);
    },
    save(rec) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify(rec, null, 2)}\n`);
    },
    clear() {
      if (existsSync(file)) unlinkSync(file);
    },
  };
}

function memStore() {
  let rec = null;
  return {
    load() {
      return rec;
    },
    save(next) {
      rec = next;
    },
    clear() {
      rec = null;
    },
  };
}

function examineRec(rec, platesDir, root) {
  if (rec.itemFile) {
    return fileHas(root, rec.itemFile, rec.digest)
      ? holds()
      : drift(`the line is not in ${rec.itemFile}`);
  }
  const plane = assemblePlane(rec.id, platesDir);
  if (!plane) return drift(`${rec.id} is not a plane`);
  const filled = new Set(rec.filled || []);
  if (!filled.has('files') && !filled.has('skills') && !filled.has('worn') && !filled.has('entry') && !filled.has('exit')) {
    return drawing();
  }
  return examinePlane(plane, root);
}

export function parseLook(argv) {
  const words = [];
  for (const raw of argv) {
    const arg = String(raw || '').trim();
    if (!arg) continue;
    if (/^\d+$/.test(arg)) {
      return { error: 'A depth number is not a look. Looks: peer, examine, triage, cascade.' };
    }
    words.push(arg);
  }
  if (words.length === 0) return { error: 'Name one plane: ground, pipeline.' };
  const head = words[0];
  if (NOT_PLANES.has(head)) return { error: 'Not a plane yet. Planes: ground, pipeline.' };
  let look = 'peer';
  const tail = words[words.length - 1];
  if (LOOKS.has(tail) && words.length > 1) {
    look = tail;
    words.pop();
  }
  if (words.length === 1 && LOOKS.has(words[0])) {
    return { error: 'Name one plane: ground, pipeline.' };
  }
  if (head === 'ground' || head === 'pipeline') {
    if (words.length > 2) return { error: 'Name one pipeline.' };
    return { plane: head, one: words[1] || '', look };
  }
  if (words.length > 1) return { error: 'Name one pipeline.' };
  return { plane: 'pipeline', one: head, look };
}

function resolvePlane(parsed, platesDir) {
  if (parsed.plane === 'ground') {
    if (parsed.one) return miss(`Triage did not name ${parsed.one}.`);
    const plane = assemblePlane('ground', platesDir);
    return plane ? { ok: true, plane } : miss('Ground has no digest.');
  }
  const ids = listPipelineIds(platesDir);
  if (!parsed.one || !ids.includes(parsed.one)) return miss(`Name one pipeline: ${ids.join(', ')}.`);
  const plane = assemblePlane(parsed.one, platesDir);
  return plane ? { ok: true, plane } : miss(`${parsed.one} has no digest.`);
}

function step(word, platesDir, root, store) {
  const rec = store.load();
  if (!rec) return miss('The scratch is empty.');
  if (word === 'examine') {
    const exam = examineRec(rec, platesDir, root);
    store.save({ ...rec, examine: exam.kind, examineText: exam.text, triage: null, stop: true });
    return ok(exam.text);
  }
  if (!rec.examine) return miss('Examine first.');
  const plane = rec.itemFile ? null : assemblePlane(rec.id, platesDir);
  const exam = { kind: rec.examine, text: rec.examineText };
  const triage = plane
    ? triageOf(exam, plane, root)
    : { stop: true, text: 'Pick: none', line: null };
  if (word === 'triage') {
    store.save({ ...rec, triage: triage.text, stop: triage.stop });
    return ok(triage.text);
  }
  if (!rec.triage) return miss('Triage first.');
  if (rec.stop || triage.stop || !triage.line || !plane || !plane.files || !plane.files[0]) {
    return ok('No cascade.');
  }
  const child = blankStep({
    from: rec.plane,
    digest: triage.line,
    filled: [],
    plane: `${rec.plane}/${plane.pick}`,
    id: plane.id,
    itemFile: plane.files[0],
  });
  store.save(child);
  return ok(formatPeer(child));
}

function lookedName(parsed) {
  if (parsed.plane === 'ground') return 'ground';
  return parsed.one || '';
}

export function cycle(argv, platesDir, scratchPath, store = scratchPath ? fileStore(scratchPath) : memStore(), popsPath = null) {
  const words = (Array.isArray(argv) ? argv : []).map((raw) => String(raw || '').trim()).filter(Boolean);
  const popsFile = popsPathBeside(scratchPath, popsPath);
  if (words[0] === 'pop') return runPop(words.slice(1), popsFile, platesDir);
  const continues = words.length === 1 && (words[0] === 'teardown' || (LOOKS.has(words[0]) && words[0] !== 'peer'));
  if (!continues) {
    const parsed = parseLook(words);
    if (parsed.error) return miss(parsed.error);
    const name = lookedName(parsed);
    if (name && !hasPop(loadPops(popsFile), name)) return ok('Empty.');
  }
  const root = repoRootFrom(platesDir);
  if (words.length === 1 && words[0] === 'teardown') {
    const rec = store.load();
    store.clear();
    const digest = rec && rec.digest ? rec.digest : '';
    return ok(digest ? `Ground.\n${digest}` : 'Ground.');
  }
  if (words.length === 1 && LOOKS.has(words[0]) && words[0] !== 'peer') {
    return step(words[0], platesDir, root, store);
  }
  const parsed = parseLook(words);
  const resolved = resolvePlane(parsed, platesDir);
  if (!resolved.ok) return resolved;
  const rec = peerRec(resolved.plane);
  store.save(rec);
  if (parsed.look === 'peer') return ok(formatPeer(rec));
  return step(parsed.look, platesDir, root, store);
}

export function look(argv) {
  return readGoggles(argv);
}

export function scratchFileFor(root) {
  return join(root, '.xray', 'state', 'goggles-scratch.json');
}

export function popsFileFor(root) {
  return join(root, '.xray', 'state', 'pops.json');
}

function isGogglesWork(text) {
  return /(?<![A-Za-z0-9-])goggles(?![A-Za-z0-9-])/i.test(String(text || ''));
}

function isSearch(toolName, text) {
  const tool = String(toolName || '');
  if (/web_/i.test(tool)) return false;
  if (/grep|search|glob/i.test(tool)) return true;
  return /^\s*(rg|grep|find)\b/.test(String(text || ''));
}

function isRead(toolName) {
  return /read|open/i.test(String(toolName || ''));
}

function isPlateOpen(toolName, text, paths) {
  if (!isRead(toolName)) return false;
  return /\/plates\/[a-z0-9-]+\.md/i.test([text, ...(paths || [])].join('\n'));
}

function planeWord(name, text) {
  return new RegExp(`(?:^|[^A-Za-z0-9-])${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^A-Za-z0-9-]|$)`, 'i').test(String(text || ''));
}

function knownPlaneIds() {
  try {
    const file = join(dirname(fileURLToPath(import.meta.url)), 'goggles-planes.json');
    return Object.keys(JSON.parse(readFileSync(file, 'utf8'))).filter((name) => name !== 'ground');
  } catch {
    return [];
  }
}

function storedAction(row) {
  const lines = [];
  if (row && row.feat) lines.push(`feat: ${row.feat}`);
  if (row && row.fix) lines.push(`fix: ${row.fix}`);
  for (const [kind, value] of Object.entries((row && row.outcomes) || {})) {
    if (value && value.line) lines.push(`${kind}: ${value.line}`);
  }
  return lines.join(' ');
}

function openTarget(row) {
  const dive = diveText(row);
  return dive ? dive.replace(/^(files|plate|worn):\s*/, '') : '';
}

function hasPath(hay, open) {
  if (!hay || !open) return false;
  let from = 0;
  while (from < hay.length) {
    const at = hay.indexOf(open, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : hay[at - 1];
    const after = hay[at + open.length] || '';
    const beforeOk = before === '' || /[\s'"`=/]/.test(before);
    const afterOk = after === '' || /[\s'"`]/.test(after);
    if (beforeOk && afterOk) return true;
    from = at + open.length;
  }
  return false;
}

function pointsAt(text, paths, open) {
  if (!open) return false;
  return [text, ...(paths || [])].some((item) => hasPath(String(item || ''), open));
}

function planeNamesIn(plates, text) {
  const names = new Set(knownPlaneIds());
  for (const id of listPipelineIds(plates)) names.add(id);
  names.delete('ground');
  return [...names].filter((name) => planeWord(name, text));
}

function prepareRow(root, name, plates) {
  const file = popsFileFor(root);
  const pops = loadPops(file);
  const row = { ...(pops.planes[name] || {}) };
  const held = holdPlane(file, pops, name, row, plates);
  if (!held || !held.card) return null;
  ensureUseful(file, pops, name, held, plates);
  return loadPops(file).planes[name] || held;
}

function reasonFor(name, row) {
  const card = row.card;
  const filled = card.filled && card.filled.length ? card.filled.join(', ') : 'none';
  const open = openTarget(row);
  return `${name}. From: ${card.from}. Digest: ${card.digest} Filled: ${filled}. Open: ${open || 'Empty.'}`;
}

function denyCard(name, row) {
  return { gate: 'goggles', decision: 'deny', reason: reasonFor(name, row) };
}

function denyLine(line) {
  return { gate: 'goggles', decision: 'deny', reason: line };
}

function allowRewrite(updatedInput) {
  return {
    gate: 'goggles',
    decision: 'allow',
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput,
    },
  };
}

const PLATE_FILE = /\/plates\/[a-z0-9-]+\.md/i;
const PATH_KEYS = ['path', 'file_path', 'target_file', 'target_notebook'];

function retarget(toolInput, open) {
  if (!toolInput || typeof toolInput !== 'object' || Array.isArray(toolInput)) return null;
  const next = { ...toolInput };
  let hit = false;
  for (const key of PATH_KEYS) {
    if (typeof next[key] === 'string' && PLATE_FILE.test(next[key])) {
      next[key] = open;
      hit = true;
    }
  }
  if (Array.isArray(next.paths)) {
    const rewritten = next.paths.map((item) => (PLATE_FILE.test(String(item)) ? open : item));
    if (rewritten.some((item, index) => item !== next.paths[index])) {
      next.paths = rewritten;
      hit = true;
    }
  }
  return hit ? next : null;
}

function saveRow(root, name, row) {
  const file = popsFileFor(root);
  const pops = loadPops(file);
  pops.planes[name] = storedRow(row);
  savePops(file, pops);
}

function markOpened(root, name) {
  const row = loadPops(popsFileFor(root)).planes[name];
  if (!row || row.opened) return;
  row.opened = true;
  saveRow(root, name, row);
}

function markFollowed(root, name) {
  const row = loadPops(popsFileFor(root)).planes[name];
  if (!row || row.followed) return;
  row.followed = true;
  saveRow(root, name, row);
}

function actOnRow(root, name, row, toolName, text, raw, paths, toolInput) {
  const open = openTarget(row);
  const aimed = Boolean(open && pointsAt(raw, paths, open));
  if (isPlateOpen(toolName, raw, paths) && open && !aimed) {
    const updated = retarget(toolInput, open);
    if (!updated) return denyCard(name, row);
    markOpened(root, name);
    return allowRewrite(updated);
  }
  if (aimed) {
    markOpened(root, name);
    return null;
  }
  if (!row.opened) return denyCard(name, row);
  const action = storedAction(row);
  if (action && !row.followed) {
    markFollowed(root, name);
    return denyLine(action);
  }
  if (isSearch(toolName, text) || isPlateOpen(toolName, raw, paths)) return denyCard(name, row);
  return null;
}

function cardNameOnStation(root) {
  const dest = stationFile(root);
  if (!existsSync(dest)) return '';
  const line = readFileSync(dest, 'utf8').split(/\r?\n/).find((row) => /^Card:\s/i.test(row.trim()));
  if (!line) return '';
  const match = /^Card:\s*([a-z0-9-]+)\./i.exec(line.trim());
  return match ? match[1] : '';
}

function pendingFollow(root) {
  const pops = loadPops(popsFileFor(root));
  const names = Object.entries(pops.planes || {})
    .filter(([, row]) => row && row.card && row.opened && storedAction(row) && !row.followed)
    .map(([name]) => name);
  return names.length === 1 ? names[0] : '';
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

function setCardLine(root, line) {
  const dest = stationFile(root);
  mkdirSync(dirname(dest), { recursive: true });
  const prev = existsSync(dest) ? readFileSync(dest, 'utf8') : '# Station\n';
  const rows = withoutCardLines(prev).replace(/\s*$/, '').split(/\r?\n/);
  const marker = rows.findIndex((row) => row.startsWith('Continue this card.'));
  const at = marker === -1 ? rows.length : marker;
  const block = [];
  if (at === 0 || rows[at - 1] !== '') block.push('');
  block.push(line);
  block.push('');
  rows.splice(at, 0, ...block);
  const text = rows.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '');
  writeFileSync(dest, `${text}\n`);
}

function disarm(root) {
  const file = popsFileFor(root);
  const pops = loadPops(file);
  let changed = false;
  for (const [name, row] of Object.entries(pops.planes || {})) {
    if (!row || !row.opened || row.followed || !storedAction(row)) continue;
    row.followed = true;
    pops.planes[name] = storedRow(row);
    changed = true;
  }
  if (changed) savePops(file, pops);
  clearCardLine(root);
}

function arm(root, name) {
  const row = loadPops(popsFileFor(root)).planes[name];
  if (!row) return;
  row.opened = false;
  row.followed = false;
  saveRow(root, name, row);
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

function popsPathBeside(scratchPath, explicit) {
  if (explicit) return explicit;
  if (!scratchPath) return null;
  return join(dirname(scratchPath), 'pops.json');
}

const POP_KINDS = ['facet', 'feat', 'fix', 'none'];
const CARD_FIELDS = ['from', 'digest', 'plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const SPEED_FIELDS = ['entry', 'setup', 'skills'];
const DIVE_FIELDS = ['files', 'plate', 'worn'];

function keepRow(raw) {
  const kept = {};
  for (const kind of POP_KINDS) {
    const line = popLine(raw && raw[kind]);
    if (line) kept[kind] = line;
  }
  return kept;
}

function readOutcomes(raw) {
  const src = raw && raw.outcomes && typeof raw.outcomes === 'object' ? raw.outcomes : null;
  if (!src) return null;
  const outcomes = {};
  for (const [name, value] of Object.entries(src)) {
    const key = popName(name);
    if (!key || POP_KINDS.includes(key) || CARD_FIELDS.includes(key) || key === 'speed' || key === 'dive') continue;
    const line = popLine(value && value.line);
    if (!line) continue;
    outcomes[key] = { line, from: popLine(value && value.from) };
  }
  return Object.keys(outcomes).length ? outcomes : null;
}

function storedRow(row) {
  const kept = keepRow(row);
  if (row.card) kept.card = row.card;
  if (row.fields && Object.keys(row.fields).length) kept.fields = row.fields;
  const outcomes = readOutcomes(row);
  if (outcomes) kept.outcomes = outcomes;
  if (row.opened === true) kept.opened = true;
  if (row.followed === true) kept.followed = true;
  return kept;
}

function popLine(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function hasPop(pops, name) {
  const row = pops.planes[name];
  if (!row) return false;
  if (row.card || (row.fields && Object.keys(row.fields).length) || (row.outcomes && Object.keys(row.outcomes).length)) return true;
  return POP_KINDS.some((kind) => row[kind]);
}

function readCard(raw) {
  if (!raw || !raw.card || typeof raw.card !== 'object') return null;
  const digest = popLine(raw.card.digest);
  if (!digest) return null;
  const filled = Array.isArray(raw.card.filled)
    ? raw.card.filled.map((name) => String(name)).filter((name) => CARD_FIELDS.includes(name))
    : [];
  return { from: popLine(raw.card.from) || 'ground', digest, filled };
}

function readFields(raw) {
  const src = raw && raw.fields && typeof raw.fields === 'object' ? raw.fields : {};
  const fields = {};
  for (const name of CARD_FIELDS) {
    const line = popLine(src[name]);
    if (line) fields[name] = line;
  }
  return fields;
}

function loadPops(file) {
  const empty = { planes: {} };
  if (!file || !existsSync(file)) return empty;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const planes = {};
    const rawPlanes = data && data.planes && typeof data.planes === 'object' ? data.planes : null;
    if (rawPlanes) {
      for (const [name, raw] of Object.entries(rawPlanes)) {
        const key = popName(name);
        if (!key || !raw || typeof raw !== 'object') continue;
        const row = keepRow(raw);
        const card = readCard(raw);
        const fields = readFields(raw);
        if (card) row.card = card;
        if (Object.keys(fields).length) row.fields = fields;
        const outcomes = readOutcomes(raw);
        if (outcomes) row.outcomes = outcomes;
        if (raw.opened === true) row.opened = true;
        if (raw.followed === true) row.followed = true;
        if (row.card || row.fields || row.outcomes || row.opened || POP_KINDS.some((kind) => row[kind])) planes[key] = row;
      }
      return { planes };
    }
    const rawFacets = data && data.facets && typeof data.facets === 'object' ? data.facets : {};
    for (const [name, facet] of Object.entries(rawFacets)) {
      const key = popName(name);
      const line = popLine(facet);
      if (!key || !line) continue;
      planes[key] = { facet: line };
    }
    return { planes };
  } catch {
    return empty;
  }
}

function savePops(file, pops) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ planes: pops.planes }, null, 2)}\n`);
}

function ensurePopTable(file) {
  if (!file || existsSync(file)) return;
  savePops(file, { planes: {} });
}

function settlePopTable(file) {
  ensurePopTable(file);
  if (!file || !existsSync(file)) return;
  if (Object.keys(loadPops(file).planes).length) return;
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    if (raw && raw.planes) return;
  } catch {
    return;
  }
  savePops(file, { planes: {} });
}

function popName(name) {
  return /^[a-z0-9][a-z0-9-]*$/i.test(String(name || '')) ? String(name) : '';
}

function planeOf(platesDir, name) {
  if (!platesDir) return null;
  const parsed = parseLook([name]);
  if (parsed.error) return null;
  const resolved = resolvePlane(parsed, platesDir);
  if (!resolved.ok || !resolved.plane) return null;
  return resolved.plane;
}

function snapshotOf(plane) {
  return { from: 'ground', digest: popLine(plane.digest), filled: filledOf(plane) };
}

function formatCard(card) {
  const filled = card.filled.length ? card.filled.join(', ') : 'none';
  return [`From: ${card.from}`, `Digest: ${card.digest}`, `Filled: ${filled}`].join('\n');
}

function firstItem(line) {
  return popLine(String(line || '').split(',')[0]);
}

function speedText(row) {
  const fields = row.fields || {};
  for (const name of SPEED_FIELDS) {
    if (fields[name]) return `${name}: ${fields[name]}`;
  }
  return '';
}

function diveText(row) {
  const fields = row.fields || {};
  for (const name of DIVE_FIELDS) {
    if (!fields[name]) continue;
    const item = name === 'files' ? firstItem(fields[name]) : fields[name];
    if (item) return `${name}: ${item}`;
  }
  return '';
}

function outcomeText(row) {
  const lines = [];
  for (const kind of POP_KINDS) {
    if (!row[kind]) continue;
    lines.push(kind === 'none' ? 'none' : `${kind}: ${row[kind]}`);
  }
  const outcomes = row.outcomes || {};
  for (const [kind, value] of Object.entries(outcomes)) {
    const from = value.from ? ` From: ${value.from}` : '';
    lines.push(`${kind}: ${value.line}${from}`);
  }
  return lines.length ? `Outcome:\n${lines.join('\n')}` : '';
}

function formatUseful(row) {
  const speed = speedText(row) || 'Empty.';
  const dive = diveText(row) || 'Empty.';
  const lines = [formatCard(row.card), `Up to speed: ${speed}`, `Deep dive: ${dive}`];
  const outcome = outcomeText(row);
  if (outcome) lines.push(outcome);
  return lines.join('\n');
}

function glimpseLine(name, card) {
  const filled = card.filled.length ? card.filled.join(', ') : 'none';
  return `${name}  From: ${card.from}  Digest: ${card.digest}  Filled: ${filled}`;
}

function planeIds(platesDir) {
  if (!platesDir) return [];
  const ids = ['ground'];
  for (const id of listPipelineIds(platesDir)) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function fieldLine(plane, field) {
  if (field === 'from') return 'ground';
  if (field === 'digest') return popLine(plane.digest);
  if (field === 'plate') return plane.plate ? String(plane.plate) : '';
  if (field === 'files') {
    const paths = [...(Array.isArray(plane.files) ? plane.files : [])];
    if (Array.isArray(plane.unpathed)) paths.push(...plane.unpathed);
    return paths.join(', ');
  }
  const value = plane[field];
  if (Array.isArray(value)) return value.join(', ');
  return value ? String(value) : '';
}

function popField(file, pops, key, row, field, line, platesDir) {
  row.fields = { ...(row.fields || {}) };
  if (line) {
    row.fields[field] = line;
    pops.planes[key] = row;
    savePops(file, pops);
    return ok(`${field}: ${line}`);
  }
  if (row.fields[field]) return ok(`${field}: ${row.fields[field]}`);
  if (field === 'digest' && row.card) return ok(`digest: ${row.card.digest}`);
  if (field === 'from' && row.card) return ok(`from: ${row.card.from}`);
  if (row.card && !row.card.filled.includes(field)) return ok('Empty.');
  const plane = planeOf(platesDir, key);
  if (!plane) {
    ensurePopTable(file);
    return ok('Empty.');
  }
  if (!row.card) row.card = snapshotOf(plane);
  if (!row.card.filled.includes(field)) {
    pops.planes[key] = row;
    savePops(file, pops);
    return ok('Empty.');
  }
  const held = popLine(fieldLine(plane, field));
  if (!held) {
    pops.planes[key] = row;
    savePops(file, pops);
    return ok('Empty.');
  }
  row.fields[field] = held;
  pops.planes[key] = row;
  savePops(file, pops);
  return ok(`${field}: ${held}`);
}

function holdPlane(file, pops, key, row, platesDir) {
  if (row.card) return row;
  const plane = planeOf(platesDir, key);
  if (!plane) {
    ensurePopTable(file);
    return null;
  }
  row.card = snapshotOf(plane);
  pops.planes[key] = row;
  savePops(file, pops);
  return row;
}

function ensureUseful(file, pops, key, row, platesDir) {
  const speedField = SPEED_FIELDS.find((name) => row.card.filled.includes(name));
  const diveField = DIVE_FIELDS.find((name) => row.card.filled.includes(name));
  if (speedField && !(row.fields && row.fields[speedField])) {
    popField(file, pops, key, row, speedField, '', platesDir);
  }
  if (diveField && !(row.fields && row.fields[diveField])) {
    popField(file, pops, key, row, diveField, '', platesDir);
  }
}

function glimpse(file, platesDir) {
  const pops = loadPops(file);
  const known = planeIds(platesDir);
  const names = (known.length
    ? known
    : Object.keys(pops.planes).filter((name) => pops.planes[name] && pops.planes[name].card)
  ).slice().sort();
  if (!names.length) return miss('Name one pop.');
  let changed = false;
  const lines = [];
  for (const name of names) {
    const row = { ...(pops.planes[name] || {}) };
    if (!row.card) {
      const plane = planeOf(platesDir, name);
      if (!plane) continue;
      row.card = snapshotOf(plane);
      pops.planes[name] = row;
      changed = true;
    }
    lines.push(glimpseLine(name, row.card));
  }
  if (changed) savePops(file, pops);
  if (!lines.length) return miss('Name one pop.');
  return ok(lines.join('\n'));
}

function popOutcome(file, pops, key, row, kind, line) {
  const from = row.card ? row.card.from : '';
  row.outcomes = { ...(row.outcomes || {}), [kind]: { line, from } };
  pops.planes[key] = storedRow(row);
  savePops(file, pops);
  return ok(from ? `${kind}: ${line}\nFrom: ${from}` : `${kind}: ${line}`);
}

function runPop(words, file, platesDir) {
  if (!file) return miss('No pop table.');
  if (!words.length || (words.length === 1 && words[0] === 'glimpse')) return glimpse(file, platesDir);
  const key = popName(words[0]);
  if (!key) return miss('Name one pop.');
  const field = CARD_FIELDS.includes(words[1]) ? words[1] : '';
  const pace = words[1] === 'speed' || words[1] === 'dive' ? words[1] : '';
  const kind = POP_KINDS.includes(words[1]) ? words[1] : '';
  const other = !field && !pace && !kind && words[1] && popName(words[1]) ? words[1] : '';
  const tagged = field || pace || kind || other;
  const line = popLine(tagged ? words.slice(2).join(' ') : words.slice(1).join(' '));
  const pops = loadPops(file);
  const row = { ...(pops.planes[key] || {}) };
  if (!tagged) {
    if (line) return miss('Name a field.');
    const held = holdPlane(file, pops, key, row, platesDir);
    if (!held) return ok('Empty.');
    ensureUseful(file, pops, key, held, platesDir);
    return ok(formatUseful(held));
  }
  if (field) return popField(file, pops, key, row, field, line, platesDir);
  if (pace) {
    if (line) return miss('Name a field.');
    const held = holdPlane(file, pops, key, row, platesDir);
    if (!held) return ok('Empty.');
    ensureUseful(file, pops, key, held, platesDir);
    const text = pace === 'speed' ? speedText(held) : diveText(held);
    const label = pace === 'speed' ? 'Up to speed' : 'Deep dive';
    return ok(`${label}: ${text || 'Empty.'}`);
  }
  if (other) {
    if (!line) return miss('Name a field.');
    if (!row.card) holdPlane(file, pops, key, row, platesDir);
    return popOutcome(file, pops, key, row, other, line);
  }
  if (line) {
    row[kind] = line;
    pops.planes[key] = storedRow(row);
    savePops(file, pops);
    return ok(`${kind}: ${line}`);
  }
  if (row[kind]) return ok(kind === 'none' && row[kind] === 'none' ? 'none' : `${kind}: ${row[kind]}`);
  if (kind === 'none') {
    row.none = 'none';
    pops.planes[key] = storedRow(row);
    savePops(file, pops);
    return ok('none');
  }
  ensurePopTable(file);
  return ok('Empty.');
}

export function lensPath(root) {
  return join(root, '.xray', 'state', 'LENS.md');
}

function readLens(root) {
  const file = lensPath(root);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8').trim();
  return text || null;
}

function notesPath(root) {
  return join(root, '.xray', 'state', 'NOTES.md');
}

const POP_JOB = [
  'Kind 0 is actuality, the lens: map versus worn. It is not a plate type. It checks dichotomy, syncopate, synthesis, digest, triage, and loop. It does not check the card planes.',
  'Digest and triage return the card: from, digest, plate, entry, exit, files, skills, setup, teardown, worn. Empty stays empty. The other ways name one plane and stay a reading.',
  'The lens stays quiet when the action is on that plane. It stops the action when the action leaves that plane.',
  'After 1 is empty. Scope is ecosystem, part, one flow, one artifact. Calling stays off. A miss stays empty.',
].join(' ');

export function notesWithPopJob(existing) {
  let text = String(existing || '');
  text = text.replace(
    'PR #161. Not merged. Not published. Not the cache.',
    'PR #161. Not merged. Not published. The hit table is `.xray/state/pops.json`. A slow look opens a plane only when that name was already popped.',
  );
  text = text.replace(
    'The slow look still opens a plane that was never popped.',
    'A slow look opens a plane only when that name was already popped.',
  );
  text = text.replace(
    'A slow look opens a plane only when that name is already popped.',
    'A slow look opens a plane only when that name was already popped.',
  );
  text = text.replace(
    'A slow look opens a plane only when that name already has a facet.',
    'A slow look opens a plane only when that name was already popped.',
  );
  text = text.replace(
    'Three hits, then Act. A miss is not Act. Teardown wipes the scratch and the streak, not the table.',
    'Teardown wipes the scratch, not the table.',
  );
  const block = `## Pop job\n\n${POP_JOB}\n`;
  const match = /^## Pop job\r?\n/m.exec(text);
  if (!match) {
    if (!text.trim()) return block;
    return `${text.trimEnd()}\n\n${block}`;
  }
  const after = text.slice(match.index + match[0].length);
  const next = after.search(/\n## |\n# /);
  const end = next === -1 ? text.length : match.index + match[0].length + next;
  return `${text.slice(0, match.index)}${block}${text.slice(end)}`;
}

export function writePopJob(root) {
  settlePopTable(popsFileFor(root));
  const notesFile = notesPath(root);
  mkdirSync(dirname(notesFile), { recursive: true });
  const prev = existsSync(notesFile) ? readFileSync(notesFile, 'utf8') : '';
  const next = notesWithPopJob(prev);
  if (next !== prev) writeFileSync(notesFile, next);
  return next;
}

export function notesWithPickup(existing, pickup) {
  const clipped = String(pickup || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const line = `**Pickup line:** ${clipped}`;
  if (!existing || !String(existing).trim()) return `${line}\n`;
  if (/\*\*Pickup line:\*\*/.test(existing)) {
    return String(existing).replace(/\*\*Pickup line:\*\*\s*[^\n]*/, line);
  }
  return `${line}\n\n${existing}`;
}

export function maintainLens(root) {
  const text = actualityLine();
  mkdirSync(dirname(lensPath(root)), { recursive: true });
  writeFileSync(lensPath(root), `${text}\n`);
  writePopJob(root);
  return ok(text);
}

function defaultPlatesDir() {
  return findPlatesDir(dirname(fileURLToPath(import.meta.url)));
}

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = readGoggles(process.argv.slice(2));
  process.stdout.write(`${result.text}\n`);
  process.exit(result.ok ? 0 : 1);
}
