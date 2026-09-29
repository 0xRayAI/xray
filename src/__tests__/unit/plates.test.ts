import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
      'house',
      'goggles',
      'host-pack',
      'glossary',
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
    expect(plateStockLine('survive the cut')).toBeNull();
  });

  it('does not recall house from a bare house word or when other plates tie', () => {
    expect(recallPlate('in-house tooling review')).toBeNull();
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
      expect(stamped).toContain('speech grades');
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
      expect(memory.body).toContain('speech grades');
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
  }, 120000);

  it('recalls goggles for a level and refuses a whole-plane story cue', () => {
    expect(recallPlate('open the goggles')?.id).toBe('goggles');
    expect(recallPlate('what is actuality')?.id).toBe('goggles');
    expect(recallPlate('outer plane')?.id).toBe('goggles');
    expect(recallPlate('kind 0')?.id).toBe('goggles');
    expect(recallPlate('host pack')?.id).toBe('host-pack');
    expect(recallPlate('open the glossary')?.id).toBe('glossary');
    expect(recallPlate('house init')?.id).toBe('house');
    expect(recallPlate('loop the suite')?.id ?? null).toBeNull();
    expect(recallPlate('digest the changelog')?.id ?? null).toBeNull();
    expect(recallPlate('synthesis')?.id ?? null).toBeNull();
    const goggles = loadPlate('goggles');
    for (const name of ['DICHOTOMY', 'SYNCOPATE', 'SYNTHESIS', 'DIGEST', 'TRIAGE', 'LOOP', 'ACTUALITY']) {
      expect(goggles.body).toContain(name);
    }
    expect(goggles.body).not.toMatch(/fandangle|TEGHAL|kind 2|Kind 2/);
    expect(goggles.body).toContain('Look at one thing');
    expect(goggles.body).not.toMatch(/no mark yet|CLOSER LOOKS|don't invent|new mark/);
    const grokbot = readFileSync(join(process.cwd(), 'docs-site/docs/plates/grokbot.md'), 'utf8');
    expect(grokbot).not.toContain('Grok-Bot Kit');
    const lexicon = readFileSync(join(process.cwd(), 'grok-bot/ops/dist/brand/LEXICON.md'), 'utf8');
    expect(lexicon).not.toContain('Setup pack (`@0xray/grok-bot`)');
    expect(lexicon).toContain('Host Pack');
    const stamps = readFileSync(join(process.cwd(), 'grok-bot/ops/dist/brand/STAMPS.md'), 'utf8');
    expect(stamps).toContain('🥽');
    expect(stamps).toContain('🖥');
    expect(stamps).toContain('🔩');
    expect(stamps).not.toContain('setup pack / npm kit');
    const op = readFileSync(join(process.cwd(), 'grok-bot/OP-PROC.md'), 'utf8').split('\n');
    const opLines = op.at(-1) === '' ? op.length - 1 : op.length;
    expect(opLines).toBeLessThanOrEqual(30);
  });
});
