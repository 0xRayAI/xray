/**
 * Goggles. A snapshot of one real plane: a short digest, then the next depth.
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

const GROUND = [
  ['code', 'The reactive engine, still in TypeScript.', 'src'],
  ['OP-PROC', 'The procedure the model carries.', 'grok-bot/OP-PROC.md'],
  ['model', 'The seat that runs the procedure.', 'src/opencode/agents'],
  ['suit', 'Worn gear: constitution, temperament, Station.', 'Agents.md'],
  ['mill', 'Fashions and fastens.', null],
  ['host', 'The floor.', 'src/integrations'],
  ['test/ship', 'Test then ship is the hero. Ship without that proof is the catastrophe.', 'package.json'],
];

const SEAMS = {
  routing: {
    file: 'src/nucleus/thin-dispatch.ts',
    mark: 'export function scoreAndRoute',
    digest: 'scoreAndRoute in src/nucleus/thin-dispatch.ts',
    cascade: 'task text → scoreComplexity → routeToAgent → resolveThinDispatch → agent',
    next: {
      digest: 'A null provider returns the score unchanged. A worn provider can change the agent.',
      cascade: 'score → agent → resolveThinDispatch → adjusted score, strategy, signals',
    },
  },
  house: {
    file: 'grok-bot/lib/seat-doctor.cjs',
    mark: 'no house/HOUSE.md, run setup-house',
    digest: 'seat-doctor in grok-bot/lib/seat-doctor.cjs',
    cascade: 'missing HOUSE.md warns → example lines fail → filled lines pass',
  },
};

function repoRootFrom(platesDir) {
  return dirname(dirname(dirname(platesDir)));
}

function shot(plane, one, depth, digest, cascade, deeper) {
  const who = one ? `${plane}/${one}` : plane;
  return {
    ok: true,
    text: [
      `Snapshot: ${who}@${depth}`,
      `Digest: ${digest}`,
      `Cascade: ${cascade}`,
      `Deeper: ${deeper}`,
    ].join('\n'),
  };
}

function miss(text) {
  return { ok: false, text };
}

function pipelineBody(id, platesDir) {
  const raw = readFileSync(join(platesDir, `${id}.md`), 'utf8');
  return stripFrontmatter(raw);
}

function groundSnapshot(one, depth, root) {
  if (!one) {
    if (depth > 1) return miss(`Name one on ground: ${GROUND.map(([id]) => id).join(', ')}.`);
    return shot(
      'ground',
      '',
      1,
      'Home. The dev plane.',
      GROUND.map(([id]) => id).join(' → '),
      'name one',
    );
  }
  const part = GROUND.find(([id]) => id === one);
  if (!part) return miss(`Name one on ground: ${GROUND.map(([id]) => id).join(', ')}.`);
  if (depth > 2) return miss('No deeper.');
  const [, line, file] = part;
  const present = file ? existsSync(join(root, file)) : false;
  const cascade = file ? (present ? file : `${file} missing`) : 'no single file';
  const digest = present || !file ? line : `${line} Missing in this tree.`;
  return shot('ground', one, 2, digest, cascade, 'none');
}

function pipelineSnapshot(one, depth, platesDir, root) {
  const ids = listPipelineIds(platesDir);
  if (!one || !ids.includes(one)) return miss(`Name one pipeline: ${ids.join(', ')}.`);
  const body = pipelineBody(one, platesDir);
  const stages = cascadeOf(body).join(' → ');
  if (depth <= 1) {
    return shot('pipeline', one, 1, takeOf(body), stages, '2');
  }
  const seam = SEAMS[one];
  if (!seam) {
    if (depth > 2) return miss('No deeper.');
    return shot('pipeline', one, 2, 'Drawing only. No file named.', stages, 'none');
  }
  const full = join(root, seam.file);
  const worn = existsSync(full) && readFileSync(full, 'utf8').includes(seam.mark);
  if (!worn) {
    return shot('pipeline', one, 2, `Seam missing in this tree: ${seam.file}`, stages, 'none');
  }
  if (depth === 2) {
    return shot('pipeline', one, 2, seam.digest, seam.cascade, seam.next ? '3' : 'none');
  }
  if (!seam.next || depth > 3) return miss('No deeper.');
  return shot('pipeline', one, 3, seam.next.digest, seam.next.cascade, 'none');
}

export function parseLook(argv) {
  const words = [];
  let depth = 1;
  for (const raw of argv) {
    const arg = String(raw || '').trim();
    if (!arg) continue;
    if (/^\d+$/.test(arg)) depth = Number(arg);
    else words.push(arg);
  }
  if (words.length === 0) return { error: 'Name one plane: ground, pipeline.' };
  const head = words[0];
  if (head === 'domain' || head === 'eco' || head === 'outer' || head === 'outer-loop') {
    return { error: 'Not a plane yet. Planes: ground, pipeline.' };
  }
  if (head === 'ground' || head === 'pipeline') {
    return { plane: head, one: words[1] || '', depth };
  }
  if (words.length > 1) return { error: 'Name one pipeline.' };
  return { plane: 'pipeline', one: head, depth };
}

export function snapshot(plane, one, depth, platesDir) {
  const root = repoRootFrom(platesDir);
  if (plane === 'ground') return groundSnapshot(one, depth, root);
  if (plane === 'pipeline') return pipelineSnapshot(one, depth, platesDir, root);
  return miss('Name one plane: ground, pipeline.');
}

export function look(argv, platesDir) {
  const parsed = parseLook(argv);
  if (parsed.error) return miss(parsed.error);
  return snapshot(parsed.plane, parsed.one, parsed.depth, platesDir);
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
