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
  notesWithPopJob,
  writePopJob,
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

    const dir = mkdtempSync(join(tmpdir(), 'goggles-see-'));
    const table = join(dir, 'pops.json');
    for (const name of ['routing', 'house', 'boot', 'ground']) {
      expect(cycle(['pop', name, 'seed'], null, null, undefined, table).ok).toBe(true);
    }
    const see = (argv: string[]) => look(argv, platesDir!, table);

    expect(see(['routing']).text).toBe(
      [
        'From: ground',
        'Digest: Task text becomes an agent.',
        'Filled: plate, files, worn',
      ].join('\n'),
    );
    expect(see(['house']).text).toContain('Filled: plate, files');
    expect(see(['house']).text).not.toContain('entry');
    expect(see(['boot']).text).toContain('Filled: plate');
    expect(see(['ground']).text).toBe(
      ['From: ground', 'Digest: Home. The dev plane.', 'Filled: files, skills'].join('\n'),
    );
    expect(look(['domain'], platesDir!).text).toBe('Not a plane yet. Planes: ground, pipeline.');
    expect(look(['routing', '2'], platesDir!).text).toBe(
      'A depth number is not a look. Looks: peer, examine, triage, cascade.',
    );
    expect(see(['ground', 'code']).text).toBe('Triage did not name code.');
    expect(see(['boot', 'examine']).text).toBe('Drawing only.');
    rmSync(dir, { recursive: true, force: true });
    expect(cascadeOf('┌─┐\n│ OUTPUT LAYER                 v                              │\n')).toEqual([
      'OUTPUT LAYER',
    ]);
  });

  it('walks the scratch in order and cascades a line that is already in the file', () => {
    const scratch = join(mkdtempSync(join(tmpdir(), 'goggles-')), 'scratch.json');
    const root = dirname(dirname(dirname(platesDir!)));
    expect(cycle(['pop', 'routing', 'Task text becomes an agent.'], null, scratch).ok).toBe(true);
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
    expect(cycle(['pop', 'ground', 'Home. The dev plane.'], null, join(root, '.xray', 'state', 'goggles-scratch.json')).ok).toBe(true);
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
    expect(cycle(['pop', 'boot', 'Drawing only.'], null, scratch).ok).toBe(true);
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
    expect(cycle(['pop', 'boot', 'Drawing only.'], null, scratch).ok).toBe(true);
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
    expect(readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8')).toContain('## Pop job');
    rmSync(root, { recursive: true, force: true });
  });
});

