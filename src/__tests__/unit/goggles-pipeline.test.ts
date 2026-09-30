import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assemblePlane,
  cascadeOf,
  cycle,
  filledOf,
  findPlatesDir,
  listPipelineIds,
  look,
} from '../../integrations/hooks/goggles-pipeline.mjs';

const platesDir = findPlatesDir(dirname(fileURLToPath(import.meta.url)));

describe('goggles plane body', () => {
  it('uses the same fields for every plane and leaves empty ones out', () => {
    expect(filledOf({
      plate: 'docs-site/docs/plates/routing.md',
      entry: 'scoreAndRoute',
      exit: 'agent',
      files: ['src/nucleus/thin-dispatch.ts'],
    })).toEqual(['plate', 'entry', 'exit', 'files']);
    expect(filledOf({ plate: 'docs-site/docs/plates/boot.md' })).toEqual(['plate']);
    expect(filledOf({
      files: ['src'],
      unpathed: ['mill'],
      skills: 'SKILLS.md',
    })).toEqual(['files', 'skills']);

    const routing = assemblePlane('routing', platesDir!);
    expect(routing?.entry).toBeNull();
    expect(routing?.exit).toBeNull();
    expect(filledOf(routing!)).toEqual(['plate', 'files', 'worn']);
    expect(filledOf(assemblePlane('boot', platesDir!)!)).toEqual(['plate']);
    expect(filledOf(assemblePlane('ground', platesDir!)!)).toEqual(['files', 'skills']);
  });

  it('peers from the plane body, not a per-plane printer', () => {
    expect(platesDir).toBeTruthy();
    const ids = listPipelineIds(platesDir!);
    expect(ids).toContain('routing');
    expect(ids).toContain('house');
    expect(ids).not.toContain('grokbot');

    expect(look(['routing'], platesDir!).text).toBe(
      [
        'From: ground',
        'Digest: Task text becomes an agent.',
        'Filled: plate, files, worn',
      ].join('\n'),
    );
    expect(look(['house'], platesDir!).text).toContain('Filled: plate, files');
    expect(look(['house'], platesDir!).text).not.toContain('entry');
    expect(look(['boot'], platesDir!).text).toContain('Filled: plate');
    expect(look(['ground'], platesDir!).text).toBe(
      ['From: ground', 'Digest: Home. The dev plane.', 'Filled: files, skills'].join('\n'),
    );
    expect(look(['domain'], platesDir!).text).toBe('Not a plane yet. Planes: ground, pipeline.');
    expect(look(['routing', '2'], platesDir!).text).toBe(
      'A depth number is not a look. Looks: peer, examine, triage, cascade.',
    );
    expect(look(['ground', 'code'], platesDir!).text).toBe('Triage did not name code.');
    expect(look(['boot', 'examine'], platesDir!).text).toBe('Drawing only.');
    expect(cascadeOf('┌─┐\n│ OUTPUT LAYER                 v                              │\n')).toEqual([
      'OUTPUT LAYER',
    ]);
  });

  it('walks the scratch in order and cascades a line that is already in the file', () => {
    const scratch = join(mkdtempSync(join(tmpdir(), 'goggles-')), 'scratch.json');
    const root = dirname(dirname(dirname(platesDir!)));
    const peer = cycle(['routing'], platesDir!, scratch);
    expect(peer.text).toContain('Filled: plate, files, worn');
    const saved = JSON.parse(readFileSync(scratch, 'utf8'));
    expect(saved.filled).toEqual(['plate', 'files', 'worn']);
    expect(saved.filled).not.toContain('entry');

    expect(cycle(['cascade'], platesDir!, scratch).text).toBe('Examine first.');
    const exam = cycle(['examine'], platesDir!, scratch).text;
    const worn = existsSync(join(root, 'dist', 'nucleus', 'thin-dispatch.js'));
    expect(exam).toBe(worn ? 'Holds.' : 'Drift: the worn build is not src/nucleus/thin-dispatch.ts');
    const triaged = cycle(['triage'], platesDir!, scratch).text;
    const cascaded = cycle(['cascade'], platesDir!, scratch).text;
    if (exam === 'Holds.') {
      expect(triaged).toBe('Pick: resolveThinDispatch');
      expect(cascaded).toContain('From: pipeline/routing');
      expect(cascaded).toContain('provider.resolveThinDispatch');
      expect(cascaded).not.toContain('Filled: plate');
    } else {
      expect(triaged).toBe('Pick: the worn build is not src/nucleus/thin-dispatch.ts');
      expect(cascaded).toBe('No cascade.');
    }

    const back = cycle(['teardown'], platesDir!, scratch);
    expect(back.text.startsWith('Ground.')).toBe(true);
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['examine'], platesDir!, scratch).text).toBe('The scratch is empty.');
    rmSync(dirname(scratch), { recursive: true, force: true });
  });
});
