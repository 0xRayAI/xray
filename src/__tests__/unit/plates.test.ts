import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listPackedPathsDryRun } from '../../../scripts/foundry/assert-packed-dist-cli.mjs';
import {
  PLATE_IDS,
  loadPlate,
  plateStockLine,
  recallPlate,
  stampPlateIfMissing,
  type PlateId,
} from '../../memory-routing/plates.js';
import { parsePlateFlow } from './plate-flow.js';

const BOX = /[┌┐└┘│─]/;

describe('pipeline plates', () => {
  it('resolves every plate as a box schematic', () => {
    expect(PLATE_IDS).toEqual([
      'routing',
      'governance',
      'boot',
      'orchestration',
      'processor',
      'reporting',
      'memory-recall',
      'stamp-plate',
      'house',
      'bifrost',
      'review',
      'goggles',
      'suit',
      'kits',
      'host-pack',
      'glossary',
      'record-map',
      'write-home',
      'activity-log',
      'session-capture',
      'suit-wear',
      'suit-organs',
      'station-card',
      'notes-page',
      'reflection-page',
      'site-manual',
      'package-face',
      'suit-settings',
      'trail-state',
      'inference-files',
      'grok-compact',
      'payload-heat',
      'station-heat',
      'pickup-stamp',
      'cursor-compact',
      'work-fresh',
      'kept-line',
      'lens-gate',
      'pre-tool',
      'worn-turn',
      'lens-page',
      'centrifuge',
      'ground',
      'synthesis',
      'repertoire',
      'dynamo',
      'foundry',
      'delegation-gate',
      'temperament',
      'asides',
      'inference-cycle',
      'hermes',
      'openclaw',
      'opencode',
      'consumer-mcp',
      'confer',
      'grokbot',
    ]);
    for (const id of PLATE_IDS) {
      const plate = loadPlate(id);
      expect(plate.id).toBe(id);
      expect(plate.body).toMatch(BOX);
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(plate.sourcePath, 'utf8'))?.[1] ?? '';
      const plateType = /^plate_type:\s*(.+?)\s*$/m.exec(frontmatter)?.[1] ?? '';
      if (plateType !== 'state flow' && plateType !== 'domain model') {
        expect(plate.body).toContain('INPUT');
        expect(plate.body).toContain('OUTPUT');
      }
    }
  });

  it('recalls the processor plate from pre-processor speech and nothing from unrelated text', () => {
    expect(recallPlate('execute pre processors')?.id).toBe('processor');
    expect(recallPlate('grok-bot house init')?.id).toBe('house');
    expect(recallPlate('survive the cut')).toBeNull();
    expect(recallPlate('unrelated bakery order')).toBeNull();
    expect(recallPlate('')).toBeNull();
    expect(recallPlate(null)).toBeNull();
    expect(recallPlate('routing orchestration')).toBeNull();
    expect(plateStockLine('execute pre processors')).toBe(
      'Plate: processor — .xray/state/plates/processor.md',
    );
    expect(plateStockLine('open the boot plane')).toBe(
      'Plate: boot — .xray/state/plates/boot.md',
    );
    expect(plateStockLine('survive the cut')).toBeNull();
  });

  it('does not recall house from a bare house word or when other plates tie', () => {
    expect(recallPlate('in-house tooling review')).toBeNull();
    expect(recallPlate('review plate')?.id).toBe('review');
    expect(recallPlate('critic FAIL on the head')?.id).toBe('review');
    expect(recallPlate('re-review that head')?.id).toBe('review');
    expect(recallPlate('house processor boot')?.id).not.toBe('house');
  });

  it('stamps a missing worn plate and leaves an edited copy in place', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-plates-'));
    try {
      const id: PlateId = 'memory-recall';
      const first = stampPlateIfMissing(root, id);
      expect(first.written).toBe(true);
      expect(first.path).toBe(join(root, '.xray', 'state', 'plates', 'memory-recall.md'));
      const stamped = readFileSync(first.path, 'utf8');
      expect(stamped).toMatch(BOX);
      expect(stamped).toContain('INPUT');
      expect(stamped).toContain('stampPlateIfMissing');
      writeFileSync(first.path, 'worn edit stays\n');
      const second = stampPlateIfMissing(root, id);
      expect(second.written).toBe(false);
      expect(second.path).toBe(first.path);
      expect(readFileSync(first.path, 'utf8')).toBe('worn edit stays\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('resolves memory-recall and processor from the installed package layout', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-worn-plates-'));
    try {
      const hookDir = join(root, 'dist', 'integrations', 'hooks');
      mkdirSync(hookDir, { recursive: true });
      cpSync(join(process.cwd(), 'src/integrations/hooks/plates.cjs'), join(hookDir, 'plates.cjs'));
      cpSync(join(process.cwd(), 'docs-site/docs/plates'), join(root, 'docs-site', 'docs', 'plates'), {
        recursive: true,
      });
      const require = createRequire(join(hookDir, 'plates.cjs'));
      const runtime = require('./plates.cjs') as {
        loadPlate: (id: string) => { id: string; body: string };
        plateStockLine: (intent: string) => string | null;
      };
      const memory = runtime.loadPlate('memory-recall');
      const processor = runtime.loadPlate('processor');
      expect(memory.id).toBe('memory-recall');
      expect(memory.body).toContain('INPUT');
      expect(memory.body).toContain('stampPlateIfMissing');
      expect(processor.id).toBe('processor');
      expect(processor.body).toContain('INPUT');
      expect(runtime.plateStockLine('execute pre processors')).toBe(
        'Plate: processor — .xray/state/plates/processor.md',
      );
      expect(runtime.plateStockLine('recall a plate')).toBe(
        'Plate: memory-recall — .xray/state/plates/memory-recall.md',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('packs memory-recall and processor where the worn reader walks', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      files?: string[];
    };
    expect(pkg.files).toContain('docs-site/docs/plates/');
    const paths = listPackedPathsDryRun(process.cwd());
    expect(paths).toContain('docs-site/docs/plates/memory-recall.md');
    expect(paths).toContain('docs-site/docs/plates/processor.md');
    expect(paths).toContain('docs-site/docs/plates/index.md');
    expect(paths).toContain('docs-site/docs/plates/goggles.md');
    expect(paths).toContain('docs-site/docs/plates/suit.md');
    expect(paths).toContain('docs-site/docs/plates/kits.md');
    expect(paths).toContain('docs-site/docs/plates/host-pack.md');
    expect(paths).toContain('docs-site/docs/plates/glossary.md');
  }, 120000);

  it('recalls a plate by its name and does not recall kind names', () => {
    expect(recallPlate('open the goggles')?.id).toBe('goggles');
    expect(recallPlate('suit plate')?.id).toBe('suit');
    expect(recallPlate('kits')?.id).toBe('kits');
    expect(recallPlate('host pack')?.id).toBe('host-pack');
    expect(recallPlate('open the glossary')?.id).toBe('glossary');

    expect(recallPlate('record map')?.id).toBe('record-map');
    expect(recallPlate('write home')?.id).toBe('write-home');
    expect(recallPlate('activity log pipeline')?.id).toBe('activity-log');
    expect(recallPlate('session capture')?.id).toBe('session-capture');
    expect(recallPlate('suit wear')?.id).toBe('suit-wear');
    expect(recallPlate('suit organs')?.id).toBe('suit-organs');
    expect(recallPlate('station card')?.id).toBe('station-card');
    expect(recallPlate('notes page')?.id).toBe('notes-page');
    expect(recallPlate('reflection page')?.id).toBe('reflection-page');
    expect(recallPlate('site manual')?.id).toBe('site-manual');
    expect(recallPlate('package face')?.id).toBe('package-face');
    expect(recallPlate('suit settings')?.id).toBe('suit-settings');
    expect(recallPlate('trail state')?.id).toBe('trail-state');
    expect(recallPlate('inference files')?.id).toBe('inference-files');
    expect(recallPlate('grok compact')?.id).toBe('grok-compact');
    expect(recallPlate('payload heat')?.id).toBe('payload-heat');
    expect(recallPlate('station heat')?.id).toBe('station-heat');
    expect(recallPlate('pickup stamp')?.id).toBe('pickup-stamp');
    expect(recallPlate('cursor compact')?.id).toBe('cursor-compact');
    expect(recallPlate('work fresh')?.id).toBe('work-fresh');
    expect(recallPlate('kept line')?.id).toBe('kept-line');
    expect(recallPlate('lens gate')?.id).toBe('lens-gate');
    expect(recallPlate('pre tool')?.id).toBe('pre-tool');
    expect(recallPlate('lens page')?.id).toBe('lens-page');
    expect(recallPlate('centrifuge plate')?.id).toBe('centrifuge');
    expect(recallPlate('ground plane')?.id).toBe('ground');
    expect(recallPlate('synthesis plate')?.id).toBe('synthesis');
    expect(recallPlate('repertoire plate')?.id).toBe('repertoire');
    expect(recallPlate('dynamo plate')?.id).toBe('dynamo');
    expect(recallPlate('foundry plate')?.id).toBe('foundry');
    expect(recallPlate('delegation gate')?.id).toBe('delegation-gate');
    expect(recallPlate('temperament plate')?.id).toBe('temperament');
    expect(recallPlate('asides plate')?.id).toBe('asides');
    expect(recallPlate('inference cycle')?.id).toBe('inference-cycle');
    expect(recallPlate('hermes plate')?.id).toBe('hermes');
    expect(recallPlate('openclaw plate')?.id).toBe('openclaw');
    expect(recallPlate('opencode plate')?.id).toBe('opencode');
    expect(recallPlate('consumer mcp')?.id).toBe('consumer-mcp');
    expect(recallPlate('confer plate')?.id).toBe('confer');
    expect(recallPlate('worn turn plate')?.id).toBe('worn-turn');
    expect(recallPlate('bifrost plate')?.id).toBe('bifrost');
    expect(recallPlate('grokbot plate')?.id).toBe('grokbot');
    expect(recallPlate('repertoire')).toBeNull();
    expect(recallPlate('dynamo')).toBeNull();
    expect(recallPlate('foundry')).toBeNull();
    expect(recallPlate('hermes')).toBeNull();
    expect(recallPlate('confer')).toBeNull();
    expect(recallPlate('opencode')).toBeNull();
    expect(recallPlate('openclaw')).toBeNull();
    expect(recallPlate('ground')).toBeNull();
    expect(recallPlate('synthesis')).toBeNull();
    expect(recallPlate('in-house tooling review')).toBeNull();
    expect(recallPlate('house init')?.id).toBe('house');
    expect(recallPlate('what is actuality')).toBeNull();
    expect(recallPlate('outer plane')).toBeNull();
    expect(recallPlate('kind 0')).toBeNull();
    expect(recallPlate('wear the suit')).toBeNull();
    expect(recallPlate('stamp plate')?.id).toBe('stamp-plate');
    expect(recallPlate('in-house tooling review')).toBeNull();
    const goggles = loadPlate('goggles');
    expect(goggles.body).toContain('it views one plane');
    expect(goggles.body).not.toMatch(/ACTUALITY|DICHOTOMY|SYNCOPATE|OUTER PLANES/);
    expect(goggles.body).not.toMatch(/kind\s*[01]|Kind\s*[01]/);
    expect(goggles.body).not.toContain('one of four powers');
    const grokbot = readFileSync(join(process.cwd(), 'docs-site/docs/plates/grokbot.md'), 'utf8');
    expect(grokbot).not.toContain('Grok-Bot Kit');
    const lexicon = readFileSync(join(process.cwd(), 'grok-bot/LEXICON.md'), 'utf8');
    expect(lexicon).not.toMatch(/Kind 0|Kind 1/);
    expect(lexicon).not.toContain('## Goggles (2026-09-29)');
    const stamps = readFileSync(join(process.cwd(), 'grok-bot/ops/dist/brand/STAMPS.md'), 'utf8');
    expect(stamps).not.toMatch(/Kind 0|Kind 1/);
    expect(stamps).not.toContain('**Host Pack**');
    const op = readFileSync(join(process.cwd(), 'grok-bot/OP-PROC.md'), 'utf8').split('\n');
    const opLines = op.at(-1) === '' ? op.length - 1 : op.length;
    expect(opLines).toBeLessThanOrEqual(125);   // cap raised by Blaze 2026-10-21
    const npmRow = op.find((line) => line.includes('id="npm"')) ?? '';
    const opBody = op.filter((line) => !line.includes('id="npm"')).join('\n');
    expect(npmRow).toMatch(/gate jargon \(Kind 0,/);
    expect(opBody).not.toMatch(/Kind 0|outer plane/i);
    expect(op.join('\n')).not.toMatch(/outer plane/i);
  });

  it('keeps lens-card fences rectangular and checks the X copy for the same flow', () => {
    expect(displayWidth('┌┐│─≤→·')).toBe(7);
    expect(displayWidth('中')).toBe(2);
    expect(displayWidth('a\u0301')).toBe(1);
    const version = (JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as { version: string }).version;
    for (const id of PLATE_IDS) {
      const md = readFileSync(join(process.cwd(), 'docs-site/docs/plates', `${id}.md`), 'utf8');
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? '';
      const plateType = /^plate_type:\s*(.+?)\s*$/m.exec(frontmatter)?.[1] ?? '';
      expect(plateType, id).toMatch(/^(pipeline|state flow|domain model)$/);
      const png = join(process.cwd(), 'docs-site/static/plates/x', `${id}.png`);
      if (NO_LENS_CARD.has(id)) {
        expect(existsSync(png), id).toBe(false);
        continue;
      }
      expect(md, id).toContain(`stamped · 0xray ${version}`);
      const body = fenceBody(md);
      const lines = fenceLines(body);
      const width = displayWidth(lines[0] ?? '');
      expect(lines.every((line) => displayWidth(line) === width), id).toBe(true);
      for (const box of plateBoxes(lines)) {
        const top = lines[box.top] ?? '';
        const bot = lines[box.bot] ?? '';
        expect(top[box.right], `${id} top`).toBe('┐');
        expect(bot[box.left], `${id} bot`).toBe('└');
        expect(bot.indexOf('┘', box.left + 1), `${id} corner`).toBe(box.right);
        for (let row = box.top + 1; row < box.bot; row += 1) {
          const edge = lines[row] ?? '';
          expect(LEFT_SIDE.has(edge[box.left] ?? ''), `${id} left ${row}`).toBe(true);
          expect(RIGHT_EDGE.has(edge[box.right] ?? ''), `${id} right ${row}`).toBe(true);
        }
      }
      const embedded = JSON.parse(pngText(readFileSync(png), 'xray-plate-flow') ?? 'null') as ReturnType<typeof parsePlateFlow>;
      const flow = parsePlateFlow(lines);
      expect(embedded, id).toEqual(flow);
      if (id === 'routing') {
        expect(flow.layers.map((layer) => layer.name)).toEqual(['INPUT LAYER', 'PROCESSING LAYER', 'OUTPUT LAYER']);
        expect(flow.layers[1]?.nodes.map((node) => node.lines[0])).toEqual([
          'scoreComplexity',
          'lensPlane',
          'routeToAgent',
          'resolveThinDispatch',
        ]);
        expect(flow.layers[2]?.nodes.map((node) => node.lines[0])).toEqual(['agent', 'strategy', 'adjusted score', 'file']);
        expect(flow.edges.filter((edge) => edge.to[0] === 2 && edge.to[1] === 3)).toEqual([]);
        expect(flow.edges.filter((edge) => edge.from[0] === 0).map((edge) => edge.to)).toEqual([[1, 0], [1, 0], [1, 0]]);
      }
      if (id === 'house') {
        expect(flow.edges.some((edge) => edge.label === 'house init' && edge.from[0] === 0 && edge.to[0] === 1)).toBe(true);
        expect(flow.edges.some((edge) => edge.label === 'not yet' && edge.from[0] === 4 && edge.to[0] === 2)).toBe(true);
      }
      if (id === 'centrifuge') {
        expect(flow.notes).toContain('CENTRIFUGE');
        expect(flow.notes).toContain('the gap stays open');
        expect(flow.edges.some((edge) => edge.label === 'looks down')).toBe(true);
      }
    }
  });

  it('fails when a rendered plate character has no glyph', () => {
    const fonts = join(
      process.cwd(),
      'grok-bot/skills/draw-stamped-card/recipes/bifrost-storyboard/assets/fonts',
    );
    const bold = cmapOf(join(fonts, 'BarlowCondensed-Bold.ttf'));
    const semi = cmapOf(join(fonts, 'BarlowCondensed-SemiBold.ttf'));
    const stencil = cmapOf(join(fonts, 'BlackOpsOne-Regular.ttf'));
    const drawn = drawnArrows();
    expect(drawn.has('→')).toBe(true);
    expect(bold.has(codePoint('→'))).toBe(false);
    expect(bold.has(codePoint('·'))).toBe(true);
    expect(bold.has(codePoint('≤'))).toBe(true);
    const missing: string[] = [];
    for (const id of PLATE_IDS) {
      if (NO_LENS_CARD.has(id)) continue;
      const md = readFileSync(join(process.cwd(), 'docs-site/docs/plates', `${id}.md`), 'utf8');
      const frontmatter = /^---\n([\s\S]*?)\n---/.exec(md)?.[1] ?? '';
      const title = (/^title:\s*(.+)\s*$/m.exec(frontmatter)?.[1] ?? id).toUpperCase();
      noteMissing(missing, id, 'title', title, stencil, drawn);
      noteMissing(missing, id, 'subtitle', leadLine(md), semi, drawn);
      const footer = md.split('\n').find((line) => line.startsWith('stamped')) ?? '';
      noteMissing(missing, id, 'footer', footer, bold, drawn);
      const flow = parsePlateFlow(fenceLines(fenceBody(md)));
      for (const layer of flow.layers) {
        noteMissing(missing, id, 'layer', layer.name.toUpperCase(), bold, drawn);
        for (const node of layer.nodes) {
          const text = node.lines.join(' ');
          noteMissing(missing, id, 'card', text, bold, drawn);
          noteMissing(missing, id, 'card', text, semi, drawn);
        }
      }
      for (const edge of flow.edges) {
        noteMissing(missing, id, 'edge', edge.label, semi, drawn);
      }
      for (const note of flow.notes) {
        noteMissing(missing, id, 'note', note, semi, drawn);
      }
    }
    expect(missing).toEqual([]);
  });
});

const NO_LENS_CARD = new Set(['review', 'goggles', 'suit', 'kits', 'host-pack', 'glossary']);
const LEFT_SIDE = new Set(['│', '├', '┼']);
const RIGHT_EDGE = new Set(['│', '┐', '┘', '┤', '┼']);

function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2329 && cp <= 0x232a) ||
    (cp >= 0x2e80 && cp <= 0xa4cf && cp !== 0x303f) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  );
}

