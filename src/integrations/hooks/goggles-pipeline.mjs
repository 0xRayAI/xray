/**
 * Goggles. A look at one real plane.
 * Peer returns where you came from, one line, and the names of the fields that are filled.
 * Examine, triage, and cascade come after that, in that order. A depth number is not a look.
 * Ground and pipeline can be landed on. Domain, eco, and the outer loop cannot.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** First segment of the line under a ┌. A side rail may add more bars. */
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

const FIELD_ORDER = ['plate', 'entry', 'exit', 'files', 'skills', 'setup', 'teardown', 'worn'];
const LOOKS = new Set(['peer', 'examine', 'triage', 'cascade']);
const NOT_PLANES = new Set(['domain', 'eco', 'outer', 'outer-loop']);

const GROUND = [
  ['code', 'src'],
  ['OP-PROC', 'grok-bot/OP-PROC.md'],
  ['model', 'src/opencode/agents'],
  ['suit', 'Agents.md'],
  ['mill', null],
  ['host', 'src/integrations'],
  ['test/ship', 'package.json'],
];

const SEAMS = {
  routing: {
    file: 'src/nucleus/thin-dispatch.ts',
    worn: 'dist/nucleus/thin-dispatch.js',
    mark: 'export function scoreAndRoute',
    wornMark: 'function scoreAndRoute',
    pick: 'resolveThinDispatch',
    pickIn: 'resolveThinDispatch',
    pickDigest: 'A null provider returns the score unchanged. A worn provider can change the agent.',
  },
  house: {
    file: 'grok-bot/lib/seat-doctor.cjs',
    mark: 'no house/HOUSE.md, run setup-house',
    pick: null,
  },
};

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
  if (!rel) return false;
  const full = join(root, rel);
  return existsSync(full) && readFileSync(full, 'utf8').includes(mark);
}

function pipelineBody(id, platesDir) {
  const raw = readFileSync(join(platesDir, `${id}.md`), 'utf8');
  return stripFrontmatter(raw);
}

function filledNames(flags) {
  return FIELD_ORDER.filter((name) => flags[name]);
}

function peerText(from, digest, flags) {
  const names = filledNames(flags);
  return [`From: ${from}`, `Digest: ${digest}`, `Filled: ${names.join(', ')}`].join('\n');
}

function groundFlags(root) {
  return {
    plate: false,
    entry: false,
    exit: false,
    files: true,
    skills: existsSync(join(root, 'SKILLS.md')),
    setup: false,
    teardown: false,
    worn: false,
  };
}

function pipelineFlags(seam) {
  return {
    plate: true,
    entry: false,
    exit: false,
    files: Boolean(seam && seam.file),
    skills: false,
    setup: false,
    teardown: false,
    worn: false,
  };
}

function examineGround(root) {
  for (const [id, file] of GROUND) {
    if (!file) continue;
    if (!existsSync(join(root, file))) return drift(`${id} is not at ${file}`);
  }
  if (!existsSync(join(root, 'SKILLS.md'))) return drift('root SKILLS.md is not there');
  return holds();
}

function examineSeam(root, seam) {
  if (!seam) return drawing();
  if (!fileHas(root, seam.file, seam.mark)) {
    return drift(`${seam.mark} is not in ${seam.file}`);
  }
  if (seam.worn && !fileHas(root, seam.worn, seam.wornMark)) {
    return drift(`the worn build is not ${seam.file}`);
  }
  return holds();
}

function triageOf(exam, pick) {
  if (exam.kind === 'drawing') return { stop: true, text: 'Pick: none' };
  if (exam.kind === 'drift') return { stop: true, text: `Pick: ${exam.text.slice('Drift: '.length)}` };
  if (pick) return { stop: false, text: `Pick: ${pick}` };
  return { stop: true, text: 'Pick: none' };
}

function cascadeText(who, seam) {
  return peerText(who, seam.pickDigest, {
    plate: false,
    entry: false,
    exit: false,
    files: false,
    skills: false,
    setup: false,
    teardown: false,
    worn: false,
  });
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

function runGround(one, look, root) {
  if (one) return miss(`Triage did not name ${one}.`);
  const flags = groundFlags(root);
  if (look === 'peer') return ok(peerText('ground', 'Home. The dev plane.', flags));
  const exam = examineGround(root);
  if (look === 'examine') return ok(exam.text);
  const triage = triageOf(exam, null);
  if (look === 'triage') return ok(triage.text);
  return ok('No cascade.');
}

function runPipeline(one, look, platesDir, root) {
  const ids = listPipelineIds(platesDir);
  if (!one || !ids.includes(one)) return miss(`Name one pipeline: ${ids.join(', ')}.`);
  const seam = SEAMS[one] || null;
  const flags = pipelineFlags(seam);
  const digest = takeOf(pipelineBody(one, platesDir));
  if (look === 'peer') return ok(peerText('ground', digest, flags));
  const exam = examineSeam(root, seam);
  if (look === 'examine') return ok(exam.text);
  const triage = triageOf(exam, seam && seam.pick);
  if (look === 'triage') return ok(triage.text);
  if (triage.stop || !seam || !seam.pickDigest) return ok('No cascade.');
  if (!fileHas(root, seam.file, seam.pickIn)) return ok('No cascade.');
  return ok(cascadeText(`pipeline/${one}`, seam));
}

export function look(argv, platesDir) {
  const parsed = parseLook(argv);
  if (parsed.error) return miss(parsed.error);
  const root = repoRootFrom(platesDir);
  if (parsed.plane === 'ground') return runGround(parsed.one, parsed.look, root);
  if (parsed.plane === 'pipeline') return runPipeline(parsed.one, parsed.look, platesDir, root);
  return miss('Name one plane: ground, pipeline.');
}

function defaultPlatesDir() {
  return findPlatesDir(dirname(fileURLToPath(import.meta.url)));
}

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = look(process.argv.slice(2), defaultPlatesDir());
  process.stdout.write(`${result.text}\n`);
  process.exit(result.ok ? 0 : 1);
}
