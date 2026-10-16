import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  findPlatesDir,
  formatCardPane,
  handCard,
  look,
  growPlane,
  lensBeforeResearch,
  lookCards,
  holdPlane,
  maintainLens,
  readLensCard,
  suitHint,
} from '../../integrations/hooks/goggles-pipeline.mjs';

describe('goggles plate', () => {
  it('one plane returns its card', () => {
    expect(look(['routing']).text).toContain('Plane: routing');
    expect(look(['digest', 'ground']).text).toContain('Plane: ground');
    expect(look(['triage', 'boot']).text).toContain('Plane: boot');
    for (const name of ['dichotomy', 'syncopate', 'synthesis', 'loop', 'kind', 'outer', 'domain']) {
      expect(look([name]).text).toBe('Name one plane.');
    }
    expect(look(['kind', '1']).text).toBe('Name one plane.');
    expect(look(['kind', '0']).text).toBe('Name one plane.');
    expect(look([]).text).toBe('Name one plane.');
    expect(look(['routing', 'house']).text).toBe('Name one plane.');
  });

  it('digest and triage return the same card', () => {
    const ground = look(['digest', 'ground']).text;
    expect(ground).toBe([
      'Plane: ground',
      'From:',
      'Digest: Home. The dev plane.',
      'Plate:',
      'Entry:',
      'Exit:',
      'Files: src, grok-bot/OP-PROC.md, grok-bot/LEXICON.md, src/opencode/agents, AGENTS.md, src/integrations, package.json, scripts/foundry',
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
    expect(look(['digest', 'routing', 'house']).text).toBe('Name one plane.');
    expect(look(['digest']).text).toBe('Name one plane.');
    const triage = look(['triage', 'routing']).text;
    expect(triage).toContain('Entry: task text · context · thresholds');
    expect(triage).toContain('Files: src/nucleus/thin-dispatch.ts');
    expect(triage).not.toContain('Empty:');
    expect(triage).not.toContain('Holds.');
    const boot = look(['triage', 'boot']).text;
    expect(boot).toContain('Entry: process start · SIGINT / SIGTERM');
    expect(boot).toContain('Exit: BootResult');
    expect(boot).toContain('src/core/boot-orchestrator.ts');
    expect(boot).toContain('src/skills/boot-orchestrator/SKILL.md');
    expect(boot).not.toContain('Empty:');
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
      'routing: src/nucleus/thin-dispatch.ts\ngovernance: src/governance/governance-service.ts, src/governance/llm-governance-provider.ts',
    );
    expect(suitHint('look')).toBe('Name one plane.');
    expect(suitHint('read the readme')).toBe('');
  });

  it('a search returns that plane card', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-gate-'));
    try {
      const boot = lensBeforeResearch(root, 'grep', 'open the boot plane');
      expect(boot?.decision).toBe('deny');
      expect(boot?.reason).toContain('Plane: boot');
      expect(boot?.reason).toContain('Entry:');
      expect(boot?.reason).toContain('Exit:');
      expect(boot?.reason).toContain('src/core/boot-orchestrator.ts');
      const two = lensBeforeResearch(root, 'grep', 'open the boot and governance planes');
      expect(two?.decision).toBe('deny');
      expect(two?.reason).toBe('Name one plane.');
      expect(readFileSync(join(root, '.xray', 'state', 'plates', 'boot.md'), 'utf8')).toContain('INPUT');
      expect(lensBeforeResearch(root, 'read_file', 'src/core/boot-orchestrator.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'read_file', 'src/integrations/hooks/goggles-pipeline.mjs')).toBeNull();
      const other = lensBeforeResearch(root, 'read_file', 'src/core/config-paths.ts');
      expect(other?.decision).toBe('deny');
      expect(other?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'read_file', 'src/core/config-paths.ts')?.reason).toBe('Name one plane.');
      const namedRead = lensBeforeResearch(root, 'read_file', 'read the boot file');
      expect(namedRead?.decision).toBe('deny');
      expect(namedRead?.reason).toContain('Plane: boot');
      expect(lensBeforeResearch(root, 'grep', 'still searching')?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'bash', 'rg plane src')?.reason).toBe('Name one plane.');
      expect(lensBeforeResearch(root, 'bash', 'rg boot src')?.reason).toContain('Plane: boot');
      expect(lensBeforeResearch(root, 'bash', 'git status')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'npm test')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'ls')).toBeNull();
      expect(lensBeforeResearch(root, 'search_replace', 'src/core/config-paths.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'xray-researcher', 'open the boot plane')?.reason).toContain('Plane: boot');
      expect(lensBeforeResearch(root, 'explorer', 'learn the code')?.reason).toBe('Name one plane.');
      const ground = lensBeforeResearch(root, 'bash', 'python3 -c "print(1)" src/core/config-paths.ts # ground');
      expect(ground?.decision).toBe('deny');
      expect(ground?.reason).toContain('Plane: ground');
      expect(ground?.reason).toContain('Entry:');
      expect(ground?.reason).not.toContain('has no lens');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('refuses the set, the open slot, and the old map', () => {
    expect(look(['outer']).text).toBe('Name one plane.');
    expect(look(['outer-loop']).text).toBe('Name one plane.');
    expect(look(['outer', 'loop']).text).toBe('Name one plane.');
    expect(look(['the', 'outer', 'loop']).text).toBe('Name one plane.');
    expect(look(['name', 'dichotomy']).text).toBe('Name one plane.');
    expect(look(['kind', '1']).text).toBe('Name one plane.');
    expect(look(['kind', '2']).text).toBe('Name one plane.');
    expect(look(['pull', '3']).text).toBe('Name one plane.');
    expect(look(['2']).text).toBe('Name one plane.');
    expect(look([]).text).toBe('Name one plane.');
    expect(look(['dichotomy', 'triage']).text).toBe('Name one plane.');
    expect(look(['dichotomy', 'calling']).text).toBe('Name one plane.');
    expect(look(['ground']).text).toContain('Plane: ground');
    expect(look(['routing']).text).toContain('Plane: routing');
    expect(look(['boot']).text).toContain('Plane: boot');
    expect(look(['domain']).text).toBe('Name one plane.');
    expect(look(['eco']).text).toBe('Name one plane.');
    expect(look(['TEGHAL']).text).toBe('Name one plane.');
  });

  it('a spoken name does not arm a hold', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-read-'));
    const station = join(root, '.xray', 'state', 'STATION.md');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(station, '# Station\n\nCard: routing. From: ground. Digest: old. Filled: plate. Open: src/nucleus/thin-dispatch.ts\n\nContinue this card.\n');
    try {
      expect(handCard(root, 'name dichotomy')).toBeNull();
      expect(readFileSync(station, 'utf8')).toMatch(/^Card:/m);
      expect(look(['dichotomy']).text).toBe('Name one plane.');
      expect(handCard(root, 'goggles')).toBeNull();
      expect(readFileSync(station, 'utf8')).not.toMatch(/^Card:/m);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('session boot does not write a file card', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-boot-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeSessionBoot(root, { intent: 'short', cardText: 'look at synthesis then part', host: 'grok' });
    const station = readFileSync(join(root, '.xray', 'state', 'STATION.md'), 'utf8');
    expect(station).not.toMatch(/^Card:/m);
    rmSync(root, { recursive: true, force: true });
  });

  it('compact writes the lens and does not replace the notes body', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-'));
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(join(root, '.xray', 'state', 'NOTES.md'), '**Pickup line:** old job\n\n# Stay\n\nThe body stays.\n');
    const written = maintainLens(root);
    expect(written).toEqual({ ok: true, text: '' });
    expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe('');
    const notes = readFileSync(join(root, '.xray', 'state', 'NOTES.md'), 'utf8');
    expect(notes).toContain('# Stay');
    expect(notes).toContain('The body stays.');
    expect(notes).toContain('**Pickup line:** old job');
    expect(notes).not.toContain('stops the action');
    expect(notes).not.toContain('## Pop job');
    expect(notes).not.toContain('Home. The dev plane.');
    rmSync(root, { recursive: true, force: true });
  });

  it('compact writes the held plane card', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-card-'));
    try {
      holdPlane(root, 'routing');
      const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(lens.startsWith('Plane: routing\n')).toBe(true);
      expect(lens).toContain('Plane: routing');
      expect(lens).toContain('Entry: task text · context · thresholds');
      expect(lens).toContain('Exit: agent · strategy · adjusted score · file');
      expect(lens).toContain('Files: src/nucleus/thin-dispatch.ts');
      expect(lens).toContain('Skills: .agents/skills/routing/SKILL.md');
      expect(lens).toContain('\nSetup:\n');
      expect(lens).toContain('\nTeardown:\n');
      expect(maintainLens(root)).toEqual({ ok: true, text: '' });
      expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe(lens);
      const marked = lens.replace('Entry: task text · context · thresholds', 'Entry: kept');
      writeFileSync(join(root, '.xray', 'state', 'LENS.md'), marked);
      holdPlane(root, 'house');
      const next = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(next.startsWith('Plane: routing\n')).toBe(true);
      expect(readLensCard(root, 'routing')).toContain('Entry: kept');
      expect(next).toContain('Plane: house');
      expect(next).toContain('Entry: EMPTY');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exports the digest card and a pane', () => {
    const cards = lookCards(['digest', 'ground']);
    expect(cards).toHaveLength(1);
    const card = cards[0];
    expect(card.plane).toBe('ground');
    expect(card.from).toBe('');
    expect(card.digest).toBe('Home. The dev plane.');
    expect(card.plate).toBe('');
    expect(card.entry).toBe('');
    expect(card.exit).toBe('');
    expect(card.files).toEqual([
      'src',
      'grok-bot/OP-PROC.md',
      'grok-bot/LEXICON.md',
      'src/opencode/agents',
      'AGENTS.md',
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
    expect(triagePane).toContain('src/nucleus/thin-dispatch.ts');
    expect(triagePane).not.toContain('Empty');
    expect(triagePane).not.toContain('Holds.');
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
    expect(execFileSync(process.execPath, [bin, 'dichotomy'], { encoding: 'utf8' })).toBe('Name one plane.\n');
    expect(execFileSync(process.execPath, [bin, 'kind', '0'], { encoding: 'utf8' })).toBe('Name one plane.\n');
  });

  it('reads the stored card and keeps a hand edit', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-view-'));
    const previous = process.env.GOGGLES_ROOT;
    const previousPlanes = process.env.GOGGLES_PLANES_PATH;
    try {
      const planesFile = join(root, 'planes.json');
      const live = JSON.parse(readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'));
      live.routing = { files: ['src/no-such-plane.ts'] };
      writeFileSync(planesFile, `${JSON.stringify(live)}\n`);
      process.env.GOGGLES_PLANES_PATH = planesFile;
      process.env.GOGGLES_ROOT = root;
      const first = look(['digest', 'routing']).text;
      expect(first).toContain('Plane: routing');
      expect(first).toContain('Drift: src/no-such-plane.ts is not there');
      const lensPath = join(root, '.xray', 'state', 'LENS.md');
      const lens = readFileSync(lensPath, 'utf8');
      expect(lens).not.toContain('Drift:');
      const marked = lens.replace(/^Entry:.*$/m, 'Entry: kept');
      writeFileSync(lensPath, marked);
      writeFileSync(join(root, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({
        routing: { setup: 'bench is up' },
      }, null, 2)}\n`);
      const second = look(['digest', 'routing']).text;
      expect(second).toContain('Entry: kept');
      expect(second).toContain('Drift: src/no-such-plane.ts is not there');
      expect(second).not.toContain('bench is up');
      expect(readFileSync(lensPath, 'utf8')).toBe(marked);
      expect(readFileSync(lensPath, 'utf8')).not.toContain('Drift:');
      expect(look(['digest', 'ground']).text).not.toContain('Drift:');
      expect(look(['digest', 'house']).text).toContain('Entry: EMPTY');
      expect(look(['digest', 'house']).text).toContain('Exit: DOCTOR · House: PASS?');
      const grown = growPlane('boot', findPlatesDir(fileURLToPath(new URL('.', import.meta.url))), root);
      expect(grown.files).toContain('src/core/boot-orchestrator.ts');
      expect(grown.files).not.toContain('src/missing.ts');
    } finally {
      if (previous === undefined) delete process.env.GOGGLES_ROOT;
      else process.env.GOGGLES_ROOT = previous;
      if (previousPlanes === undefined) delete process.env.GOGGLES_PLANES_PATH;
      else process.env.GOGGLES_PLANES_PATH = previousPlanes;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a symlinked lens still answers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-link-'));
    const link = join(dir, 'goggles-pipeline.mjs');
    const source = fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url));
    try {
      symlinkSync(source, link);
      expect(execFileSync(process.execPath, [link, 'dichotomy'], { encoding: 'utf8' })).toBe('Name one plane.\n');
      expect(execFileSync(process.execPath, [link, 'kind', '0'], { encoding: 'utf8' })).toBe('Name one plane.\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
