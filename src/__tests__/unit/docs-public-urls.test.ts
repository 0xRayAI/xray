import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OLD_BOARD = 'burst-live-production.up.railway.app';
const OLD_DOCS = '0xrayai.github.io/xray';
const DROPPED_DOCS_PREFIX = 'https://docs.0xray.dev/guides/';

const SETUP_DOCS = [
  'grok-bot/README.md',
  'grok-bot/AGENTS.md',
  'grok-bot/SKILLS.md',
  'grok-bot/llms.txt',
  'grok-bot/skills/setup-house/SKILL.md',
  'grok-bot/OP-PROC.md',
  'grok-bot/templates/house/STATION-BOOT.md',
  'grok-bot/CHANGELOG.md',
  'docs-site/docs/guides/house.md',
];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.docusaurus',
  '.opencode',
  '.xray',
]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
      continue;
    }
    out.push(full);
  }
}

function isDoc(file: string): boolean {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === 'src/__tests__/unit/docs-public-urls.test.ts') return false;
  if (path.basename(file) === '_redirects') return true;
  if (rel.endsWith('.md') || rel.endsWith('.mdx') || rel.endsWith('.txt')) return true;
  if (rel.startsWith('docs-site/') && (rel.endsWith('.ts') || rel.endsWith('.tsx'))) return true;
  if (rel === 'AGENTS.md' || rel === 'AGENTS-consumer.md') return true;
  return false;
}

describe('docs check', () => {
  it('names shipped skills and station template lines in the setup docs', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'grok-bot/package.json'), 'utf8')) as {
      files: string[];
    };
    const docs = SETUP_DOCS.map((rel) => readFileSync(path.join(root, rel), 'utf8')).join('\n');
    const skills = pkg.files
      .filter((entry) => entry.startsWith('skills/'))
      .map((entry) => entry.split('/')[1] ?? '');
    for (const skill of skills) {
      expect(docs, skill).toContain(skill);
    }
    const house = readFileSync(path.join(root, 'grok-bot/templates/house/HOUSE.md'), 'utf8');
    const station = readFileSync(path.join(root, 'grok-bot/templates/station/STATION.md'), 'utf8');
    if (house.includes('OP-PROC:')) expect(docs).toContain('OP-PROC:');
    if (house.includes('name:')) expect(docs).toContain('name:');
    for (const line of ['Plane:', 'Skills:', 'Keys:']) {
      if (station.includes(line)) expect(docs, line).toContain(line);
    }
    expect(docs).toContain('seat-label');
    expect(docs).toContain('BOOT:');
  });

  it('keeps docs routes under /docs', () => {
    const config = readFileSync(path.join(root, 'docs-site/docusaurus.config.ts'), 'utf8');
    expect(config).toContain("routeBasePath: 'docs'");
    expect(config).not.toContain("routeBasePath: '/'");
  });

  it('scans redirects, the live mesh readme, and vendored repertoire', () => {
    const files: string[] = [];
    walk(root, files);
    const rels = files
      .filter((file) => isDoc(file))
      .map((file) => path.relative(root, file).split(path.sep).join('/'));
    expect(rels).toContain('docs-site/static/_redirects');
    expect(rels).toContain('house/live-mesh/README.md');
    expect(rels.some((rel) => rel.startsWith('vendor/@0xray/repertoire/') && rel.endsWith('.md'))).toBe(true);
    const redirects = readFileSync(path.join(root, 'docs-site/static/_redirects'), 'utf8');
    expect(redirects).not.toContain('/xray/docs');
  });

  it('rejects the old docs host, a dropped /docs prefix, and the old board host in docs', () => {
    const files: string[] = [];
    walk(root, files);
    const hits: string[] = [];
    for (const file of files) {
      if (!isDoc(file)) continue;
      const text = readFileSync(file, 'utf8');
      const rel = path.relative(root, file).split(path.sep).join('/');
      if (text.includes(OLD_DOCS)) hits.push(`${rel} has ${OLD_DOCS}`);
      if (text.includes(DROPPED_DOCS_PREFIX)) hits.push(`${rel} has ${DROPPED_DOCS_PREFIX}`);
      if (text.includes(OLD_BOARD)) hits.push(`${rel} has ${OLD_BOARD}`);
    }
    expect(hits).toEqual([]);
  });
});
