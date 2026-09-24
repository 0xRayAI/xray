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
    ]);
    for (const id of PLATE_IDS) {
      const plate = loadPlate(id);
      expect(plate.id).toBe(id);
      expect(plate.body).toMatch(BOX);
      expect(plate.body).toContain('INPUT');
      expect(plate.body).toContain('OUTPUT');
    }
  });

  it('recalls the processor plate from pre-processor speech and nothing from unrelated text', () => {
    expect(recallPlate('execute pre processors')?.id).toBe('processor');
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
  }, 120000);
});
