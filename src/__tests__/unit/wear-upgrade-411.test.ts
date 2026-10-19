import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');
const gogglesScript = path.join(repoRoot, 'src/integrations/hooks/goggles-pipeline.mjs');
const inspectScript = path.join(repoRoot, 'scripts/foundry/cli.mjs');
const version = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version as string;
const stockSkills = 'orchestrator, researcher, project-analysis, git-workflow, tech-writer';
const skillDirs = [
  '.opencode/skills',
  '.grok/plugins/0xray/skills',
  '.hermes/plugins/xray-hermes/skills',
  '.openclaw/skills',
];

function publishedPackage(spec: string): string {
  const root = path.join(tmpdir(), 'xray-published-cache', spec);
  const pkg = path.join(root, 'package');
  if (existsSync(path.join(pkg, 'scripts/node/wear-cursor-hooks.cjs'))) return pkg;
  mkdirSync(root, { recursive: true });
  const packed = execFileSync('npm', ['pack', `0xray@${spec}`, '--pack-destination', root], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .pop() as string;
  execFileSync('tar', ['-xzf', path.join(root, packed), '-C', root]);
  return pkg;
}

function wear(script: string, project: string, home: string, machine: string) {
  return spawnSync(process.execPath, [script, project], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, FOUNDRY_MACHINE_HOME: machine },
  });
}

function goggles(project: string): string {
  return execFileSync(process.execPath, [gogglesScript], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, GOGGLES_ROOT: project },
  });
}

function inspect(project: string, home: string, machine: string) {
  return spawnSync(process.execPath, [inspectScript, 'inspect', '--skip-live'], {
    cwd: project,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      FOUNDRY_MACHINE_HOME: machine,
      FOUNDRY_ROOT: project,
    },
  });
}

function skillFile(project: string, rel: string, name: string): string {
  return path.join(project, rel, name, 'SKILL.md');
}

function dropLink(project: string, name: string) {
  const dest = path.join(project, name);
  try {
    if (lstatSync(dest).isSymbolicLink()) rmSync(dest);
  } catch {
    /* nothing linked */
  }
}