describe('pops', () => {
  it('hits a stored line and does not open a plane', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-pop-'));
    const scratch = join(dir, 'scratch.json');
    const table = join(dir, 'pops.json');
    const wrote = cycle(['pop', 'routing', 'Task text becomes an agent.'], null, scratch);
    expect(wrote.ok).toBe(true);
    expect(wrote.text).toBe('Task text becomes an agent.');
    const hit = cycle(['pop', 'routing'], null, scratch);
    expect(hit.text).toBe('Task text becomes an agent.');
    expect(cycle(['pop', 'missing'], null, scratch).text).toBe('Empty.');
    expect(cycle(['pop'], null, scratch).text).toBe('Name one pop.');
    expect(cycle(['pop', 'routing'], null, scratch).text).toBe('Task text becomes an agent.');
    const saved = JSON.parse(readFileSync(table, 'utf8'));
    expect(saved.facets.routing).toBe('Task text becomes an agent.');
    expect(saved.streak).toBe(2);
    expect(saved.facets.missing).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it('stops at three hits, and teardown keeps the table', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-pop3-'));
    const scratch = join(dir, 'scratch.json');
    const table = join(dir, 'pops.json');
    expect(cycle(['pop', 'wake-cascade', 'Chat is not the brain.'], null, scratch).ok).toBe(true);
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Chat is not the brain.');
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Chat is not the brain.');
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Chat is not the brain.');
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Act.');
    expect(cycle(['pop', 'missing'], null, scratch).text).toBe('Empty.');
    expect(JSON.parse(readFileSync(table, 'utf8')).streak).toBe(3);
    expect(JSON.parse(readFileSync(table, 'utf8')).facets.missing).toBeUndefined();
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Act.');

    writeFileSync(scratch, `${JSON.stringify({ digest: 'Home. The dev plane.' })}\n`);
    expect(cycle(['teardown'], platesDir, scratch).text.startsWith('Ground.')).toBe(true);
    expect(existsSync(scratch)).toBe(false);
    expect(existsSync(table)).toBe(true);
    expect(JSON.parse(readFileSync(table, 'utf8')).streak).toBe(0);
    expect(cycle(['pop', 'wake-cascade'], null, scratch).text).toBe('Chat is not the brain.');
    rmSync(dir, { recursive: true, force: true });
  });

  it('the wear writes the pop job and keeps the notes body', () => {
    const body = '**Pickup line:** old\n\n# Stay\n\nThe body stays.\n\n## This cut\n\nPR #161. Not merged. Not published. Not the cache.\n';
    const once = notesWithPopJob(body);
    expect(once).toContain('The body stays.');
    expect(once).toContain('## Pop job');
    expect(once).toContain('A pop is not a law.');
    expect(once).toContain('A slow look opens a plane only when that name is already popped.');
    expect(once).not.toContain('still opens a plane that was never popped');
    expect(once).not.toContain('Not the cache.');
    expect(notesWithPopJob(once)).toBe(once);

    const stale = [
      '## This cut',
      '',
      'PR #161. Not merged. Not published. The hit table is `.xray/state/pops.json`. The slow look still opens a plane that was never popped.',
      '',
      '## Pop job',
      '',
      'Left: the slow look still opens a plane that was never popped.',
      '',
    ].join('\n');
    const next = notesWithPopJob(stale);
    expect(next).not.toContain('still opens a plane that was never popped');
    expect(next).toContain('A slow look opens a plane only when that name is already popped.');
    expect(notesWithPopJob(next)).toBe(next);
  });

  it('does not open a plane that was never popped', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-unpopped-'));
    const scratch = join(dir, 'scratch.json');
    expect(cycle(['routing'], null, scratch).text).toBe('Empty.');
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['pop', 'routing', 'Task text becomes an agent.'], null, scratch).ok).toBe(true);
    const opened = cycle(['routing'], platesDir, scratch);
    expect(opened.text).toContain('Filled: plate, files, worn');
    expect(opened.text).not.toBe('Task text becomes an agent.');
    expect(cycle(['house'], platesDir, scratch).text).toBe('Empty.');
    expect(JSON.parse(readFileSync(scratch, 'utf8')).id).toBe('routing');
    rmSync(dir, { recursive: true, force: true });
  });

  it('a miss leaves the table and does not invent a facet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-miss-'));
    const scratch = join(dir, 'scratch.json');
    const table = join(dir, 'pops.json');
    expect(cycle(['pop', 'gibberish'], null, scratch).text).toBe('Empty.');
    expect(existsSync(scratch)).toBe(false);
    expect(JSON.parse(readFileSync(table, 'utf8'))).toEqual({ facets: {}, streak: 0 });
    rmSync(dir, { recursive: true, force: true });
  });

  it('the wear leaves an empty table when the file is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-wear-table-'));
    const table = join(root, '.xray', 'state', 'pops.json');
    writePopJob(root);
    expect(JSON.parse(readFileSync(table, 'utf8'))).toEqual({ facets: {}, streak: 0 });
    writeFileSync(table, `${JSON.stringify({ facets: { routing: 'stay' }, streak: 2 }, null, 2)}\n`);
    writePopJob(root);
    expect(JSON.parse(readFileSync(table, 'utf8')).facets.routing).toBe('stay');
    expect(JSON.parse(readFileSync(table, 'utf8')).streak).toBe(2);
    rmSync(root, { recursive: true, force: true });
  });
});
