import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectValidateReport } from '../../cli/commands/validate.js';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');
const gogglesScript = path.join(repoRoot, 'src/integrations/hooks/goggles-pipeline.mjs');
const version = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version as string;

function freshHome(): string {
  return mkdtempSync(path.join(tmpdir(), 'xray-plant-home-'));
}

function linkPackage(project: string): void {
  const dest = path.join(project, 'node_modules', '0xray');
  mkdirSync(path.dirname(dest), { recursive: true });
  if (!existsSync(dest)) symlinkSync(repoRoot, dest, 'dir');
}

function wear(project: string, home: string) {
  return spawnSync(process.execPath, [wearScript, project], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

function goggles(project: string): string {
  return execFileSync(process.execPath, [gogglesScript], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, GOGGLES_ROOT: project },
  });
}

function skillNames(project: string, rel: string): string[] {
  const dir = path.join(project, rel);
  if (!existsSync(dir)) return [];
  return execFileSync('ls', ['-1', dir], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

describe('wear fixtures for mill, sound, and git', () => {
  it('wears three suits with the same validate checks and a filled Worn line', () => {
    const mill = mkdtempSync(path.join(tmpdir(), 'xray-fix-mill-'));
    const sound = mkdtempSync(path.join(tmpdir(), 'xray-fix-sound-'));
    const git = mkdtempSync(path.join(tmpdir(), 'xray-fix-git-'));
    const homes = [freshHome(), freshHome(), freshHome()];
    try {
      writeFileSync(path.join(mill, 'package.json'), `${JSON.stringify({ name: 'mill-seat' })}\n`);
      writeFileSync(path.join(sound, 'package.json'), `${JSON.stringify({ name: 'sound-seat' })}\n`);
      writeFileSync(path.join(git, 'package.json'), `${JSON.stringify({ name: 'git-seat' })}\n`);
      writeFileSync(path.join(sound, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
      mkdirSync(path.join(sound, '.xray', 'state'), { recursive: true });
      writeFileSync(
        path.join(sound, '.xray', 'state', 'STATION.md'),
        ['# Station', '', 'Intent: keep this', 'Git: n/a', 'Fresh: up to date. package 4.0.42.', 'Plane: domain', ''].join('\n'),
      );
      execFileSync('git', ['init'], { cwd: git, stdio: 'ignore' });
      for (const project of [mill, sound, git]) linkPackage(project);

      const wore = [mill, sound, git].map((project, i) => wear(project, homes[i]));
      for (const ran of wore) {
        expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      }
      expect(wore[0].stderr).toContain('hooks skipped because this folder is not a git checkout');
      expect(wore[1].stderr).toContain('hooks skipped because this folder is not a git checkout');
      expect(wore[2].stderr).toBe('');
      expect(existsSync(path.join(mill, '.cursor', 'hooks.json'))).toBe(false);
      expect(existsSync(path.join(sound, '.cursor', 'hooks.json'))).toBe(false);
      expect(existsSync(path.join(git, '.cursor', 'hooks.json'))).toBe(true);

      const soundSkills = skillNames(sound, '.grok/plugins/0xray/skills');
      expect(soundSkills).toEqual(expect.arrayContaining(['sound', 'sound-inspect', 'sound-mixer']));
      expect(soundSkills).not.toContain('orchestrator');
      expect(soundSkills).not.toContain('enforcer');
      expect(skillNames(mill, '.grok/plugins/0xray/skills')).toContain('orchestrator');
      expect(existsSync(path.join(sound, '.opencode', 'skills', 'mill', 'SKILL.md'))).toBe(false);

      const reports = [mill, sound, git].map((project) => collectValidateReport(project));
      for (const report of reports) {
        expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      }
      const ids = reports.map((report) => report.checks.map((check) => check.id));
      expect(ids[0]).toEqual(ids[1]);
      expect(ids[1]).toEqual(ids[2]);
      expect(ids[0]).toContain('plant');
      expect(reports[0].checks.find((check) => check.id === 'consumer-wear')?.detail).toContain(
        'hooks skipped because this folder is not a git work tree',
      );
      expect(reports[2].checks.find((check) => check.id === 'consumer-wear')?.detail).not.toContain(
        'hooks skipped',
      );

      const station = readFileSync(path.join(sound, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(station).toContain('Intent: keep this');
      expect(station).toContain(`package ${version}`);
      expect(station).not.toContain('package 4.0.42');
      expect(station).toMatch(/^Plane: domain$/m);
      const millStation = readFileSync(path.join(mill, '.xray', 'state', 'STATION.md'), 'utf8');
      expect(millStation).toContain(`package ${version}`);
      expect(millStation).toMatch(/^Plane: integration$/m);
      expect(readFileSync(path.join(mill, '.xray', 'state', 'NOTES.md'), 'utf8')).toBe(
        ['Point:', 'Open:', 'Learned:', 'Next cut:', ''].join('\n'),
      );

      const millLens = goggles(mill);
      const soundLens = goggles(sound);
      expect(millLens).toContain(`Worn: mill ${version}`);
      expect(soundLens).toContain(`Worn: sound ${version}`);
      expect(millLens).toContain('Skills: mill, inspect');
      expect(soundLens).toContain('Skills: sound, sound-inspect, sound-mixer');
      expect(millLens).not.toContain('Skills: sound, sound-inspect, sound-mixer');
    } finally {
      for (const project of [mill, sound, git]) rmSync(project, { recursive: true, force: true });
      for (const home of homes) rmSync(home, { recursive: true, force: true });
    }
  });

  it('restamps only a version token and keeps a Plane the seat set', () => {
    const seat = createRequire(import.meta.url)('../../../scripts/node/suit-seat.cjs') as {
      seedSuitPages: (root: string, packageRoot: string) => { version: string };
      fastenedPlantSkills: (root: string) => string[];
    };
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-restamp-'));
    try {
      writeFileSync(path.join(dir, 'foundry.json'), `${JSON.stringify({ plant: 'mill' })}\n`);
      mkdirSync(path.join(dir, '.xray', 'state'), { recursive: true });
      const kept = [
        '# Station',
        '',
        'Intent: keep this',
        'Git: n/a',
        'Fresh: 2 behind main.',
        'Plane: domain',
        '',
      ].join('\n');
      writeFileSync(path.join(dir, '.xray', 'state', 'STATION.md'), kept);
      seat.seedSuitPages(dir, repoRoot);
      expect(readFileSync(path.join(dir, '.xray', 'state', 'STATION.md'), 'utf8')).toBe(kept);

      writeFileSync(path.join(dir, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
      writeFileSync(
        path.join(dir, '.xray', 'foundry-inventory.json'),
        `${JSON.stringify({
          plant: ['sound'],
          millPlant: { skills: ['mill', 'inspect'] },
          soundPlant: { skills: ['sound', 'sound-inspect', 'sound-mixer'] },
          blipPlant: { skills: ['blip-vibe', 'blip-looker'] },
        })}\n`,
      );
      expect(seat.fastenedPlantSkills(dir)).toEqual(['sound', 'sound-inspect', 'sound-mixer']);

      const blip = mkdtempSync(path.join(tmpdir(), 'xray-blip-skills-'));
      writeFileSync(path.join(blip, 'foundry.json'), `${JSON.stringify({ plant: 'blip' })}\n`);
      expect(seat.fastenedPlantSkills(blip).sort()).toEqual(
        ['blip', 'blip-inspect', 'blip-looker', 'blip-vibe'].sort(),
      );
      rmSync(blip, { recursive: true, force: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('puts the station boot read in the Grok wake template', () => {
    const text = readFileSync(path.join(repoRoot, 'grok-bot/templates/house/fleet/WAKE-ROUTINE.md'), 'utf8');
    expect(text).toContain('Grok Bot wakes never run `.cursor` hooks, so this step is the boot hook.');
    expect(text).toContain('if it\'s still stale, append one line to NOTES.md and go on.');
    expect(text).not.toContain('#395');
    expect(text).toContain('An empty read with nothing owed is a quiet wake: skip steps 3 to 6 and go straight to step 7.');
  });
});