function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isCombining(cp)) continue;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}

function fenceBody(md: string): string {
  const match = /```[^\n]*\n([\s\S]*?)```/.exec(md);
  if (!match) throw new Error('plate has no code fence');
  return match[1];
}

function fenceLines(body: string): string[] {
  const text = body.endsWith('\n') ? body.slice(0, -1) : body;
  return text.split('\n');
}

function plateBoxes(lines: string[]): Array<{ top: number; bot: number; left: number; right: number }> {
  const found: Array<{ top: number; bot: number; left: number; right: number }> = [];
  for (let r = 0; r < lines.length; r += 1) {
    const line = lines[r] ?? '';
    let c = 0;
    while (c < line.length) {
      if (line[c] === '┌') {
        let k = c + 1;
        while (k < line.length && line[k] !== '┐' && line[k] !== '┌') k += 1;
        if (k < line.length && line[k] === '┐') {
          let rr = r + 1;
          while (rr < lines.length && LEFT_SIDE.has((lines[rr] ?? '')[c] ?? '')) rr += 1;
          if (rr < lines.length && (lines[rr] ?? '')[c] === '└') {
            found.push({ top: r, bot: rr, left: c, right: k });
            c = k;
            continue;
          }
        }
      }
      c += 1;
    }
  }
  return found;
}

