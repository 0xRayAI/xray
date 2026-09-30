import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  cascadeOf,
  findPlatesDir,
  listPipelineIds,
  lookPipeline,
} from '../../integrations/hooks/goggles-pipeline.mjs';

const platesDir = findPlatesDir(dirname(fileURLToPath(import.meta.url)));

describe('pipeline goggles', () => {
  it('reads one pipeline cascade and leaves domain plates out', () => {
    expect(platesDir).toBeTruthy();
    const ids = listPipelineIds(platesDir!);
    expect(ids).toContain('routing');
    expect(ids).toContain('house');
    expect(ids).not.toContain('grokbot');

    const routing = lookPipeline('routing', platesDir!);
    expect(routing.ok).toBe(true);
    expect(routing.text).toBe(
      [
        'Plane: pipeline',
        'One: routing',
        'Cascade: INPUT LAYER → PROCESSING LAYER → OUTPUT LAYER',
        'Take: Task text becomes an agent.',
      ].join('\n'),
    );

    const house = lookPipeline('house', platesDir!);
    expect(house.ok).toBe(true);
    expect(house.text).toContain(
      'Cascade: EMPTY → STARTER FILES COPIED → HEADINGS FILLED → OWNER APPROVES → DOCTOR · House: PASS?',
    );
    expect(house.text).toContain('Take: A state flow plate:');

    const processor = lookPipeline('processor', platesDir!);
    expect(processor.text).toContain(
      'Cascade: INPUT LAYER → PROCESSING LAYER → OUTPUT LAYER',
    );
  });

  it('names one pipeline and drops a trailing arrow mark', () => {
    const missed = lookPipeline('routing,house', platesDir!);
    expect(missed.ok).toBe(false);
    expect(missed.text).toMatch(/^Name one pipeline: /);
    expect(missed.text).not.toMatch(/grokbot/);

    expect(cascadeOf('┌─┐\n│ OUTPUT LAYER                 v                              │\n')).toEqual([
      'OUTPUT LAYER',
    ]);
  });
});
