import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  cascadeOf,
  findPlatesDir,
  listPipelineIds,
  look,
} from '../../integrations/hooks/goggles-pipeline.mjs';

const platesDir = findPlatesDir(dirname(fileURLToPath(import.meta.url)));

describe('goggles snapshot', () => {
  it('digests one pipeline and cascades into the seam', () => {
    expect(platesDir).toBeTruthy();
    const ids = listPipelineIds(platesDir!);
    expect(ids).toContain('routing');
    expect(ids).toContain('house');
    expect(ids).not.toContain('grokbot');

    const top = look(['routing'], platesDir!);
    expect(top.ok).toBe(true);
    expect(top.text).toBe(
      [
        'Snapshot: pipeline/routing@1',
        'Digest: Task text becomes an agent.',
        'Cascade: INPUT LAYER → PROCESSING LAYER → OUTPUT LAYER',
        'Deeper: 2',
      ].join('\n'),
    );

    const seam = look(['pipeline', 'routing', '2'], platesDir!);
    expect(seam.text).toContain('Snapshot: pipeline/routing@2');
    expect(seam.text).toContain('scoreAndRoute in src/nucleus/thin-dispatch.ts');
    expect(seam.text).toContain('Deeper: 3');

    const bottom = look(['routing', '3'], platesDir!);
    expect(bottom.text).toContain('A null provider returns the score unchanged.');
    expect(bottom.text).toContain('Deeper: none');

    const house = look(['house', '2'], platesDir!);
    expect(house.text).toContain('seat-doctor in grok-bot/lib/seat-doctor.cjs');
    expect(house.text).toContain('Deeper: none');

    const drawing = look(['boot', '2'], platesDir!);
    expect(drawing.text).toContain('Drawing only. No file named.');
  });

  it('snapshots ground, then one part, and refuses a plane that is not real', () => {
    const home = look(['ground'], platesDir!);
    expect(home.text).toContain('Snapshot: ground@1');
    expect(home.text).toContain('code → OP-PROC → model → suit → mill → host → test/ship');
    expect(home.text).toContain('Deeper: name one');

    const code = look(['ground', 'code'], platesDir!);
    expect(code.text).toContain('Snapshot: ground/code@2');
    expect(code.text).toContain('Cascade: src');
    expect(code.text).toContain('Deeper: none');

    expect(look(['domain'], platesDir!).text).toBe('Not a plane yet. Planes: ground, pipeline.');
    expect(look(['routing', 'house'], platesDir!).text).toBe('Name one pipeline.');
    expect(look(['routing', '9'], platesDir!).text).toBe('No deeper.');
    expect(cascadeOf('┌─┐\n│ OUTPUT LAYER                 v                              │\n')).toEqual([
      'OUTPUT LAYER',
    ]);
  });
});