function codePoint(ch: string): number {
  return ch.codePointAt(0) ?? 0;
}

function drawnArrows(): Set<string> {
  const src = readFileSync(
    join(process.cwd(), 'grok-bot/skills/draw-stamped-card/recipes/layered-flow/render.py'),
    'utf8',
  );
  const block = /INLINE_ARROWS\s*=\s*\{([^}]+)\}/.exec(src)?.[1] ?? '';
  if (!block || !src.includes('def draw_inline_arrow') || !src.includes('def paint_text')) {
    throw new Error('renderer does not draw the arrow characters');
  }
  const arrows = new Set<string>();
  for (const match of block.matchAll(/"([^"]+)"/g)) {
    const ch = match[1] ?? '';
    if (ch) arrows.add(ch);
  }
  return arrows;
}

function leadLine(md: string): string {
  const parts = md.split('---');
  const body = parts.length >= 3 ? parts.slice(2).join('---') : md;
  const chunk: string[] = [];
  for (const line of body.split('\n')) {
    if (line.startsWith('#') || line.startsWith('```')) {
      if (chunk.length) break;
      continue;
    }
    if (!line.trim()) {
      if (chunk.length) break;
      continue;
    }
    chunk.push(line.trim());
  }
  let sentence = chunk.join(' ');
  const dot = sentence.indexOf('. ');
  if (dot !== -1) sentence = sentence.slice(0, dot + 1);
  if (!sentence || sentence.length > 68) return '';
  return sentence;
}

