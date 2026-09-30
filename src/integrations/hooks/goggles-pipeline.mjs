/**
 * Goggles. One machine over a plane body.
 * A plane is data: the same fields, empty when absent.
 * Peer writes a scratch. Examine checks only that scratch against disk.
 * Triage picks one line that is already in a file, or none. Cascade opens that line.
 * Teardown deletes the scratch. A depth number is not a look.
 * A pop names facet, feat, or fix only when the mind needs that one.
 * None is required, and they are not in an order.
 * A slow look opens a plane only when that name was already popped.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const LOOKS = new Set(['peer', 'examine', 'triage', 'cascade']);
const NOT_PLANES = new Set(['domain', 'eco', 'outer', 'outer-loop']);
const HERE = dirname(fileURLToPath(import.meta.url));

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
  if (id !== 'ground') {
    const abs = join(platesDir, `${id}.md`);
    if (!existsSync(abs)) return null;
    plate = join('docs-site', 'docs', 'plates', `${id}.md`);
    if (!digest) digest = takeOf(stripFrontmatter(readFileSync(abs, 'utf8')));
  }
  if (!digest) return null;
  return {
    id,
    digest,
    plate,
    entry: extra.entry || null,
    exit: extra.exit || null,
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
  const checkable = files.length > 0 || plane.skills || plane.worn || plane.entry || plane.exit;
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
  if (plane.entry && files[0] && !fileHas(root, files[0], plane.entry)) {
    return drift(`${plane.entry} is not in ${files[0]}`);
  }
  if (plane.exit && files[0] && !fileHas(root, files[0], plane.exit)) {
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

export function look(argv, platesDir, popsPath = null) {
  return cycle(argv, platesDir, null, undefined, popsPath);
}

export function scratchFileFor(root) {
  return join(root, '.xray', 'state', 'goggles-scratch.json');
}

export function popsFileFor(root) {
  return join(root, '.xray', 'state', 'pops.json');
}

function popsPathBeside(scratchPath, explicit) {
  if (explicit) return explicit;
  if (!scratchPath) return null;
  return join(dirname(scratchPath), 'pops.json');
}

const POP_KINDS = ['facet', 'feat', 'fix'];

function blankPop() {
  return { facet: '', feat: '', fix: '' };
}

function popLine(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function hasPop(pops, name) {
  const row = pops.planes[name];
  return Boolean(row && (row.facet || row.feat || row.fix));
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
        const row = blankPop();
        for (const kind of POP_KINDS) row[kind] = popLine(raw[kind]);
        if (row.facet || row.feat || row.fix) planes[key] = row;
      }
      return { planes };
    }
    const rawFacets = data && data.facets && typeof data.facets === 'object' ? data.facets : {};
    for (const [name, facet] of Object.entries(rawFacets)) {
      const key = popName(name);
      const line = popLine(facet);
      if (!key || !line) continue;
      planes[key] = { ...blankPop(), facet: line };
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

function digestOf(platesDir, name) {
  if (!platesDir) return '';
  const parsed = parseLook([name]);
  if (parsed.error) return '';
  const resolved = resolvePlane(parsed, platesDir);
  if (!resolved.ok || !resolved.plane) return '';
  return popLine(resolved.plane.digest);
}

function runPop(words, file, platesDir) {
  if (!file) return miss('No pop table.');
  if (!words.length) return miss('Name one pop.');
  const key = popName(words[0]);
  if (!key) return miss('Name one pop.');
  const kind = POP_KINDS.includes(words[1]) ? words[1] : '';
  const line = popLine(kind ? words.slice(2).join(' ') : words.slice(1).join(' '));
  if (!kind) return miss('Name facet, feat, or fix.');
  const pops = loadPops(file);
  const row = pops.planes[key] ? { ...pops.planes[key] } : blankPop();
  if (line) {
    row[kind] = line;
    pops.planes[key] = row;
    savePops(file, pops);
    return ok(`${kind}: ${line}`);
  }
  if (row[kind]) return ok(`${kind}: ${row[kind]}`);
  if (kind === 'facet') {
    const digest = digestOf(platesDir, key);
    if (digest) {
      row.facet = digest;
      pops.planes[key] = row;
      savePops(file, pops);
      return ok(`facet: ${digest}`);
    }
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
  'The mind names facet, feat, or fix when one is needed. None is required, and they are not in an order.',
  'A hit returns that line and does not open the plane. A miss stays empty and still leaves the table.',
  'Teardown wipes the scratch, not the table. The wear leaves the table when the file is missing.',
  'A pop is not a law.',
  'A slow look opens a plane only when that name was already popped.',
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

export function maintainLens(root, platesDir) {
  const plates = platesDir || findPlatesDir(root);
  if (!plates) return miss('No plates.');
  const scratch = scratchFileFor(root);
  let rec = readScratch(scratch);
  if (!rec) {
    const kept = readLens(root);
    if (kept) {
      writePopJob(root);
      return ok(kept);
    }
    const peered = cycle(['ground'], plates, scratch);
    if (!peered.ok) return peered;
    rec = readScratch(scratch);
  }
  if (!rec) return miss('No lens.');
  const text = formatLens(rec);
  mkdirSync(dirname(lensPath(root)), { recursive: true });
  writeFileSync(lensPath(root), `${text}\n`);
  const notesFile = notesPath(root);
  const prev = existsSync(notesFile) ? readFileSync(notesFile, 'utf8') : '';
  writeFileSync(notesFile, notesWithPickup(prev, text.replace(/\n/g, ' ')));
  writePopJob(root);
  return ok(text);
}

function defaultPlatesDir() {
  return findPlatesDir(dirname(fileURLToPath(import.meta.url)));
}

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const platesDir = defaultPlatesDir();
  const result = cycle(process.argv.slice(2), platesDir, scratchFileFor(repoRootFrom(platesDir)));
  process.stdout.write(`${result.text}\n`);
  process.exit(result.ok ? 0 : 1);
}
