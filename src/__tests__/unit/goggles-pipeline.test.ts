import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeSessionBoot } from '../../integrations/grok/hooks/grok-hook-utils.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CARD_PLANES,
  findPlatesDir,
  formatCardPane,
  handCard,
  look,
  growPlane,
  lensBeforeResearch,
  liveDrift,
  lookCards,
  holdPlane,
  maintainLens,
  PATH_OWNER,
  readLensCard,
  seekHeldCard,
  suitHint,
  thingOfPath,
} from '../../integrations/hooks/goggles-pipeline.mjs';
import { skillIdsFromRow } from '../../integrations/hooks/skill-seek.mjs';

const DEV_CARD = [
  'Plane: dev',
  'From:',
  'Digest: This checkout.',
  'Plate:',
  'Entry: package.json, src, and grok-bot/OP-PROC.md.',
  'Exit: A change that stays in this repo.',
  'Files: src, grok-bot, docs-site, AGENTS.md, package.json, README.md',
  'Skills: orchestrator, researcher, project-analysis, git-workflow, tech-writer',
  'Setup: You are in this repo.',
  'Teardown: Leave other repos alone.',
  'Worn:',
].join('\n');

describe('goggles plate', () => {
  it('one plane returns its card', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-look-'));
    try {
      expect(look(['dev'], root).text).toBe(DEV_CARD);
      expect(look(['integration'], root).text).toContain('Plane: integration');
      expect(look(['domain'], root).text).toContain('Plane: domain');
      expect(look(['ecosystem'], root).text).toContain('Plane: ecosystem');
      expect(look(['please', 'dev'], root).text).toBe(DEV_CARD);
      expect(look([], root).text).toContain('Plane: dev');
      expect(look([], root).text).toContain('Entry:');
      for (const name of ['dichotomy', 'syncopate', 'loop', 'kind', 'outer', 'eco']) {
        expect(look([name], root).text).toBe('Name one plane.');
      }
      const boot = look(['boot'], root).text;
      expect(boot).toContain('Card: boot');
      expect(boot).toContain('Plane: integration');
      expect(boot).toContain('docs-site/docs/plates/boot.md');
      expect(boot).not.toContain('Stamp:');
      const synthesis = look(['synthesis'], root).text;
      expect(synthesis).toContain('Card: synthesis');
      expect(synthesis).toContain('Plane: integration');
      expect(synthesis).toContain('Plate: docs-site/docs/plates/synthesis.md');
      expect(synthesis).toContain('Entry: a gate, a turn, or a finished todo');
      expect(synthesis).toContain('Exit: due or not due');
      expect(synthesis).not.toContain('Stamp:');
      expect(look(['kind', '1'], root).text).toBe('Name one plane.');
      expect(look(['dev', 'integration'], root).text).toBe('Name one plane.');
      expect(look(['routing', 'house'], root).text).toBe('Name one plane.');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('the four cards stay the same when extra words are added', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-rows-'));
    try {
      const dev = look(['dev'], root).text;
      expect(dev).toBe(DEV_CARD);
      expect(look(['dev'], root).text).toBe(dev);
      const integration = look(['integration'], root).text;
      expect(integration).toContain('Digest: How one part calls the next.');
      expect(integration).toContain('Entry: The hook, the dispatch, or the bridge this file sits on.');
      expect(integration).toContain('Exit: The next call. Stop there.');
      expect(integration).toContain('Files: src/integrations, src/nucleus');
      expect(integration).toContain('Setup:');
      expect(integration).toContain('Teardown:');
      expect(look(['please', 'integration'], root).text).toBe(integration);
      const domain = look(['domain'], root).text;
      expect(domain).toContain('Entry: The plate under docs-site/docs/plates, or the plate reader.');
      expect(domain).toContain('Exit: The entry and exit written on that plate.');
      expect(domain).toContain('docs-site/docs/plates');
      const ecosystem = look(['ecosystem'], root).text;
      expect(ecosystem).toContain('Entry: scripts/foundry, and the @0xray packages this repo wears.');
      expect(ecosystem).toContain('Exit: Back to this checkout when the change is here.');
      expect(ecosystem).toContain('scripts/foundry');
      expect(ecosystem).not.toContain('The reading is');
      expect(ecosystem).not.toContain('Empty:');
      expect(ecosystem).not.toContain('Holds.');
      expect(look(['dev', 'integration'], root).text).toBe('Name one plane.');
      expect(look(['digest'], root).text).toBe('Name one plane.');
      expect(suitHint('open the integration plane')).toBe(
        'integration: src/integrations, src/nucleus, src/governance, src/mcps, src/processors, src/reporting, src/core/boot-orchestrator.ts, grok-bot/lib, grok-bot/templates',
      );
      expect(suitHint('look')).toBe('Name one plane.');
      expect(suitHint('read the readme')).toBe('');
      expect(suitHint('open the boot plane')).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a search inside the current card runs and a file open follows the path', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-gate-'));
    try {
      const search = lensBeforeResearch(root, 'grep', 'open the boot plane');
      expect(search?.decision).toBe('deny');
      expect(search?.reason).toContain('Plane: dev');
      expect(search?.reason).toContain('Entry:');
      expect(search?.reason).toContain('Exit:');
      expect(search?.reason).not.toContain('Plane: boot');
      expect(existsSync(join(root, '.xray', 'state', 'plates', 'boot.md'))).toBe(false);
      expect(lensBeforeResearch(root, 'grep', 'src/nucleus/thin-dispatch.ts')).toBeNull();
      const outsideDev = lensBeforeResearch(root, 'grep', 'scripts/foundry/release.mjs');
      expect(outsideDev?.decision).toBe('deny');
      expect(outsideDev?.reason).toContain('Plane: dev');
      expect(lensBeforeResearch(root, 'read_file', 'README.md')).toBeNull();
      expect(lensBeforeResearch(root, 'read_file', 'src/core/config-paths.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'Read', 'package.json')).toBeNull();
      const hop = lensBeforeResearch(root, 'read_file', 'src/nucleus/thin-dispatch.ts');
      expect(hop?.decision).toBe('allow');
      expect(hop?.reason).toContain('Card: routing');
      expect(hop?.reason).toContain('Plane: integration');
      expect(hop?.reason).toContain('docs-site/docs/plates/routing.md');
      expect(hop?.reason).not.toContain('Stamp:');
      expect(lensBeforeResearch(root, 'read_file', 'src/nucleus/thin-dispatch.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'grep', 'src/nucleus/thin-dispatch.ts')).toBeNull();
      const wider = lensBeforeResearch(root, 'grep', 'src/nucleus');
      expect(wider?.decision).toBe('deny');
      expect(wider?.reason).toContain('Card: routing');
      const stayed = lensBeforeResearch(root, 'grep', 'still searching');
      expect(stayed?.decision).toBe('deny');
      expect(stayed?.reason).toContain('Card: routing');
      const missing = lensBeforeResearch(root, 'read_file', 'src/nucleus/synthesis.ts');
      expect(missing?.decision).toBe('allow');
      expect(missing?.reason).toContain('Card: synthesis');
      expect(missing?.reason).toContain('Plate: docs-site/docs/plates/synthesis.md');
      expect(missing?.reason).not.toContain('Stamp:');
      expect(existsSync(fileURLToPath(new URL('../../../docs-site/docs/plates/synthesis.md', import.meta.url)))).toBe(true);
      expect(existsSync(join(root, 'docs-site', 'docs', 'plates', 'synthesis.md'))).toBe(false);
      const stray = lensBeforeResearch(root, 'read_file', 'CHANGELOG.md');
      expect(stray?.decision).toBe('allow');
      expect(stray?.reason).toContain('Card: synthesis');
      const back = lensBeforeResearch(root, 'Read', 'README.md');
      expect(back?.decision).toBe('allow');
      expect(back?.reason).toContain('Plane: dev');
      const both = lensBeforeResearch(root, 'read_file', 'README.md and src/nucleus/thin-dispatch.ts');
      expect(both?.decision).toBe('allow');
      expect(both?.reason).toContain('Plane: dev');
      expect(lensBeforeResearch(root, 'grep', 'after two files')?.reason).toContain('Plane: dev');
      const domain = lensBeforeResearch(root, 'read_file', 'src/integrations/hooks/plates.cjs');
      expect(domain?.decision).toBe('allow');
      expect(domain?.reason).toContain('Plane: domain');
      const outside = lensBeforeResearch(root, 'read_file', 'scripts/foundry/package.json');
      expect(outside?.decision).toBe('allow');
      expect(outside?.reason).toContain('Card: foundry');
      expect(outside?.reason).toContain('Plane: ecosystem');
      expect(lensBeforeResearch(root, 'bash', 'git status')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'npm test')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'ls')).toBeNull();
      expect(lensBeforeResearch(root, 'search_replace', 'src/nucleus/thin-dispatch.ts')).toBeNull();
      const researcher = lensBeforeResearch(root, 'xray-researcher', 'learn the code');
      expect(researcher?.decision).toBe('deny');
      expect(researcher?.reason).toContain('Card: foundry');
      expect(researcher?.reason).toContain('Plane: ecosystem');
      const explorer = lensBeforeResearch(root, 'explorer', 'learn the code');
      expect(explorer?.decision).toBe('deny');
      expect(explorer?.reason).toContain('Card: foundry');
      expect(explorer?.reason).toContain('Plane: ecosystem');
      expect(lensBeforeResearch(root, 'grep', 'scripts/foundry/package.json')).toBeNull();
      const home = lensBeforeResearch(root, 'bash', 'python3 -c "print(1)" src/core/config-paths.ts');
      expect(home?.decision).toBe('allow');
      expect(home?.reason).toContain('Plane: dev');
      expect(home?.reason).toContain('Entry:');
      expect(lensBeforeResearch(root, 'grep', 'back home')?.reason).toContain('Plane: dev');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a shared path opens the named owner', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-owner-'));
    try {
      for (const [file, id] of Object.entries(PATH_OWNER)) {
        expect(thingOfPath(file)).toBe(id);
        const opened = lensBeforeResearch(root, 'read_file', file);
        expect(opened?.decision).toBe('allow');
        expect(opened?.reason).toContain(`Card: ${id}`);
      }
      expect(thingOfPath('package.json')).toBe('');
      const pack = lensBeforeResearch(root, 'read_file', 'package.json');
      expect(pack?.decision).toBe('allow');
      expect(pack?.reason).toContain('Plane: dev');
      expect(pack?.reason).not.toMatch(/^Card:/m);
      const servers = lensBeforeResearch(root, 'read_file', '.mcp.json');
      expect(servers?.reason).toContain('Card: consumer-mcp');
      expect(lensBeforeResearch(root, 'read_file', 'src/mcps/registry.json')).toBeNull();
      const dispatch = lensBeforeResearch(root, 'read_file', 'src/mcps/orchestrator/server.ts');
      expect(dispatch?.reason).toContain('Card: orchestration');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a tied path with no owner stays on the plane', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-twin-'));
    const table = JSON.parse(readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'));
    table.twin = { file: 'src/nucleus/thin-dispatch.ts' };
    const planes = join(root, 'planes.json');
    writeFileSync(planes, JSON.stringify(table));
    const previous = process.env.GOGGLES_PLANES_PATH;
    process.env.GOGGLES_PLANES_PATH = planes;
    const project = mkdtempSync(join(tmpdir(), 'goggles-twin-root-'));
    try {
      expect(thingOfPath('src/nucleus/thin-dispatch.ts')).toBe('');
      const opened = lensBeforeResearch(project, 'read_file', 'src/nucleus/thin-dispatch.ts');
      expect(opened?.decision).toBe('allow');
      expect(opened?.reason).toContain('Plane: integration');
      expect(opened?.reason).not.toMatch(/^Card:/m);
    } finally {
      if (previous === undefined) delete process.env.GOGGLES_PLANES_PATH;
      else process.env.GOGGLES_PLANES_PATH = previous;
      rmSync(root, { recursive: true, force: true });
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('refuses a name that is not one of the four', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-names-'));
    try {
      expect(look(['outer'], root).text).toBe('Name one plane.');
      expect(look(['outer-loop'], root).text).toBe('Name one plane.');
      expect(look(['outer', 'loop'], root).text).toBe('Name one plane.');
      expect(look(['the', 'outer', 'loop'], root).text).toBe('Name one plane.');
      expect(look(['name', 'dichotomy'], root).text).toBe('Name one plane.');
      expect(look(['kind', '1'], root).text).toBe('Name one plane.');
      expect(look(['kind', '0'], root).text).toBe('Name one plane.');
      expect(look(['pull', '3'], root).text).toBe('Name one plane.');
      expect(look(['2'], root).text).toBe('Name one plane.');
      expect(look(['dichotomy', 'triage'], root).text).toBe('Name one plane.');
      const ground = look(['ground'], root).text;
      expect(ground).toContain('Card: ground');
      expect(ground).toContain('Plane: dev');
      expect(ground).toContain('Plate: docs-site/docs/plates/ground.md');
      expect(ground).toContain('Entry: this checkout');
      expect(ground).toContain('Exit: a change that stays in this repo');
      expect(ground).not.toContain('Stamp:');
      expect(look(['routing'], root).text).toContain('Card: routing');
      expect(look(['boot'], root).text).toContain('Card: boot');
      expect(look(['eco'], root).text).toBe('Name one plane.');
      expect(look(['TEGHAL'], root).text).toBe('Name one plane.');
      expect(look(['dev'], root).text).toContain('Plane: dev');
      expect(look(['integration'], root).text).toContain('Plane: integration');
      expect(look(['domain'], root).text).toContain('Plane: domain');
      expect(look(['ecosystem'], root).text).toContain('Plane: ecosystem');
      expect(look([], root).text).toContain('Plane: ecosystem');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a spoken name does not arm a hold', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-read-'));
    const station = join(root, '.xray', 'state', 'STATION.md');
    mkdirSync(join(root, '.xray', 'state'), { recursive: true });
    writeFileSync(station, '# Station\n\nCard: routing. From: ground. Digest: old. Filled: plate. Open: src/nucleus/thin-dispatch.ts\n\nContinue this card.\n');
    try {
      expect(handCard(root, 'name dichotomy')).toBeNull();
      expect(readFileSync(station, 'utf8')).toMatch(/^Card:/m);
      expect(look(['dichotomy'], root).text).toBe('Name one plane.');
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
      holdPlane(root, 'integration');
      const lens = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(lens.startsWith('Plane: integration\n')).toBe(true);
      expect(lens).toContain('Entry: The hook, the dispatch, or the bridge this file sits on.');
      expect(lens).toContain('Exit: The next call. Stop there.');
      expect(lens).toContain('Files: src/integrations, src/nucleus');
      expect(maintainLens(root)).toEqual({ ok: true, text: '' });
      expect(readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8')).toBe(lens);
      const marked = lens.replace(
        'Entry: The hook, the dispatch, or the bridge this file sits on.',
        'Entry: kept',
      );
      writeFileSync(join(root, '.xray', 'state', 'LENS.md'), marked);
      holdPlane(root, 'domain');
      const next = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(next.startsWith('Plane: integration\n')).toBe(true);
      expect(readLensCard(root, 'integration')).toContain('Entry: kept');
      expect(next).toContain('Plane: domain');
      expect(next).not.toContain('Plane: routing');
      expect(next.split('Plane:').length - 1).toBe(2);
      holdPlane(root, 'routing');
      const kept = readFileSync(join(root, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(kept).toContain('Entry: kept');
      expect(kept).toContain('Card: routing');
      expect(kept).toContain('Plane: integration');
      expect(kept).not.toMatch(/^Plane: routing/m);
      expect(kept.split('Plane:').length - 1).toBe(3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('exports the dev card and a pane', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-pane-'));
    try {
      const cards = lookCards(['dev'], root);
      expect(cards).toHaveLength(1);
      const card = cards[0];
      expect(card.plane).toBe('dev');
      expect(card.from).toBe('');
      expect(card.digest).toBe('This checkout.');
      expect(card.plate).toBe('');
      expect(card.entry).toBe('package.json, src, and grok-bot/OP-PROC.md.');
      expect(card.exit).toBe('A change that stays in this repo.');
      expect(card.files).toEqual([
        'src',
        'grok-bot',
        'docs-site',
        'AGENTS.md',
        'package.json',
        'README.md',
      ]);
      expect(card.skills).toBe('orchestrator, researcher, project-analysis, git-workflow, tech-writer');
      expect(card.setup).toBe('You are in this repo.');
      expect(card.teardown).toBe('Leave other repos alone.');
      expect(card.worn).toBe('');
      const pane = formatCardPane(card);
      for (const label of ['Plane', 'From', 'Digest', 'Plate', 'Entry', 'Exit', 'Files', 'Skills', 'Setup', 'Teardown', 'Worn']) {
        expect(pane).toContain(label);
      }
      expect(pane).toContain('package.json');
      expect(pane).not.toContain('n/a');
      expect(pane).not.toContain('The reading is');
      const routing = lookCards(['routing'], root);
      expect(routing).toHaveLength(1);
      expect(routing[0].card).toBe('routing');
      expect(routing[0].plane).toBe('integration');
      expect(routing[0].plates).toEqual(['orchestration', 'processor']);
      expect(lookCards(['dichotomy'], root)).toBeNull();
      const integration = lookCards(['integration'], root);
      expect(integration).toHaveLength(1);
      const integrationPane = formatCardPane(integration[0]);
      expect(integrationPane).toContain('src/nucleus');
      expect(integrationPane).toContain('Setup');
      expect(integrationPane).toContain('Teardown');
      expect(integrationPane).not.toContain('Empty');
      expect(integrationPane).not.toContain('Holds.');
      const bin = fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url));
      const piped = execFileSync(process.execPath, [bin, 'dev'], {
        encoding: 'utf8',
        env: { ...process.env, GOGGLES_ROOT: root },
      });
      expect(piped).toContain('Plane: dev');
      expect(piped).not.toContain('┌');
      expect(execFileSync(process.execPath, [bin, 'dichotomy'], { encoding: 'utf8' })).toBe('Name one plane.\n');
      expect(execFileSync(process.execPath, [bin, 'kind', '0'], { encoding: 'utf8' })).toBe('Name one plane.\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads the stored card and keeps a hand edit', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-view-'));
    const previous = process.env.GOGGLES_ROOT;
    try {
      process.env.GOGGLES_ROOT = root;
      const first = look(['dev'], root).text;
      expect(first).toContain('Plane: dev');
      expect(first).toContain('Entry: package.json, src, and grok-bot/OP-PROC.md.');
      expect(first).not.toContain('Drift:');
      const lensPath = join(root, '.xray', 'state', 'LENS.md');
      const lens = readFileSync(lensPath, 'utf8');
      const marked = lens.replace(/^Entry:.*$/m, 'Entry: kept');
      writeFileSync(lensPath, marked);
      writeFileSync(join(root, '.xray', 'state', 'goggles-views.json'), `${JSON.stringify({
        dev: { setup: 'bench is up' },
      }, null, 2)}\n`);
      const second = look(['dev'], root).text;
      expect(second).toContain('Entry: kept');
      expect(second).not.toContain('bench is up');
      expect(second).not.toContain('Drift:');
      expect(readFileSync(lensPath, 'utf8')).toBe(marked);
      const domain = look(['domain'], root).text;
      expect(domain).toContain('Plane: domain');
      expect(domain).toContain('Entry:');
      expect(domain).not.toContain('Drift:');
      const grown = growPlane('boot', findPlatesDir(fileURLToPath(new URL('.', import.meta.url))), root);
      expect(grown.files).toContain('src/core/boot-orchestrator.ts');
      expect(grown.files).not.toContain('src/missing.ts');
    } finally {
      if (previous === undefined) delete process.env.GOGGLES_ROOT;
      else process.env.GOGGLES_ROOT = previous;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('a card with no plate names the stamp skill', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-unplated-'));
    const table = JSON.parse(readFileSync(fileURLToPath(new URL('../../integrations/hooks/goggles-planes.json', import.meta.url)), 'utf8'));
    table.unplated = { file: 'src/core/config-paths.ts' };
    const planes = join(root, 'planes.json');
    writeFileSync(planes, JSON.stringify(table));
    const previous = process.env.GOGGLES_PLANES_PATH;
    process.env.GOGGLES_PLANES_PATH = planes;
    const project = mkdtempSync(join(tmpdir(), 'goggles-unplated-root-'));
    try {
      const opened = lensBeforeResearch(project, 'read_file', 'src/core/config-paths.ts');
      expect(opened?.decision).toBe('allow');
      expect(opened?.reason).toContain('Card: unplated');
      expect(opened?.reason).toContain('.agents/skills/stamp-plate/SKILL.md');
      expect(opened?.reason).toContain('one plate for this card');
      expect(existsSync(fileURLToPath(new URL('../../../docs-site/docs/plates/unplated.md', import.meta.url)))).toBe(false);
      expect(lensBeforeResearch(project, 'read_file', 'src/core/config-paths.ts')).toBeNull();
      const shown = look(['unplated'], project).text;
      expect(shown).toContain('Card: unplated');
      expect(shown).toContain('one plate for this card');
      const stored = readFileSync(join(project, '.xray', 'state', 'LENS.md'), 'utf8');
      expect(stored).toContain('Card: unplated');
      expect(stored).not.toContain('Stamp:');
    } finally {
      if (previous === undefined) delete process.env.GOGGLES_PLANES_PATH;
      else process.env.GOGGLES_PLANES_PATH = previous;
      rmSync(root, { recursive: true, force: true });
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('an installed pack does not report drift', () => {
    const pack = mkdtempSync(join(tmpdir(), 'goggles-pack-'));
    const installed = join(pack, 'node_modules', '0xray');
    mkdirSync(installed, { recursive: true });
    const gone = mkdtempSync(join(tmpdir(), 'goggles-gone-'));
    try {
      expect(liveDrift(DEV_CARD, installed)).toBe('');
      expect(liveDrift('Plane: dev\nFiles: missing-tree\n', gone)).toBe('Drift: missing-tree is not there');
    } finally {
      rmSync(pack, { recursive: true, force: true });
      rmSync(gone, { recursive: true, force: true });
    }
  });

  it('a symlinked lens still answers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'goggles-link-'));
    const link = join(dir, 'goggles-pipeline.mjs');
    const source = fileURLToPath(new URL('../../integrations/hooks/goggles-pipeline.mjs', import.meta.url));
    const root = mkdtempSync(join(tmpdir(), 'goggles-look-'));
    try {
      symlinkSync(source, link);
      const run = (args: string[]) =>
        execFileSync(process.execPath, [link, ...args], { cwd: root, encoding: 'utf8' });
      expect(run(['dichotomy'])).toBe('Name one plane.\n');
      expect(run(['kind', '0'])).toBe('Name one plane.\n');
      expect(run(['dev'])).toContain('Plane: dev');
      expect(run(['synthesis'])).toContain('Card: synthesis');
      expect(run(['synthesis'])).toContain('Plate: docs-site/docs/plates/synthesis.md');
      expect(run(['synthesis'])).not.toContain('Stamp:');
      const held = JSON.parse(readFileSync(join(root, '.xray', 'state', 'goggles-plane.json'), 'utf8'));
      expect(held.plane).toBe('integration');
      expect(held.card).toBe('synthesis');
      expect(run([])).toContain('Card: synthesis');
      expect(existsSync(join(root, 'docs-site', 'docs', 'plates', 'synthesis.md'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reads plant or role from suit config and fills Worn', () => {
    const sound = mkdtempSync(join(tmpdir(), 'goggles-sound-seat-'));
    const mill = mkdtempSync(join(tmpdir(), 'goggles-mill-seat-'));
    const rolePlane = mkdtempSync(join(tmpdir(), 'goggles-role-plane-'));
    const stockSkills = 'orchestrator, researcher, project-analysis, git-workflow, tech-writer';
    try {
      mkdirSync(join(sound, '.xray'), { recursive: true });
      writeFileSync(join(sound, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
      writeFileSync(
        join(sound, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({ mill: { version: '4.1.1' }, plant: ['sound'], soundPlant: { skills: ['sound', 'sound-inspect', 'sound-mixer'] } })}\n`,
      );
      const soundCard = look([], sound).text;
      expect(soundCard).toContain('Plane: ecosystem');
      expect(soundCard).toContain('Skills: sound, sound-inspect, sound-mixer');
      expect(soundCard).toContain('Worn: sound 4.1.1');
      expect(soundCard).not.toContain(stockSkills);

      mkdirSync(join(mill, '.xray'), { recursive: true });
      writeFileSync(join(mill, 'foundry.json'), `${JSON.stringify({ plant: 'mill' })}\n`);
      writeFileSync(
        join(mill, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({ mill: { version: '4.1.1' }, plant: ['mill'], millPlant: { skills: ['mill', 'inspect'] } })}\n`,
      );
      const millCard = look([], mill).text;
      expect(millCard).toContain('Plane: integration');
      expect(millCard).toContain('Skills: mill, inspect');
      expect(millCard).toContain('Worn: mill 4.1.1');
      expect(millCard).not.toContain(stockSkills);
      expect(millCard).not.toContain('Skills: sound, sound-inspect, sound-mixer');

      mkdirSync(join(rolePlane, '.xray'), { recursive: true });
      writeFileSync(join(rolePlane, '.xray', 'config.json'), `${JSON.stringify({ role: 'domain' })}\n`);
      writeFileSync(join(rolePlane, 'foundry.json'), `${JSON.stringify({ plant: 'mill' })}\n`);
      writeFileSync(
        join(rolePlane, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({ mill: { version: '4.1.1' }, plant: ['mill'], millPlant: { skills: ['mill', 'inspect'] } })}\n`,
      );
      const roleCard = look([], rolePlane).text;
      expect(roleCard).toContain('Plane: domain');
      expect(roleCard).toContain('Skills: mill, inspect');
      expect(roleCard).toContain('Worn: mill 4.1.1');
      expect(roleCard).not.toContain('code-review, testing-best-practices');
    } finally {
      rmSync(sound, { recursive: true, force: true });
      rmSync(mill, { recursive: true, force: true });
      rmSync(rolePlane, { recursive: true, force: true });
    }
  });

  it('applies the plant lens when the dev plane is already held', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-held-dev-'));
    const stockSkills = 'orchestrator, researcher, project-analysis, git-workflow, tech-writer';
    try {
      mkdirSync(join(root, '.xray'), { recursive: true });
      writeFileSync(join(root, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
      writeFileSync(
        join(root, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({ mill: { version: '4.1.1' }, plant: ['sound'], soundPlant: { skills: ['sound', 'sound-inspect', 'sound-mixer'] } })}\n`,
      );
      holdPlane(root, 'dev');
      const card = look([], root).text;
      expect(card).toContain('Plane: dev');
      expect(card).toContain('Skills: sound, sound-inspect, sound-mixer');
      expect(card).toContain('Worn: sound 4.1.1');
      expect(card).not.toContain(stockSkills);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('runs a stored card through the plant lens', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-stored-card-'));
    const stockSkills = 'orchestrator, researcher, project-analysis, git-workflow, tech-writer';
    const stale = [
      'Plane: dev',
      'From:',
      'Digest: stale',
      'Plate:',
      'Entry: old',
      'Exit: old',
      'Files: src',
      `Skills: ${stockSkills}`,
      'Setup: old',
      'Teardown: old',
      'Worn:',
      '',
    ].join('\n');
    try {
      mkdirSync(join(root, '.xray', 'state'), { recursive: true });
      writeFileSync(join(root, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
      writeFileSync(
        join(root, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({ mill: { version: '4.1.1' }, plant: ['sound'], soundPlant: { skills: ['sound', 'sound-inspect', 'sound-mixer'] } })}\n`,
      );
      writeFileSync(join(root, '.xray', 'state', 'goggles-plane.json'), `${JSON.stringify({ plane: 'dev', card: 'dev' })}\n`);
      writeFileSync(join(root, '.xray', 'state', 'LENS.md'), stale);
      const card = look([], root).text;
      expect(card).toContain('Plane: dev');
      expect(card).toContain('Skills: sound, sound-inspect, sound-mixer');
      expect(card).toContain('Worn: sound 4.1.1');
      expect(card).not.toContain(stockSkills);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not treat an installed package alone as a mill lens', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-install-only-'));
    try {
      mkdirSync(join(root, 'node_modules', '0xray'), { recursive: true });
      writeFileSync(join(root, 'node_modules', '0xray', 'package.json'), `${JSON.stringify({ name: '0xray', version: '4.1.1' })}\n`);
      const card = look([], root).text;
      expect(card).toContain('Plane: dev');
      expect(card).toContain('Skills: orchestrator, researcher, project-analysis, git-workflow, tech-writer');
      expect(card).not.toContain('Worn: mill');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
