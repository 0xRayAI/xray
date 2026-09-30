import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  maintainLens,
  notesWithPickup,
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

  it('the suit writes the lens and replaces only the notes pickup', () => {
    expect(notesWithPickup('**Pickup line:** old\n\n# Stay\n\nBody.\n', 'From: ground Digest: Home.')).toBe(
      '**Pickup line:** From: ground Digest: Home.\n\n# Stay\n\nBody.\n',
    );
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(join(root, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
    const written = maintainLens(root, platesDir!);
    expect(written.ok).toBe(true);
    const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
    expect(lens).toContain('From: ground');
    expect(lens).toContain('Digest: Home. The dev plane.');
    const notes = readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8');
    expect(notes).toContain('# Stay');
    expect(notes).toContain('The body stays.');
    expect(notes).not.toContain('old job');
    expect(notes).toContain('Home. The dev plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('the lens keeps the examine and triage already on the scratch', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-steps-'));
    const scratch = join(root, '.xray', 'state', 'goggles-scratch.json');
    expect(cycle(['boot'], platesDir!, scratch).text).toContain('Filled: plate');
    expect(cycle(['examine'], platesDir!, scratch).text).toBe('Drawing only.');
    expect(cycle(['triage'], platesDir!, scratch).text).toBe('Pick: none');
    const written = maintainLens(root, platesDir!);
    expect(written.ok).toBe(true);
    expect(written.text).toContain('Drawing only.');
    expect(written.text).toContain('Pick: none');
    const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
    expect(lens).toContain('Drawing only.');
    expect(lens).toContain('Pick: none');
    rmSync(root, { recursive: true, force: true });
  });

  it('an empty scratch leaves a lens that was already written', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-keep-'));
    const scratch = join(root, '.xray', 'state', 'goggles-scratch.json');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(join(root, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
    expect(cycle(['boot'], platesDir!, scratch).text).toContain('Filled: plate');
    expect(cycle(['examine'], platesDir!, scratch).text).toBe('Drawing only.');
    expect(cycle(['triage'], platesDir!, scratch).text).toBe('Pick: none');
    expect(maintainLens(root, platesDir!).ok).toBe(true);
    expect(cycle(['teardown'], platesDir!, scratch).text.startsWith('Ground.')).toBe(true);
    const lensBefore = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
    const notesBefore = readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8');
    const again = maintainLens(root, platesDir!);
    expect(again.ok).toBe(true);
    expect(again.text).toContain('Drawing only.');
    expect(again.text).toContain('Pick: none');
    expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe(lensBefore);
    expect(readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8')).toBe(notesBefore);
    expect(existsSync(scratch)).toBe(false);
    rmSync(root, { recursive: true, force: true });
  });
});
