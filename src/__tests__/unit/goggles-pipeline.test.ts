import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  cascadeOf,
  findPlatesDir,
  listPipelineIds,
  cycle,
  look,
} from '../../integrations/hooks/goggles-pipeline.mjs';

const platesDir = findPlatesDir(dirname(fileURLToPath(import.meta.url)));

describe('goggles look', () => {
  it('peers routing, then examines, triages, and cascades only the pick', () => {
    expect(platesDir).toBeTruthy();
    const ids = listPipelineIds(platesDir!);
    expect(ids).toContain('routing');
    expect(ids).toContain('house');
    expect(ids).not.toContain('grokbot');

    const top = look(['routing'], platesDir!);
    expect(top.ok).toBe(true);
    expect(top.text).toBe(
      [
        'From: ground',
        'Digest: Task text becomes an agent.',
        'Filled: plate, files',
      ].join('\n'),
    );
    expect(top.text).not.toContain('Cascade');
    expect(top.text).not.toContain('@');

    const root = dirname(dirname(dirname(platesDir!)));
    const worn = existsSync(join(root, 'dist', 'nucleus', 'thin-dispatch.js'));
    if (worn) {
      expect(look(['routing', 'examine'], platesDir!).text).toBe('Holds.');
      expect(look(['routing', 'triage'], platesDir!).text).toBe('Pick: resolveThinDispatch');
      expect(look(['routing', 'cascade'], platesDir!).text).toBe(
        [
          'From: pipeline/routing',
          'Digest: A null provider returns the score unchanged. A worn provider can change the agent.',
          'Filled:',
        ].join('\n'),
      );
    } else {
      const drift = 'Drift: the worn build is not src/nucleus/thin-dispatch.ts';
      expect(look(['routing', 'examine'], platesDir!).text).toBe(drift);
      expect(look(['routing', 'triage'], platesDir!).text).toBe(
        'Pick: the worn build is not src/nucleus/thin-dispatch.ts',
      );
      expect(look(['routing', 'cascade'], platesDir!).text).toBe('No cascade.');
    }

    const house = look(['house'], platesDir!);
    expect(house.text).toContain('From: ground');
    expect(house.text).toContain('Filled: plate, files');
    expect(house.text).not.toContain('entry');
  });

  it('peers a drawing and does not cascade it', () => {
    expect(look(['boot'], platesDir!).text).toContain('Filled: plate');
    expect(look(['boot'], platesDir!).text).not.toContain('files');
    expect(look(['boot', 'examine'], platesDir!).text).toBe('Drawing only.');
    expect(look(['boot', 'triage'], platesDir!).text).toBe('Pick: none');
    expect(look(['boot', 'cascade'], platesDir!).text).toBe('No cascade.');
  });

  it('peers ground and refuses a plane, a depth number, and an unpicked item', () => {
    const home = look(['ground'], platesDir!);
    expect(home.text).toBe(
      ['From: ground', 'Digest: Home. The dev plane.', 'Filled: files, skills'].join('\n'),
    );
    expect(look(['ground', 'examine'], platesDir!).text).toBe('Holds.');
    expect(look(['ground', 'triage'], platesDir!).text).toBe('Pick: none');
    expect(look(['ground', 'cascade'], platesDir!).text).toBe('No cascade.');

    expect(look(['domain'], platesDir!).text).toBe('Not a plane yet. Planes: ground, pipeline.');
    expect(look(['routing', 'house'], platesDir!).text).toBe('Name one pipeline.');
    expect(look(['routing', '2'], platesDir!).text).toBe(
      'A depth number is not a look. Looks: peer, examine, triage, cascade.',
    );
    expect(look(['ground', 'code'], platesDir!).text).toBe('Triage did not name code.');
    expect(cascadeOf('┌─┐\n│ OUTPUT LAYER                 v                              │\n')).toEqual([
      'OUTPUT LAYER',
    ]);
  });

  it('writes a scratch, refuses a step out of order, and teardown deletes it', () => {
    const scratch = join(mkdtempSync(join(tmpdir(), 'goggles-')), 'scratch.json');
    const peer = cycle(['routing'], platesDir!, scratch);
    expect(peer.text).toContain('Filled: plate, files');
    expect(peer.text).not.toContain('entry');
    const saved = JSON.parse(readFileSync(scratch, 'utf8'));
    expect(saved.filled).toEqual(['plate', 'files']);
    expect(saved.examine).toBeNull();

    expect(cycle(['cascade'], platesDir!, scratch).text).toBe('Examine first.');
    expect(cycle(['triage'], platesDir!, scratch).text).toBe('Examine first.');
    expect(existsSync(scratch)).toBe(true);

    const exam = cycle(['examine'], platesDir!, scratch);
    expect(exam.text === 'Holds.' || exam.text.startsWith('Drift:')).toBe(true);
    const triaged = cycle(['triage'], platesDir!, scratch);
    expect(triaged.text.startsWith('Pick:')).toBe(true);
    const cascaded = cycle(['cascade'], platesDir!, scratch);
    if (triaged.text === 'Pick: resolveThinDispatch') {
      expect(cascaded.text).toContain('From: pipeline/routing');
      expect(cascaded.text).not.toContain('entry');
    } else {
      expect(cascaded.text).toBe('No cascade.');
    }

    const back = cycle(['teardown'], platesDir!, scratch);
    expect(back.text.startsWith('Ground.')).toBe(true);
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['examine'], platesDir!, scratch).text).toBe('The scratch is empty.');
    rmSync(dirname(scratch), { recursive: true, force: true });
  });
});
