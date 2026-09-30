/**
 * Goggles for the pipeline plane. One stamped pipeline. Its cascade.
 * Domain plates are a different plane.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLANE = 'pipeline';

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

export function lookPipeline(id, platesDir) {
  const ids = listPipelineIds(platesDir);
  const name = String(id || '').trim();
  if (!ids.includes(name)) {
    return {
      ok: false,
      text: `Name one pipeline: ${ids.join(', ')}.`,
    };
  }
  const raw = readFileSync(join(platesDir, `${name}.md`), 'utf8');
  const body = stripFrontmatter(raw);
  const cascade = cascadeOf(body);
  const take = takeOf(body);
  return {
    ok: true,
    text: [
      `Plane: ${PLANE}`,
      `One: ${name}`,
      `Cascade: ${cascade.join(' → ')}`,
      `Take: ${take}`,
    ].join('\n'),
  };
}

function defaultPlatesDir() {
  return findPlatesDir(dirname(fileURLToPath(import.meta.url)));
}

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = lookPipeline(process.argv[2], defaultPlatesDir());
  process.stdout.write(`${result.text}\n`);
  process.exit(result.ok ? 0 : 1);
}
