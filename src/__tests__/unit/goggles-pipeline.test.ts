import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  formatCardPane,
  handCard,
  look,
  lookCards,
  maintainLens,
  organStop,
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
    for (const name of ['dichotomy', 'syncopate', 'synthesis', 'loop']) {
      expect(look([name]).text).toBe(`The reading is ${name}.`);
    }
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
    expect(look(['ground']).text).toBe('');
    expect(look(['routing']).text).toBe('');
    const routing = look(['digest', 'routing']).text;
    expect(routing).toContain('Digest: Task text becomes an agent.');
    expect(routing).toContain('Files: src/nucleus/thin-dispatch.ts');
    expect(routing).toContain('Worn: dist/nucleus/thin-dispatch.js');
    expect(routing).toContain('Entry: task text · @agent · scoreAndRoute');
    expect(routing).toContain('Exit: agent · strategy · adjusted score');
    expect(routing).toContain('Setup:');
    expect(routing).toContain('Teardown:');
    expect(routing).not.toContain('The reading is digest.');
    expect(look(['digest', 'routing', 'one', 'artifact']).text).toBe([
      'Plane: routing',
      'Digest: Task text becomes an agent.',
      'Files: src/nucleus/thin-dispatch.ts',
    ].join('\n'));
    expect(look(['digest', 'ground', 'one', 'artifact']).text).toBe('');
    expect(look(['digest', 'routing', 'house']).text).toBe('');
    const set = look(['digest']).text;
    for (const name of ['ground', 'routing', 'house', 'boot', 'governance', 'memory-recall', 'orchestration', 'processor', 'reporting']) {
      expect(set).toContain(`Plane: ${name}`);
    }
    expect(set).not.toContain('Plane: dichotomy');
    const triage = look(['triage', 'routing']).text;
    expect(triage).toContain('Empty: skills, setup, teardown');
    expect(triage).toContain('Holds.');
    const boot = look(['triage', 'boot']).text;
    expect(boot).toContain('Entry: process start · SIGINT / SIGTERM');
    expect(boot).toContain('Exit: BootResult');
    expect(boot).toContain('Empty: files, skills, setup, teardown, worn');
    expect(boot).toContain('Drawing only.');
    expect(look(['digest', 'house']).text).toContain('Entry:');
    expect(look(['digest', 'house']).text).not.toContain('Entry: house');
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
    expect(look(['ground']).text).toBe('');
    expect(look(['routing']).text).toBe('');
    expect(look(['boot']).text).toBe('');
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
    expect(cardStop(root, 'read_file', 'stay on dichotomy in src/nucleus/thin-dispatch.ts', ['src/nucleus/thin-dispatch.ts'])).toBeNull();
    expect(cardStop(root, 'grep', 'triage the logs', [])).toEqual({
      gate: 'goggles',
      decision: 'deny',
      reason: 'The reading is dichotomy. The action is triage.',
    });
    expect(handCard(root, 'routing boot ground')).toBeNull();
    expect(cardStop(root, 'read_file', plate[0], plate)).toBeNull();
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
    expect(cardStop(root, 'bash', 'npm test', [])).toBeNull();
    const plate = 'docs-site/docs/plates/boot.md';
    expect(cardStop(root, 'read_file', plate, [plate])?.reason).toBe('The reading is synthesis. That drawing is not the plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('compact writes the lens and does not replace the notes body', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(join(root, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
    const written = maintainLens(root);
    expect(written).toEqual({ ok: true, text: '' });
    expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe('\n');
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
    expect(lookCards(['digest', 'ground', 'one', 'artifact'])).toBeNull();
    const routing = lookCards(['triage', 'routing']);
    expect(routing).toHaveLength(1);
    const triagePane = formatCardPane(routing[0]);
    expect(triagePane).toContain('Empty');
    expect(triagePane).toContain('skills, setup, teardown');
    expect(triagePane).toContain('Holds.');
    const zoom = lookCards(['digest', 'routing', 'one', 'artifact']);
    expect(zoom).toHaveLength(1);
    const zoomPane = formatCardPane(zoom[0]);
    expect(zoomPane).toContain('src/nucleus/thin-dispatch.ts');
    expect(zoomPane).not.toContain('Setup');
    expect(zoomPane).not.toContain('Teardown');
    const bin = join(fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url)));
    const piped = execFileSync(process.execPath, [bin, 'digest', 'ground'], { encoding: 'utf8' });
    expect(piped).toContain('Plane: ground');
    expect(piped).not.toContain('┌');
    expect(execFileSync(process.execPath, [bin, 'dichotomy'], { encoding: 'utf8' })).toBe('The reading is dichotomy.\n');
    expect(execFileSync(process.execPath, [bin, 'kind', '0'], { encoding: 'utf8' })).toBe('\n');
  });
});
