import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  actualityLine,
  actualityOf,
  cardStop,
  findPlatesDir,
  formatCardPane,
  handCard,
  look,
  growPlane,
  examinePlane,
  lensBeforeResearch,
  lookCards,
  maintainLens,
  organStop,
  suitHint,
} from '../../integrations/hooks/goggles-pipeline.mjs';

const PLANES = ['dichotomy', 'syncopate', 'synthesis', 'digest', 'triage', 'loop'];

describe('goggles plate', () => {
  it('kind 0 speaks only on drift', () => {
    expect(actualityLine()).toBe('');
    expect(actualityOf(PLANES, PLANES)).toBe('');
    expect(actualityOf(['dichotomy'], PLANES)).toBe('Actuality. Drift: worn is not the map.');
    expect(look(['actuality']).text).toBe('');
    expect(look(['kind', '0']).text).toBe('');
    expect(look(['actuality', 'part']).text).toBe('');
  });

  it('kind 1 names one plane', () => {
    for (const name of ['dichotomy', 'syncopate', 'loop']) {
      expect(look([name]).text).toBe(`The reading is ${name}.`);
    }
    expect(look(['synthesis']).text).toBe('The reading is synthesis. File: src/nucleus/synthesis.ts');
    expect(look(['dichotomy', 'part']).text).toBe('The reading is dichotomy. Scope is part.');
    expect(look(['syncopate', 'one', 'flow']).text).toBe('The reading is syncopate. Scope is one flow.');
    expect(look(['loop', 'one', 'artifact']).text).toBe('The reading is loop. Scope is one artifact.');
    expect(look(['digest', 'ecosystem', 'part']).text).toBe('');
    expect(look(['digest', 'dichotomy']).text).toBe('');
    expect(look(['digest', 'triage']).text).toBe('');
  });

  it('digest returns the card and triage shows the holes', () => {
    const ground = look(['digest', 'ground']).text;
    expect(ground).toBe([
      'Plane: ground',
      'From:',
      'Digest: Home. The dev plane.',
      'Plate:',
      'Entry:',
      'Exit:',
      'Files: src, grok-bot/OP-PROC.md, src/opencode/agents, Agents.md, src/integrations, package.json, scripts/foundry',
      'Skills: SKILLS.md',
      'Setup:',
      'Teardown:',
      'Worn:',
    ].join('\n'));
    expect(look(['ground']).text).toBe(ground);
    expect(look(['routing']).text).toContain('Plane: routing');
    const routing = look(['digest', 'routing']).text;
    expect(routing).toContain('Digest: Task text becomes an agent.');
    expect(routing).toContain('Files: src/nucleus/thin-dispatch.ts');
    expect(routing).toContain('Worn: dist/nucleus/thin-dispatch.js');
    expect(routing).toContain('Entry: task text · context · thresholds');
    expect(routing).toContain('Exit: agent · strategy · adjusted score · file');
    expect(routing).toContain('Setup:');
    expect(routing).toContain('Teardown:');
    expect(routing).not.toContain('The reading is digest.');
    const oneFile = look(['digest', 'routing', 'one', 'artifact']).text;
    expect(oneFile).toContain('Plane: routing');
    expect(oneFile).toContain('Files: src/nucleus/thin-dispatch.ts');
    expect(oneFile).toContain('Setup:');
    const many = look(['digest', 'ground', 'one', 'artifact']).text;
    expect(many).toContain('Plane: ground');
    expect(many).toContain('scripts/foundry');
    expect(many).toContain('Setup:');
    const both = look(['digest', 'routing', 'house']).text;
    expect(both).toContain('Plane: routing');
    expect(both).toContain('Plane: house');
    const set = look(['digest']).text;
    for (const name of ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting']) {
      expect(set).toContain(`Plane: ${name}`);
    }
    expect(set).not.toContain('Plane: dichotomy');
    const triage = look(['triage', 'routing']).text;
    expect(triage).toContain('Empty: setup, teardown');
    expect(triage).toContain('Holds.');
    const boot = look(['triage', 'boot']).text;
    expect(boot).toContain('Entry: process start · SIGINT / SIGTERM');
    expect(boot).toContain('Exit: BootResult');
    expect(boot).toContain('src/core/boot-orchestrator.ts');
    expect(boot).toContain('src/skills/boot-orchestrator/SKILL.md');
    expect(boot).toContain('Empty: setup, teardown');
    expect(boot).not.toContain('Drawing only.');
    expect(look(['digest', 'house']).text).toContain('Entry:');
    expect(look(['digest', 'house']).text).not.toContain('Entry: house');
    const house = look(['digest', 'house']).text;
    expect(house).toContain('Entry: EMPTY');
    expect(house).toContain('Exit: DOCTOR · House: PASS?');
    expect(house).toContain('Setup: no house/ folder yet');
    expect(house).toContain('Teardown: doctor checks it yes: House: PASS');
    const memory = look(['digest', 'memory-recall']).text;
    expect(memory).toContain('Files: src/integrations/hooks/plates.cjs');
    expect(memory).toContain('Worn: dist/integrations/hooks/plates.cjs');
    expect(suitHint('open the boot plane')).toBe('boot: src/core/boot-orchestrator.ts');
    expect(suitHint('routing and governance')).toBe(
      'routing: src/nucleus/thin-dispatch.ts\ngovernance: src/governance/governance-service.ts',
    );
    expect(suitHint('look')).toBe('Name one plane.');
    expect(suitHint('read the readme')).toBe('');
  });

  it('lets a named plane continue and stops an unnamed search', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-gate-'));
    try {
      expect(lensBeforeResearch(root, 'read_file', 'src/core/boot-orchestrator.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'grep', 'open the boot plane')).toBeNull();
      const two = lensBeforeResearch(root, 'grep', 'open the boot and governance planes');
      expect(two?.decision).toBe('deny');
      expect(two?.reason).toBe('Name one plane.');
      expect(readFileSync(join(root, '.xray', 'state', 'plates', 'boot.md'), 'utf8')).toContain('INPUT');
      expect(lensBeforeResearch(root, 'grep', 'open the boot plane')).toBeNull();
      expect(lensBeforeResearch(root, 'explore', 'open the boot plane')).toBeNull();
      const other = 'src/integrations/hooks/goggles-pipeline.mjs';
      const firstRead = lensBeforeResearch(root, 'read_file', other);
      expect(firstRead?.decision).toBe('deny');
      expect(firstRead?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'read_file', other)).toBeNull();
      expect(lensBeforeResearch(root, 'read_file', other)?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'read_file', 'read the boot file')).toBeNull();
      expect(lensBeforeResearch(root, 'grep', 'still searching')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'grep', 'still searching')?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'glob', 'still searching')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'rg plane src')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'grep plane src')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'find . -name plane')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'git grep plane')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'rg boot src')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'git status')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'npm test')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'echo find the file')).toBeNull();
      expect(lensBeforeResearch(root, 'xray-researcher', 'open the boot plane')).toBeNull();
      expect(lensBeforeResearch(root, 'search_codebase', 'open the boot plane')).toBeNull();
      expect(lensBeforeResearch(root, 'find_implementation', 'open the boot plane')).toBeNull();
      expect(lensBeforeResearch(root, 'get_documentation', 'open the boot plane')).toBeNull();
      const unnamed = lensBeforeResearch(root, 'explorer', 'learn the code');
      expect(unnamed?.decision).toBe('deny');
      expect(unnamed?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'explorer', 'learn the code')?.decision).toBe('deny');
      expect(lensBeforeResearch(root, 'bash', 'search_codebase boot')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'ls')).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses the set, the open slot, and the old map', () => {
    expect(look(['outer']).text).toBe('Name one plane.');
    expect(look(['outer-loop']).text).toBe('Name one plane.');
    expect(look(['outer', 'loop']).text).toBe('Name one plane.');
    expect(look(['the', 'outer', 'loop']).text).toBe('Name one plane.');
    expect(look(['name', 'dichotomy']).text).toBe('The reading is dichotomy.');
    expect(look(['kind', '1']).text).toBe('Name one plane.');
    expect(look(['kind', '2']).text).toBe('');
    expect(look(['pull', '3']).text).toBe('');
    expect(look(['2']).text).toBe('');
    expect(look([]).text).toBe('');
    expect(look(['dichotomy', 'triage']).text).toBe('');
    expect(look(['dichotomy', 'calling']).text).toBe('');
    expect(look(['ground']).text).toContain('Plane: ground');
    expect(look(['routing']).text).toContain('Plane: routing');
    expect(look(['boot']).text).toContain('Plane: boot');
    expect(look(['domain']).text).toBe('');
    expect(look(['eco']).text).toBe('');
    expect(look(['TEGHAL']).text).toBe('');
  });

  it('stops an action that leaves the plane and stays quiet on the plane', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-read-'));
    const station = join(root, '.xray', 'state', 'STATION.md');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(station, '# Station\n\nCard: routing. From: ground. Digest: old. Filled: plate. Open: src/nucleus/thin-dispatch.ts\n\nContinue this card.\n');
    expect(handCard(root, 'name dichotomy')).toBeNull();
    expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    const plate = ['docs-site/docs/plates/routing.md'];
    const stopped = cardStop(root, 'read_file', plate[0], plate);
    expect(stopped).toEqual({
      gate: 'goggles',
      decision: 'deny',
      reason: 'The reading is dichotomy. That drawing is not the plane.',
    });
    expect(cardStop(root, 'read_file', plate[0], plate)?.decision).toBe('deny');
    expect(cardStop(root, 'read_file', 'stay on dichotomy in src/nucleus/thin-dispatch.ts', ['src/nucleus/thin-dispatch.ts'])).toEqual({
      gate: 'goggles',
      decision: 'allow',
    });
    expect(cardStop(root, 'read_file', 'src/nucleus/synthesis.ts', ['src/nucleus/synthesis.ts'])).toEqual({
      gate: 'goggles',
      decision: 'deny',
      reason: 'The reading is dichotomy. The action is synthesis.',
    });
    expect(cardStop(root, 'read_file', 'src/foo/synthesis-notes.md', ['src/foo/synthesis-notes.md'])).toEqual({
      gate: 'goggles',
      decision: 'allow',
    });
    expect(cardStop(root, 'grep', 'goggles', [])).toEqual({ gate: 'goggles', decision: 'allow' });
    expect(cardStop(root, 'read_file', plate[0], plate)?.decision).toBe('deny');
    expect(cardStop(root, 'grep', 'triage the logs', [])).toEqual({
      gate: 'goggles',
      decision: 'deny',
      reason: 'The reading is dichotomy. The action is triage.',
    });
    expect(handCard(root, 'please triage this bug')).toBeNull();
    expect(cardStop(root, 'read_file', plate[0], plate)?.decision).toBe('deny');
    expect(handCard(root, 'name routing boot')).toBeNull();
    expect(cardStop(root, 'read_file', plate[0], plate)).toBeNull();
    rmSync(root, { recursive: true, force: true });
  });

  it('a held plane may open its own drawing and a plate named on the lens', () => {
    const held = { plane: 'stamp-plate', scope: '' };
    const own = 'docs-site/docs/plates/stamp-plate.md';
    const listed = 'docs-site/docs/plates/review.md';
    const foreign = 'docs-site/docs/plates/routing.md';
    expect(organStop(held, { tool: 'read_file', text: own, paths: [own] })).toBeNull();
    expect(organStop(held, { tool: 'read_file', text: listed, paths: [listed] })).toBeNull();
    expect(organStop(held, { tool: 'read_file', text: foreign, paths: [foreign] })).toEqual({
      gate: 'goggles',
      decision: 'deny',
      reason: 'The reading is stamp-plate. That drawing is not the plane.',
    });
  });

  it('holds a named plane without look and leaves casual speech alone', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-name-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    expect(handCard(root, 'synthesis is the bug')).toBeNull();
    expect(cardStop(root, 'grep', 'triage the logs', [])?.reason).toBe('The reading is synthesis. The action is triage.');
    expect(handCard(root, 'please triage this bug')).toBeNull();
    expect(handCard(root, 'fix the loop')).toBeNull();
    expect(cardStop(root, 'grep', 'triage the logs', [])?.reason).toBe('The reading is synthesis. The action is triage.');
    expect(handCard(root, 'dichotomy and syncopate')).toBeNull();
    expect(cardStop(root, 'read_file', 'docs-site/docs/plates/routing.md', ['docs-site/docs/plates/routing.md'])).toBeNull();
    rmSync(root, { recursive: true, force: true });
  });

  it('scope stops an action wider than the dial', () => {
    expect(organStop(
      { plane: 'loop', scope: 'one artifact' },
      { tool: 'bash', text: 'npm test', paths: [] },
    )?.reason).toBe('The reading is loop. Scope is one artifact. This action is wider.');
    expect(organStop(
      { plane: 'loop', scope: 'one artifact' },
      { tool: 'read_file', text: 'src/one.ts', paths: ['src/one.ts'] },
    )).toBeNull();
    expect(organStop(
      { plane: 'digest', scope: 'part' },
      { tool: 'grep', text: 'two places', paths: ['src/a.ts', 'docs/b.ts'] },
    )?.reason).toBe('The reading is digest. Scope is part. This action crosses parts.');
  });

  it('session boot holds the plane and does not write a file card', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-boot-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeSessionBoot(root, { intent: 'short', cardText: 'look at synthesis then part', host: 'grok' });
    const station = readFileSync(join(root, '.xray', 'state', 'STATION.md'), 'utf8');
    expect(station).not.toMatch(/^Card:/m);
    expect(cardStop(root, 'bash', 'npm test', [])).toEqual({ gate: 'goggles', decision: 'allow' });
    const plate = 'docs-site/docs/plates/boot.md';
    expect(cardStop(root, 'read_file', plate, [plate])?.reason).toBe('The reading is synthesis. That drawing is not the plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('allows the plane plate and the plates listed on the lens', () => {
    const own = 'docs-site/docs/plates/routing.md';
    expect(organStop({ plane: 'routing' }, { tool: 'read_file', text: own, paths: [own] })).toBeNull();
    const related = 'docs-site/docs/plates/write-home.md';
    expect(organStop({ plane: 'activity-log' }, { tool: 'read_file', text: related, paths: [related] })).toBeNull();
    const other = 'docs-site/docs/plates/house.md';
    expect(organStop({ plane: 'activity-log' }, { tool: 'read_file', text: other, paths: [other] })?.reason)
      .toBe('The reading is activity-log. That drawing is not the plane.');
  });

  it('compact writes the lens and does not replace the notes body', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(join(root, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
    const written = maintainLens(root);
    expect(written).toEqual({ ok: true, text: '' });
    expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe('quiet (match)\n');
    const notes = readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8');
    expect(notes).toContain('# Stay');
    expect(notes).toContain('The body stays.');
    expect(notes).toContain('**Pickup line:** old job');
    expect(notes).not.toContain('stops the action');
    expect(notes).not.toContain('## Pop job');
    expect(notes).not.toContain('Home. The dev plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('exports the digest card and a pane that keeps empties', () => {
    const cards = lookCards(['digest', 'ground']);
    expect(cards).toHaveLength(1);
    const card = cards[0];
    expect(card.plane).toBe('ground');
    expect(card.flavor).toBe('digest');
    expect(card.from).toBe('');
    expect(card.digest).toBe('Home. The dev plane.');
    expect(card.plate).toBe('');
    expect(card.entry).toBe('');
    expect(card.exit).toBe('');
    expect(card.files).toEqual([
      'src',
      'grok-bot/OP-PROC.md',
      'src/opencode/agents',
      'Agents.md',
      'src/integrations',
      'package.json',
      'scripts/foundry',
    ]);
    expect(card.skills).toBe('SKILLS.md');
    expect(card.setup).toBe('');
    expect(card.teardown).toBe('');
    expect(card.worn).toBe('');
    const pane = formatCardPane(card);
    for (const label of ['Plane', 'From', 'Digest', 'Plate', 'Entry', 'Exit', 'Files', 'Skills', 'Setup', 'Teardown', 'Worn']) {
      expect(pane).toContain(label);
    }
    expect(pane).toContain('scripts/foundry');
    expect(pane).not.toContain('n/a');
    expect(pane).not.toContain('The reading is');
    expect(lookCards(['dichotomy'])).toBeNull();
    expect(lookCards(['digest', 'ground', 'one', 'artifact'])[0].files).toContain('scripts/foundry');
    const routing = lookCards(['triage', 'routing']);
    expect(routing).toHaveLength(1);
    const triagePane = formatCardPane(routing[0]);
    expect(triagePane).toContain('Empty');
    expect(triagePane).toContain('setup, teardown');
    expect(triagePane).toContain('Holds.');
    const zoom = lookCards(['digest', 'routing', 'one', 'artifact']);
    expect(zoom).toHaveLength(1);
    const zoomPane = formatCardPane(zoom[0]);
    expect(zoomPane).toContain('src/nucleus/thin-dispatch.ts');
    expect(zoomPane).toContain('Setup');
    expect(zoomPane).toContain('Teardown');
    const bin = join(fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url)));
    const piped = execFileSync(process.execPath, [bin, 'digest', 'ground'], { encoding: 'utf8' });
    expect(piped).toContain('Plane: ground');
    expect(piped).not.toContain('┌');
    expect(execFileSync(process.execPath, [bin, 'dichotomy'], { encoding: 'utf8' })).toBe('The reading is dichotomy.\n');
    expect(execFileSync(process.execPath, [bin, 'kind', '0'], { encoding: 'utf8' })).toBe('\n');
  });

  it('drops a field the plate no longer has, and still returns a plane with no plate', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-view-'));
    const plates = mkdtempSync(join(tmpdir(), 'goggles-plates-'));
    const previous = process.env.GOGGLES_ROOT;
    const previousPlanes = process.env.GOGGLES_PLANES_PATH;
    try {
      mkdirSync(join(root, '.xray', 'state'), { recursive: true });
      writeFileSync(join(root, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({
        routing: { setup: 'bench is up' },
      }, null, 2)}\n`);
      const grown = growPlane('routing', plates, root);
      expect(grown.setup).toBe('');
      expect(grown.digest).toBe('');
      expect(grown.plate).toBe('');
      const saved = JSON.parse(readFileSync(join(root, '.xray', 'state', 'goggles-views.json'), 'utf8'));
      expect(saved.routing.setup).toBe('');
      expect(saved.routing.entry).toBe('');
      writeFileSync(join(root, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({
        boot: { files: ['src/missing.ts'] },
      }, null, 2)}\n`);
      const boot = growPlane('boot', findPlatesDir(fileURLToPath(new URL('.', import.meta.url))), root);
      expect(boot.files).toContain('src/core/boot-orchestrator.ts');
      expect(boot.files).not.toContain('src/missing.ts');
      const planesFile = join(root, 'planes.json');
      const live = JSON.parse(readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'));
      live.routing = { files: ['src/no-such-plane.ts'] };
      writeFileSync(planesFile, `${JSON.stringify(live)}\n`);
      process.env.GOGGLES_PLANES_PATH = planesFile;
      process.env.GOGGLES_ROOT = root;
      expect(look(['digest', 'routing']).text).toContain('Drift: src/no-such-plane.ts is not there');
      expect(look(['digest', 'ground']).text).not.toContain('Drift:');
      expect(look(['digest', 'house']).text).toContain('Entry: EMPTY');
      expect(look(['digest', 'house']).text).toContain('Exit: DOCTOR · House: PASS?');
    } finally {
      if (previous === undefined) delete process.env.GOGGLES_ROOT;
      else process.env.GOGGLES_ROOT = previous;
      if (previousPlanes === undefined) delete process.env.GOGGLES_PLANES_PATH;
      else process.env.GOGGLES_PLANES_PATH = previousPlanes;
      rmSync(root, { recursive: true, force: true });
      rmSync(plates, { recursive: true, force: true });
    }
  });

  it('an install holds on the worn build when the factory source is not packed', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-install-'));
    const worn = join(root, 'dist/nucleus/thin-dispatch.js');
    mkdirSync(join(root, 'dist/nucleus'), { recursive: true });
    const plane = {
      files: ['src/nucleus/thin-dispatch.ts'],
      worn: 'dist/nucleus/thin-dispatch.js',
      wornMark: 'function scoreAndRoute',
      mark: 'export function scoreAndRoute',
      skills: 'src/skills/routing/SKILL.md',
    };
    try {
      writeFileSync(worn, 'function scoreAndRoute() {}\n');
      expect(examinePlane(plane, root).text).toBe('Holds.');
      writeFileSync(worn, 'unrelated\n');
      expect(examinePlane(plane, root).text).toBe('Drift: the worn build is not src/nucleus/thin-dispatch.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a symlinked lens still answers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-link-'));
    const link = join(dir, 'goggles-pipeline.mjs');
    const source = fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url));
    try {
      symlinkSync(source, link);
      expect(execFileSync(process.execPath, [link, 'dichotomy'], { encoding: 'utf8' })).toBe('The reading is dichotomy.\n');
      expect(execFileSync(process.execPath, [link, 'kind', '0'], { encoding: 'utf8' })).toBe('\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
