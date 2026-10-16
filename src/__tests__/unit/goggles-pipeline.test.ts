import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

const DEV_CARD = [
  'Plane: dev',
  'From:',
  'Digest: This checkout.',
  'Plate:',
  'Entry: package.json, src, and grok-bot/OP-PROC.md.',
  'Exit: A change that stays in this repo.',
  'Files: src, grok-bot, docs-site, AGENTS.md, package.json, README.md',
  'Skills: SKILLS.md',
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
      expect(synthesis).toContain('.agents/skills/stamp-plate/SKILL.md');
      expect(synthesis).toContain('one plate for this card');
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

  it('a search returns the current card and a file open follows the path', () => {
    const root = mkdtempSync(join(tmpdir(), 'goggles-lens-gate-'));
    try {
      const search = lensBeforeResearch(root, 'grep', 'open the boot plane');
      expect(search?.decision).toBe('deny');
      expect(search?.reason).toContain('Plane: dev');
      expect(search?.reason).toContain('Entry:');
      expect(search?.reason).toContain('Exit:');
      expect(search?.reason).not.toContain('Plane: boot');
      expect(existsSync(join(root, '.xray', 'state', 'plates', 'boot.md'))).toBe(false);
      expect(lensBeforeResearch(root, 'grep', 'src/nucleus/thin-dispatch.ts')?.reason).toContain('Plane: dev');
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
      const stayed = lensBeforeResearch(root, 'grep', 'still searching');
      expect(stayed?.decision).toBe('deny');
      expect(stayed?.reason).toContain('Card: routing');
      const missing = lensBeforeResearch(root, 'read_file', 'src/nucleus/synthesis.ts');
      expect(missing?.decision).toBe('allow');
      expect(missing?.reason).toContain('Card: synthesis');
      expect(missing?.reason).toContain('.agents/skills/stamp-plate/SKILL.md');
      expect(missing?.reason).toContain('one plate for this card');
      expect(existsSync(fileURLToPath(new URL('../../docs-site/docs/plates/synthesis.md', import.meta.url)))).toBe(false);
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
      expect(outside?.reason).toContain('Plane: ecosystem');
      expect(lensBeforeResearch(root, 'bash', 'git status')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'npm test')).toBeNull();
      expect(lensBeforeResearch(root, 'bash', 'ls')).toBeNull();
      expect(lensBeforeResearch(root, 'search_replace', 'src/nucleus/thin-dispatch.ts')).toBeNull();
      expect(lensBeforeResearch(root, 'xray-researcher', 'learn the code')?.reason).toContain('Plane: ecosystem');
      expect(lensBeforeResearch(root, 'explorer', 'learn the code')?.reason).toContain('Plane: ecosystem');
      const home = lensBeforeResearch(root, 'bash', 'python3 -c "print(1)" src/core/config-paths.ts');
      expect(home?.decision).toBe('allow');
      expect(home?.reason).toContain('Plane: dev');
      expect(home?.reason).toContain('Entry:');
      expect(lensBeforeResearch(root, 'grep', 'back home')?.reason).toContain('Plane: dev');
    } finally {
      rmSync(root, { recursive: true, force: true });
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
      expect(look(['ground'], root).text).toContain('Stamp:');
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
      expect(card.skills).toBe('SKILLS.md');
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
      expect(run(['synthesis'])).toContain('one plate for this card');
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
});
