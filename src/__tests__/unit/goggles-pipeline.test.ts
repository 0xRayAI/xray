import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';
import {
  assemblePlane,
  cascadeOf,
  cycle,
  filledOf,
  findPlatesDir,
  listPipelineIds,
  look,
  cardStop,
  handCard,
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
      expect(cycle(['pop', name, 'facet', 'seed'], null, null, undefined, table).ok).toBe(true);
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
    expect(cycle(['pop', 'routing', 'facet', 'Task text becomes an agent.'], null, scratch).ok).toBe(true);
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
    expect(cycle(['pop', 'ground', 'facet', 'Home. The dev plane.'], null, join(root, '.xray', 'state', 'goggles-scratch.json')).ok).toBe(true);
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
    expect(cycle(['pop', 'boot', 'facet', 'Drawing only.'], null, scratch).ok).toBe(true);
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
    expect(cycle(['pop', 'boot', 'facet', 'Drawing only.'], null, scratch).ok).toBe(true);
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
  it('moves facet, feat, and fix without opening the plane', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-pop-'));
    const scratch = join(dir, 'scratch.json');
    const table = join(dir, 'pops.json');
    const card = [
      'From: ground',
      'Digest: Task text becomes an agent.',
      'Filled: plate, files, worn',
      'Up to speed: Empty.',
      'Deep dive: files: src/nucleus/thin-dispatch.ts',
    ].join('\n');
    expect(cycle(['pop', 'routing'], platesDir, scratch).text).toBe(card);
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['pop', 'routing'], null, scratch).text).toBe(card);
    expect(cycle(['pop', 'routing', 'files'], platesDir, scratch).text).toBe('files: src/nucleus/thin-dispatch.ts');
    expect(cycle(['pop', 'routing', 'files'], null, scratch).text).toBe('files: src/nucleus/thin-dispatch.ts');
    expect(cycle(['pop', 'routing', 'worn'], platesDir, scratch).text).toBe('worn: dist/nucleus/thin-dispatch.js');
    expect(cycle(['pop', 'routing', 'entry'], null, scratch).text).toBe('Empty.');
    expect(cycle(['pop', 'routing', 'skills'], null, scratch).text).toBe('Empty.');
    expect(cycle(['pop', 'ground', 'skills'], platesDir, scratch).text).toBe('skills: SKILLS.md');
    expect(cycle(['pop', 'routing', 'facet'], platesDir, scratch).text).toBe('Empty.');
    expect(cycle(['pop', 'routing', 'facet'], null, scratch).text).toBe('Empty.');
    expect(cycle(['pop', 'hands', 'fix', 'a kind is chosen, not ordered'], null, scratch).text).toBe('fix: a kind is chosen, not ordered');
    expect(cycle(['pop', 'hands', 'facet'], null, scratch).text).toBe('Empty.');
    expect(cycle(['pop', 'hands', 'fix'], null, scratch).text).toBe('fix: a kind is chosen, not ordered');
    expect(cycle(['pop', 'routing', 'not-a-kind', 'no'], null, scratch).text).toBe('not-a-kind: no\nFrom: ground');
    expect(cycle(['pop', 'routing', 'bogus'], null, scratch).text).toBe('Name a field.');
    expect(cycle(['pop', 'boot'], platesDir, scratch).text.startsWith('From: ground')).toBe(true);
    expect(cycle(['house'], platesDir, scratch).text).toBe('Empty.');
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['pop', 'house', 'fix', 'a fix alone is enough'], null, scratch).text).toBe('fix: a fix alone is enough');
    expect(cycle(['house'], platesDir, scratch).text).toContain('Filled: plate, files');
    expect(cycle(['pop', 'missing', 'feat'], null, scratch).text).toBe('Empty.');
    const seen = cycle(['pop'], null, scratch);
    expect(seen.text).toContain('boot  From: ground');
    expect(seen.text).toContain('ground  From: ground');
    expect(seen.text).toContain('routing  From: ground');
    expect(seen.text).not.toContain('\nhands');
    expect(seen.text.startsWith('hands')).toBe(false);
    const saved = JSON.parse(readFileSync(table, 'utf8'));
    expect(saved.planes.routing.card.digest).toBe('Task text becomes an agent.');
    expect(saved.planes.routing.fields.files).toBe('src/nucleus/thin-dispatch.ts');
    expect(saved.planes.routing.facet).toBeUndefined();
    expect(saved.planes.hands).toEqual({ fix: 'a kind is chosen, not ordered' });
    expect(saved.planes.missing).toBeUndefined();
    expect(saved.streak).toBeUndefined();

    writeFileSync(scratch, `${JSON.stringify({ digest: 'Home. The dev plane.' })}\n`);
    expect(cycle(['teardown'], platesDir, scratch).text.startsWith('Ground.')).toBe(true);
    expect(existsSync(scratch)).toBe(false);
    expect(JSON.parse(readFileSync(table, 'utf8')).planes.routing.facet).toBeUndefined();
    rmSync(dir, { recursive: true, force: true });
  });

  it('the wear writes the pop job and keeps the notes body', () => {
    const body = '**Pickup line:** old\n\n# Stay\n\nThe body stays.\n\n## This cut\n\nPR #161. Not merged. Not published. Not the cache.\n';
    const once = notesWithPopJob(body);
    expect(once).toContain('The body stays.');
    expect(once).toContain('## Pop job');
    expect(once).toContain('A pop is not a law.');
    expect(once).toContain('A pop of a plane returns its card: from, the digest, and the filled fields.');
    expect(once).toContain('A pop with no name is a glimpse of every plane');
    expect(once).toContain('A higher-order kind is about that relation, not a new law.');
    expect(once).toContain('A slow look opens a plane only when that name was already popped.');
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
    expect(next).toContain('A slow look opens a plane only when that name was already popped.');
    expect(notesWithPopJob(next)).toBe(next);
  });

  it('does not open a plane that was never popped', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-unpopped-'));
    const scratch = join(dir, 'scratch.json');
    expect(cycle(['routing'], null, scratch).text).toBe('Empty.');
    expect(existsSync(scratch)).toBe(false);
    expect(cycle(['pop', 'routing', 'facet', 'Task text becomes an agent.'], null, scratch).ok).toBe(true);
    const opened = cycle(['routing'], platesDir, scratch);
    expect(opened.text).toContain('Filled: plate, files, worn');
    expect(opened.text).not.toBe('Task text becomes an agent.');
    expect(cycle(['house'], platesDir, scratch).text).toBe('Empty.');
    expect(JSON.parse(readFileSync(scratch, 'utf8')).id).toBe('routing');
    rmSync(dir, { recursive: true, force: true });
  });

  it('glimpses every plane, then one way in, and records one outcome', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-useful-'));
    const scratch = join(dir, 'scratch.json');
    const seen = cycle(['pop'], platesDir, scratch);
    expect(seen.ok).toBe(true);
    expect(existsSync(scratch)).toBe(false);
    expect(seen.text).toContain('ground  From: ground  Digest: Home. The dev plane.');
    expect(seen.text).toContain('routing  From: ground');
    expect(seen.text).not.toContain('grokbot');
    expect(seen.text).not.toContain('Up to speed');
    expect(cycle(['pop'], null, scratch).text).toBe(seen.text);

    const ground = cycle(['pop', 'ground'], platesDir, scratch).text;
    expect(ground).toContain('Up to speed: skills: SKILLS.md');
    expect(ground).toContain('Deep dive: files: src');
    expect(cycle(['pop', 'ground', 'speed'], null, scratch).text).toBe('Up to speed: skills: SKILLS.md');
    expect(cycle(['pop', 'ground', 'dive'], null, scratch).text).toBe('Deep dive: files: src');
    expect(existsSync(scratch)).toBe(false);

    expect(cycle(['pop', 'routing', 'speed'], null, scratch).text).toBe('Up to speed: Empty.');
    expect(cycle(['pop', 'routing', 'dive'], platesDir, scratch).text).toBe(
      'Deep dive: files: src/nucleus/thin-dispatch.ts',
    );
    expect(cycle(['pop', 'routing', 'dive'], null, scratch).text).toBe(
      'Deep dive: files: src/nucleus/thin-dispatch.ts',
    );
    expect(cycle(['pop', 'boot', 'dive'], platesDir, scratch).text).toBe(
      'Deep dive: plate: docs-site/docs/plates/boot.md',
    );
    expect(cycle(['pop', 'boot', 'speed'], null, scratch).text).toBe('Up to speed: Empty.');

    expect(cycle(
      ['pop', 'boot', 'facet', 'From ground, boot is a plate and nothing else.'],
      null,
      scratch,
    ).text).toBe('facet: From ground, boot is a plate and nothing else.');
    expect(cycle(['pop', 'boot'], null, scratch).text).toContain(
      'Outcome:\nfacet: From ground, boot is a plate and nothing else.',
    );
    expect(cycle(['pop', 'house', 'none'], null, scratch).text).toBe('none');
    expect(cycle(['pop', 'house', 'none'], null, scratch).text).toBe('none');
    expect(cycle(
      ['pop', 'routing', 'recenter', 'From ground, the file does not change the home job.'],
      null,
      scratch,
    ).text).toBe('recenter: From ground, the file does not change the home job.\nFrom: ground');

    const saved = JSON.parse(readFileSync(join(dir, 'pops.json'), 'utf8'));
    expect(saved.planes.routing.outcomes.recenter.from).toBe('ground');
    expect(saved.planes.routing.outcomes.recenter.line).toContain('From ground');
    expect(saved.planes.house.none).toBe('none');
    expect(saved.planes.boot.facet).toContain('From ground');
    expect(existsSync(scratch)).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('a miss leaves the table and does not invent a facet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-miss-'));
    const scratch = join(dir, 'scratch.json');
    const table = join(dir, 'pops.json');
    expect(cycle(['pop', 'gibberish', 'feat'], null, scratch).text).toBe('Empty.');
    expect(existsSync(scratch)).toBe(false);
    expect(JSON.parse(readFileSync(table, 'utf8'))).toEqual({ planes: {} });
    rmSync(dir, { recursive: true, force: true });
  });

  it('the wear leaves an empty table when the file is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-wear-table-'));
    const table = join(root, '.xray', 'state', 'pops.json');
    writePopJob(root);
    expect(JSON.parse(readFileSync(table, 'utf8'))).toEqual({ planes: {} });
    writeFileSync(table, `${JSON.stringify({ facets: { routing: 'stay' }, streak: 2 }, null, 2)}\n`);
    writePopJob(root);
    expect(JSON.parse(readFileSync(table, 'utf8')).facets.routing).toBe('stay');
    expect(JSON.parse(readFileSync(table, 'utf8')).streak).toBe(2);
    writeFileSync(table, `${JSON.stringify({ facets: {}, streak: 3 })}\n`);
    writePopJob(root);
    expect(JSON.parse(readFileSync(table, 'utf8'))).toEqual({ planes: {} });
    rmSync(root, { recursive: true, force: true });
  });

  it('stops a wide search when the card is already stored and stays quiet otherwise', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-stop-'));
    const table = join(root, '.xray', 'state', 'pops.json');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(table, JSON.stringify({
      planes: {
        routing: {
          card: { from: 'ground', digest: 'Task text becomes an agent.', filled: ['plate', 'files'] },
          fields: { files: 'src/nucleus/thin-dispatch.ts' },
          facet: 'invented stamp that must not be the reason',
          feat: 'follow the stored move',
        },
      },
    }));
    const stopped = cardStop(root, 'grep', 'routing', []);
    expect(stopped?.gate).toBe('goggles');
    expect(stopped?.decision).toBe('deny');
    expect(stopped?.reason).toBe('routing. From: ground. Digest: Task text becomes an agent. Filled: plate, files. Open: src/nucleus/thin-dispatch.ts');
    expect(stopped?.reason).not.toContain('invented');
    expect(stopped?.reason).not.toContain('feat:');
    expect(cardStop(root, 'grep', 'routing', ['src/nucleus'])?.reason).toContain('Open: src/nucleus/thin-dispatch.ts');
    expect(cardStop(root, 'read_file', 'routing', [])?.reason).toContain('Open: src/nucleus/thin-dispatch.ts');
    expect(cardStop(root, 'grep', 'routing', ['src/nucleus/thin-dispatch.ts'])).toBeNull();
    expect(cardStop(root, 'bash', 'rg routing src/nucleus/thin-dispatch.ts', [])).toBeNull();
    const drawn = cardStop(
      root,
      'read_file',
      'docs-site/docs/plates/routing.md',
      ['docs-site/docs/plates/routing.md'],
      { target_file: 'docs-site/docs/plates/routing.md', offset: 1 },
    );
    expect(drawn?.decision).toBe('allow');
    expect(drawn?.hookSpecificOutput?.updatedInput).toEqual({
      target_file: 'src/nucleus/thin-dispatch.ts',
      offset: 1,
    });
    expect(drawn?.hookSpecificOutput?.additionalContext).toBeUndefined();
    expect(drawn?.reason).toBeUndefined();
    const missed = cardStop(
      root,
      'read_file',
      'docs-site/docs/plates/routing.md',
      ['docs-site/docs/plates/routing.md'],
      {},
    );
    expect(missed?.decision).toBe('deny');
    expect(missed?.reason).toContain('Open: src/nucleus/thin-dispatch.ts');
    expect(missed?.reason).not.toContain('feat:');
    expect(cardStop(root, 'read_file', 'src/nucleus/thin-dispatch.ts', ['src/nucleus/thin-dispatch.ts'])).toBeNull();
    const carried = cardStop(root, 'bash', 'npm test', []);
    expect(carried?.decision).toBe('deny');
    expect(carried?.reason).toBe('feat: follow the stored move');
    expect(carried?.reason).not.toContain('invented');
    expect(cardStop(root, 'bash', 'npm test', [])).toBeNull();
    expect(cardStop(root, 'grep', 'routing and house', [])).toBeNull();
    expect(cardStop(root, 'grep', 'goggles routing', [])).toBeNull();
    expect(cardStop(root, 'grep', 'feat/goggles-look routing', [])?.reason).toContain('Open: src/nucleus/thin-dispatch.ts');
    expect(cardStop(root, 'read_file', 'routing', [])).toBeNull();

    const fresh = mkdtempSync(join(tmpdir(), 'goggles-hand-'));
    mkdirSync(join(fresh, '.xray', 'state'), { recursive: true });
    const handed = cardStop(fresh, 'grep', 'boot', []);
    expect(handed?.decision).toBe('deny');
    expect(handed?.reason).toContain('boot. From: ground.');
    expect(handed?.reason).toContain('Open: docs-site/docs/plates/boot.md');
    expect(handed?.reason).not.toContain('feat:');
    expect(JSON.parse(readFileSync(join(fresh, '.xray', 'state', 'pops.json'), 'utf8')).planes.boot.card.digest).toBeTruthy();
    expect(cardStop(
      fresh,
      'read_file',
      'docs-site/docs/plates/boot.md',
      ['docs-site/docs/plates/boot.md'],
      { target_file: 'docs-site/docs/plates/boot.md' },
    )).toBeNull();
    const house = cardStop(fresh, 'grep', 'house', []);
    expect(house?.reason).toContain('Open: grok-bot/lib/seat-doctor.cjs');
    expect(house?.reason).not.toContain('setup-house');
    rmSync(root, { recursive: true, force: true });
    rmSync(fresh, { recursive: true, force: true });
  });

  it('writes the card on the station before a search', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-station-card-'));
    const station = join(root, '.xray', 'state', 'STATION.md');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(station, '# Station\n\nIntent: old\n\nContinue this card.\n');
    const line = handCard(root, 'open boot');
    expect(line).toContain('Card: boot. From: ground.');
    expect(line).toContain('Open: docs-site/docs/plates/boot.md');
    expect(line).not.toContain('feat:');
    expect(readFileSync(station, 'utf8').match(/^Card:/gm)).toHaveLength(1);
    handCard(root, 'open boot again');
    expect(readFileSync(station, 'utf8').match(/^Card:/gm)).toHaveLength(1);
    const blocked = cardStop(root, 'bash', 'npm test', []);
    expect(blocked?.decision).toBe('deny');
    expect(blocked?.reason).not.toContain('Card:');
    expect(blocked?.reason).toContain('Open: docs-site/docs/plates/boot.md');
    expect(cardStop(
      root,
      'read_file',
      'docs-site/docs/plates/boot.md',
      ['docs-site/docs/plates/boot.md'],
      { target_file: 'docs-site/docs/plates/boot.md' },
    )).toBeNull();
    expect(cardStop(root, 'bash', 'npm test', [])).toBeNull();
    handCard(root, 'finish it');
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    handCard(root, 'open boot');
    handCard(root, 'goggles routing');
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    handCard(root, 'open boot');
    handCard(root, 'feat/goggles-look still names routing and house');
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    const clipped = `${'boot '.repeat(80)}routing`;
    writeSessionBoot(root, {
      intent: clipped.slice(0, 240),
      cardText: clipped,
      host: 'grok',
    });
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    writeSessionBoot(root, { intent: 'make the cut the test', host: 'grok' });
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    writeSessionBoot(root, { intent: 'open boot', host: 'grok' });
    const booted = readFileSync(station, 'utf8');
    expect(booted.match(/^Card:/gm)).toHaveLength(1);
    expect(booted).toContain('Open: docs-site/docs/plates/boot.md');
    expect(booted).toContain('Intent: open boot');
    rmSync(root, { recursive: true, force: true });
  });
});