function linkRepo(project: string) {
  const dest = path.join(project, 'node_modules', '0xray');
  mkdirSync(path.dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  symlinkSync(repoRoot, dest, 'dir');
}

function staleCard(plane: string): string {
  return [
    `Plane: ${plane}`,
    'From: dev',
    'Digest: stale',
    'Plate:',
    'Entry: old',
    'Exit: old',
    'Files: src',
    `Skills: ${stockSkills}`,
    'Setup: old',
    'Teardown: old',
    'Worn:',
  ].join('\n');
}

function writeSeat(project: string) {
  writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'sound-seat', private: true })}\n`);
  mkdirSync(path.join(project, '.xray'), { recursive: true });
  writeFileSync(
    path.join(project, '.xray', 'features.json'),
    `${JSON.stringify({ plant: 'sound', goggles: { enabled: true } }, null, 2)}\n`,
  );
}

function setPlaneLine(project: string, plane: string) {
  const dest = path.join(project, '.xray', 'state', 'STATION.md');
  mkdirSync(path.dirname(dest), { recursive: true });
  const prev = existsSync(dest) ? readFileSync(dest, 'utf8') : '# Station\n\nIntent: keep\n';
  const next = /^Plane:/m.test(prev)
    ? prev.replace(/^Plane:.*$/m, `Plane: ${plane}`)
    : `${prev.replace(/\s*$/, '')}\nPlane: ${plane}\n`;
  writeFileSync(dest, next.endsWith('\n') ? next : `${next}\n`);
}

/** Wear a published suit, then the fix, with postinstall never run. */
function proveUpgrade(spec: string) {
  const oldWear = path.join(publishedPackage(spec), 'scripts/node/wear-cursor-hooks.cjs');
  const dev = mkdtempSync(path.join(tmpdir(), `xray-up-${spec}-dev-`));
  const domain = mkdtempSync(path.join(tmpdir(), `xray-up-${spec}-domain-`));
  const homes = [mkdtempSync(path.join(tmpdir(), 'xray-up-home-')), mkdtempSync(path.join(tmpdir(), 'xray-up-home-'))];
  const machines = [mkdtempSync(path.join(tmpdir(), 'xray-up-machine-')), mkdtempSync(path.join(tmpdir(), 'xray-up-machine-'))];
  try {
    for (const project of [dev, domain]) writeSeat(project);
    const first = [dev, domain].map((project, i) => wear(oldWear, project, homes[i], machines[i]));
    for (const ran of first) {
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
    }
    for (const project of [dev, domain]) {
      for (const rel of ['.opencode/skills', '.hermes/plugins/xray-hermes/skills', '.openclaw/skills']) {
        expect(existsSync(skillFile(project, rel, 'orchestrator')), `${spec} ${rel}`).toBe(true);
      }
      expect(existsSync(path.join(project, '.opencode/agents/researcher.yml'))).toBe(true);
    }

    mkdirSync(path.join(dev, '.xray', 'state'), { recursive: true });
    writeFileSync(
      path.join(dev, '.xray', 'state', 'goggles-plane.json'),
      `${JSON.stringify({ plane: 'dev', card: 'dev' })}\n`,
    );
    writeFileSync(
      path.join(dev, '.xray', 'state', 'LENS.md'),
      `${staleCard('dev')}\n\n${staleCard('ecosystem')}\n`,
    );
    const devStationPath = path.join(dev, '.xray', 'state', 'STATION.md');
    const devStation = existsSync(devStationPath) ? readFileSync(devStationPath, 'utf8') : '';

    setPlaneLine(domain, 'domain');
    writeFileSync(
      path.join(domain, '.xray', 'state', 'goggles-plane.json'),
      `${JSON.stringify({ plane: 'domain', card: 'domain', chosen: true })}\n`,
    );
    writeFileSync(path.join(domain, '.xray', 'state', 'LENS.md'), `${staleCard('domain')}\n`);
    const domainStation = readFileSync(path.join(domain, '.xray', 'state', 'STATION.md'), 'utf8');

    for (const project of [dev, domain]) {
      dropLink(project, 'scripts');
      dropLink(project, 'dist');
      linkRepo(project);
      const features = JSON.parse(readFileSync(path.join(project, '.xray', 'features.json'), 'utf8'));
      features.plant = 'sound';
      features.goggles = { ...(features.goggles || {}), enabled: true };
      writeFileSync(path.join(project, '.xray', 'features.json'), `${JSON.stringify(features, null, 2)}\n`);
    }

    const upgraded = [dev, domain].map((project, i) => wear(wearScript, project, homes[i], machines[i]));
    for (const ran of upgraded) {
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      expect(ran.stderr).not.toContain('costume dump');
    }

    for (const project of [dev, domain]) {
      for (const rel of skillDirs) {
        expect(existsSync(skillFile(project, rel, 'orchestrator')), rel).toBe(false);
        expect(existsSync(skillFile(project, rel, 'sound')), rel).toBe(true);
        expect(existsSync(skillFile(project, rel, 'sound-inspect')), rel).toBe(true);
        expect(existsSync(skillFile(project, rel, 'sound-mixer')), rel).toBe(true);
      }
      expect(existsSync(path.join(project, '.opencode/agents/researcher.yml'))).toBe(false);
      expect(existsSync(path.join(project, '.opencode/agents/mill.yml'))).toBe(false);
      expect(existsSync(path.join(project, '.opencode/agents/sound.yml'))).toBe(true);
      const repertoire = path.join(project, 'node_modules', '@0xray', 'repertoire', 'package.json');
      expect(JSON.parse(readFileSync(repertoire, 'utf8')).name).toBe('@0xray/repertoire');
      const again = wear(wearScript, project, homes[0], machines[0]);
      expect(again.status, `${again.stdout}\n${again.stderr}`).toBe(0);
      const inspected = inspect(project, homes[0], machines[0]);
      expect(inspected.status, `${inspected.stdout}\n${inspected.stderr}`).toBe(0);
    }

    const devCard = goggles(dev);
    expect(devCard).toContain('Plane: ecosystem');
    expect(devCard).toContain('Skills: sound, sound-inspect, sound-mixer');
    expect(devCard).toContain(`Worn: sound ${version}`);
    expect(devCard).not.toContain(stockSkills);
    const devStationAfter = readFileSync(devStationPath, 'utf8');
    // Wear restamps the Fresh line to the worn package; every other line holds.
    const dropFresh = (text: string) => text.replace(/^Fresh:.*$/m, '');
    if (devStation) {
      expect(dropFresh(devStationAfter)).toBe(dropFresh(devStation));
      expect(devStationAfter).toMatch(new RegExp(`^Fresh: .*package ${version.replace(/\./g, '\\.')}`, 'm'));
    }
    else expect(devStationAfter).toMatch(/^Plane: ecosystem$/m);

    const domainCard = goggles(domain);
    expect(domainCard).toContain('Plane: domain');
    expect(domainCard).not.toContain('Plane: ecosystem');
    expect(domainCard).toContain('Skills: sound, sound-inspect, sound-mixer');
    expect(domainCard).toContain(`Worn: sound ${version}`);
    expect(domainCard).not.toContain(stockSkills);
    expect(JSON.parse(readFileSync(path.join(domain, '.xray', 'state', 'goggles-plane.json'), 'utf8')).chosen).toBe(true);
    expect(dropFresh(readFileSync(path.join(domain, '.xray', 'state', 'STATION.md'), 'utf8'))).toBe(
      dropFresh(domainStation),
    );
  } finally {
    for (const dir of [dev, domain, ...homes, ...machines]) rmSync(dir, { recursive: true, force: true });
  }
}

/** A 4.1.1 mill suit has no chosen flag. Upgrade keeps that dev hold and the catalog. */
function proveMillUpgrade(spec: string) {
  const oldWear = path.join(publishedPackage(spec), 'scripts/node/wear-cursor-hooks.cjs');
  const project = mkdtempSync(path.join(tmpdir(), `xray-up-${spec}-mill-`));
  const home = mkdtempSync(path.join(tmpdir(), 'xray-up-mill-home-'));
  const machine = mkdtempSync(path.join(tmpdir(), 'xray-up-mill-machine-'));
  try {
    writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'mill-seat', private: true })}\n`);
    mkdirSync(path.join(project, '.xray'), { recursive: true });
    writeFileSync(
      path.join(project, '.xray', 'features.json'),
      `${JSON.stringify({ plant: 'mill', goggles: { enabled: true } }, null, 2)}\n`,
    );
    const first = wear(oldWear, project, home, machine);
    expect(first.status, `${first.stdout}\n${first.stderr}`).toBe(0);
    const catalogDirs = skillDirs.filter((rel) => existsSync(skillFile(project, rel, 'orchestrator')));
    expect(catalogDirs.length).toBeGreaterThan(0);
    expect(existsSync(path.join(project, '.opencode/agents/researcher.yml'))).toBe(true);

    const holdPath = path.join(project, '.xray', 'state', 'goggles-plane.json');
    mkdirSync(path.dirname(holdPath), { recursive: true });
    const hold = `${JSON.stringify({ plane: 'dev', card: 'dev' })}\n`;
    writeFileSync(holdPath, hold);
    writeFileSync(path.join(project, '.xray', 'state', 'LENS.md'), `${staleCard('dev')}\n`);
    setPlaneLine(project, 'dev');
    const stationBefore = readFileSync(path.join(project, '.xray', 'state', 'STATION.md'), 'utf8');
    expect(stationBefore).toMatch(/^Plane: dev$/m);

    dropLink(project, 'scripts');
    dropLink(project, 'dist');
    linkRepo(project);
    const features = JSON.parse(readFileSync(path.join(project, '.xray', 'features.json'), 'utf8'));
    features.plant = 'mill';
    features.goggles = { ...(features.goggles || {}), enabled: true };
    writeFileSync(path.join(project, '.xray', 'features.json'), `${JSON.stringify(features, null, 2)}\n`);
    const foundryPaths = [path.join(project, 'foundry.json'), path.join(project, '.xray', 'foundry.json')];
    for (const foundryPath of foundryPaths) {
      if (!existsSync(foundryPath)) continue;
      const foundry = JSON.parse(readFileSync(foundryPath, 'utf8'));
      foundry.plant = 'mill';
      writeFileSync(foundryPath, `${JSON.stringify(foundry, null, 2)}\n`);
    }

    const upgraded = wear(wearScript, project, home, machine);
    expect(upgraded.status, `${upgraded.stdout}\n${upgraded.stderr}`).toBe(0);
    expect(upgraded.stderr).not.toContain('costume dump');
    expect(readFileSync(holdPath, 'utf8')).toBe(hold);
    expect(readFileSync(path.join(project, '.xray', 'state', 'STATION.md'), 'utf8')).toMatch(/^Plane: dev$/m);
    for (const rel of catalogDirs) {
      expect(existsSync(skillFile(project, rel, 'orchestrator')), rel).toBe(true);
    }
    expect(existsSync(path.join(project, '.opencode/agents/researcher.yml'))).toBe(true);
    const card = goggles(project);
    expect(card).toContain('Plane: dev');
    expect(card).not.toContain('Plane: integration');
  } finally {
    for (const dir of [project, home, machine]) rmSync(dir, { recursive: true, force: true });
  }
}

describe('upgrade a published non-mill suit without postinstall', () => {
  it('wears 4.1.1 mill, then keeps the dev hold and the catalog', () => {
    proveMillUpgrade('4.1.1');
  }, 240000);

  it('wears 4.1.1, then replaces a held dev plane and keeps a chosen domain plane', () => {
    proveUpgrade('4.1.1');
  }, 240000);

  it('wears 4.1.2, then applies the same upgrade', () => {
    proveUpgrade('4.1.2');
  }, 240000);

  it('resolves require(0xray/package.json)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-export-'));
    try {
      writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: 'seat' })}\n`);
      const dest = path.join(dir, 'node_modules', '0xray');
      mkdirSync(path.dirname(dest), { recursive: true });
      symlinkSync(repoRoot, dest, 'dir');
      const name = createRequire(path.join(dir, 'package.json'))('0xray/package.json').name;
      expect(name).toBe('0xray');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