function noteMissing(
  missing: string[],
  id: string,
  role: string,
  text: string,
  cmap: Set<number>,
  drawn: Set<string>,
): void {
  for (const ch of text) {
    if (drawn.has(ch) || ch === '\n') continue;
    const cp = ch.codePointAt(0) ?? 0;
    if (!cmap.has(cp)) missing.push(`${id} ${role} ${ch}`);
  }
}

function cmapOf(path: string): Set<number> {
  const buf = readFileSync(path);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numTables = view.getUint16(4);
  let cmapAt = -1;
  for (let index = 0; index < numTables; index += 1) {
    const rec = 12 + index * 16;
    if (buf.toString('ascii', rec, rec + 4) === 'cmap') cmapAt = view.getUint32(rec + 8);
  }
  if (cmapAt < 0) throw new Error(`no cmap in ${path}`);
  const nEnc = view.getUint16(cmapAt + 2);
  let best = -1;
  let bestScore = -1;
  for (let index = 0; index < nEnc; index += 1) {
    const rec = cmapAt + 4 + index * 8;
    const platform = view.getUint16(rec);
    const encoding = view.getUint16(rec + 2);
    const off = cmapAt + view.getUint32(rec + 4);
    if (view.getUint16(off) !== 4) continue;
    const score = (platform === 3 && encoding === 1 ? 100000 : 0) + view.getUint16(off + 2);
    if (score > bestScore) {
      bestScore = score;
      best = off;
    }
  }
  if (best < 0) throw new Error(`no format-4 cmap in ${path}`);
  const seg = view.getUint16(best + 6) / 2;
  let pos = best + 14;
  const end: number[] = [];
  const start: number[] = [];
  const delta: number[] = [];
  const roff: number[] = [];
  for (let index = 0; index < seg; index += 1) end.push(view.getUint16(pos + index * 2));
  pos += seg * 2 + 2;
  for (let index = 0; index < seg; index += 1) start.push(view.getUint16(pos + index * 2));
  pos += seg * 2;
  for (let index = 0; index < seg; index += 1) delta.push(view.getInt16(pos + index * 2));
  pos += seg * 2;
  const roffPos = pos;
  for (let index = 0; index < seg; index += 1) roff.push(view.getUint16(pos + index * 2));
  const found = new Set<number>();
  for (let index = 0; index < seg; index += 1) {
    const startCp = start[index] ?? 0;
    const endCp = end[index] ?? 0;
    const idDelta = delta[index] ?? 0;
    const rangeOff = roff[index] ?? 0;
    for (let cp = startCp; cp <= endCp; cp += 1) {
      let glyph = 0;
      if (rangeOff === 0) {
        glyph = (cp + idDelta) & 0xffff;
      } else {
        const gpos = roffPos + index * 2 + rangeOff + 2 * (cp - startCp);
        glyph = view.getUint16(gpos);
        if (glyph) glyph = (glyph + idDelta) & 0xffff;
      }
      if (glyph) found.add(cp);
    }
  }
  return found;
}

function pngText(buf: Buffer, keyword: string): string | null {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error('not a png');
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'iTXt') {
      const keyEnd = data.indexOf(0);
      const key = data.toString('latin1', 0, keyEnd);
      if (key === keyword) {
        let cursor = keyEnd + 1;
        const compressed = data[cursor] === 1;
        cursor += 2;
        const langEnd = data.indexOf(0, cursor);
        cursor = langEnd + 1;
        const transEnd = data.indexOf(0, cursor);
        const text = data.subarray(transEnd + 1);
        return compressed ? inflateSync(text).toString('utf8') : text.toString('utf8');
      }
    }
    offset += 12 + length;
  }
  return null;
}
