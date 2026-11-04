import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const millRoot = path.join(root, 'scripts/foundry');

const {
  PACKAGE_ALIASES,
  PLANT_ID_ALIASES,
  parsePlantRef,
  readProtocol,
  selectPlantFiles,
  resolvePackageRoot,
  loadPlantRequests,
} = requireCjs(path.join(millRoot, 'mill-plant.cjs')) as {
  PACKAGE_ALIASES: Record<string, string>;
  PLANT_ID_ALIASES: Record<string, string>;
  parsePlantRef: (raw: string) => {
    builtin?: boolean;
    packageName?: string | null;
    plantId?: string;
    alias?: boolean;
  };
  readProtocol: (pkgRoot: string) => {
    protocol?: string;
    plants?: Record<string, { millOff?: boolean; skills?: string[] }>;
  };
  selectPlantFiles: (
    pkgRoot: string,
    plantId: string,
  ) => { skills: string[]; agents: string[]; millOff?: boolean };
  resolvePackageRoot: (name: string, fromDir: string) => string | null;
  loadPlantRequests: (
    dir: string,
    millPackageRoot?: string,
  ) => Array<{
    builtin?: boolean;
    packageName?: string | null;
    plantId?: string;
    millOff?: boolean;
    skills?: string[];
  }>;
};

function sorted(names: string[] | undefined): string[] {
  return [...(names || [])].sort((a, b) => a.localeCompare(b));
}

const GOGGLES_SKILLS = ['goggles', 'goggles-inspect', 'goggles-look'];

describe('foundry goggles plant — resolve', () => {
  it('maps goggles and scout to one plant on @0xray/foundry and leaves sound/blip on @0xray/blip', () => {
    expect(PACKAGE_ALIASES.goggles).toBe('@0xray/foundry');
    expect(PACKAGE_ALIASES.scout).toBe('@0xray/foundry');
    expect(PLANT_ID_ALIASES.scout).toBe('goggles');
    expect(PACKAGE_ALIASES.sound).toBe('@0xray/blip');
    expect(PACKAGE_ALIASES.blip).toBe('@0xray/blip');

    const goggles = parsePlantRef('goggles');
    expect(goggles.builtin).toBeFalsy();
    expect(goggles.alias).toBe(true);
    expect(goggles.packageName).toBe('@0xray/foundry');
    expect(goggles.plantId).toBe('goggles');

    const scout = parsePlantRef('scout');
    expect(scout.packageName).toBe('@0xray/foundry');
    expect(scout.plantId).toBe('goggles');

    const sound = parsePlantRef('sound');
    expect(sound.packageName).toBe('@0xray/blip');
    expect(sound.plantId).toBe('sound');

    const blip = parsePlantRef('blip');
    expect(blip.packageName).toBe('@0xray/blip');
    expect(blip.plantId).toBe('blip');

    const fromRepo = resolvePackageRoot('@0xray/foundry', root);
    const fromMill = resolvePackageRoot('@0xray/foundry', millRoot);
    expect(fromRepo).toBe(millRoot);
    expect(fromMill).toBe(millRoot);

    const blipRoot = resolvePackageRoot('@0xray/blip', root);
    expect(blipRoot).toBeTruthy();
    expect(blipRoot).toContain(`${path.sep}@0xray${path.sep}blip`);
    expect(blipRoot).not.toBe(millRoot);

    const proto = readProtocol(millRoot);
    expect(proto.protocol).toBe('foundry-plant/0');
    expect(proto.plants?.goggles?.millOff).toBe(true);

    const gogglesFiles = selectPlantFiles(millRoot, 'goggles');
    expect(gogglesFiles.millOff).toBe(true);
    expect(sorted(gogglesFiles.skills)).toEqual(GOGGLES_SKILLS);
    expect(sorted(gogglesFiles.agents)).toEqual([
      'goggles-inspect.yml',
      'goggles-look.yml',
      'goggles.yml',
    ]);
    expect(gogglesFiles.skills).not.toContain('sound');
    expect(gogglesFiles.skills).not.toContain('blip');
    expect(gogglesFiles.skills).not.toContain('mill');
    expect(gogglesFiles.skills).not.toContain('inspect');

    const soundFiles = selectPlantFiles(blipRoot as string, 'sound');
    expect(soundFiles.skills).toEqual(
      expect.arrayContaining(['sound', 'sound-inspect', 'sound-mixer']),
    );
    expect(soundFiles.skills).not.toContain('goggles');
    const blipFiles = selectPlantFiles(blipRoot as string, 'blip');
    expect(blipFiles.skills).toEqual(expect.arrayContaining(['blip', 'blip-inspect', 'blip-looker']));
    expect(blipFiles.skills).not.toContain('goggles');

    const body = readFileSync(path.join(millRoot, 'plant/skills/goggles/SKILL.md'), 'utf8');
    expect(body).toMatch(/Nibbler/);
    expect(body).toMatch(/plane/i);
    expect(body).toMatch(/feed look/i);
    expect(body).toMatch(/not the eng mill/i);
    expect(body).toMatch(/not Dist beds/i);
    expect(body).not.toMatch(/\bhangar\b/i);
    expect(body).not.toMatch(/4\.44/);
    expect(readFileSync(path.join(millRoot, 'plant/skills/goggles-look/SKILL.md'), 'utf8')).toMatch(
      /feed/i,
    );
    expect(
      readFileSync(path.join(millRoot, 'plant/skills/goggles-inspect/SKILL.md'), 'utf8'),
    ).toMatch(/unknown skill/i);
    expect(readFileSync(path.join(root, 'scripts/foundry/README.md'), 'utf8')).toMatch(
      /"plant": "goggles"/,
    );
  });
});

describe('foundry goggles plant — mint and inspect', () => {
  it('fastens only scout lenses for goggles and scout pins, and inspect fails closed on an unknown skill', async () => {
    const { mintConsumerSuit } = requireCjs(path.join(millRoot, 'mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => {
        suit: string;
        plant?: string[];
        costume?: boolean;
        millPlant?: { skills: string[] };
        soundPlant?: { skills: string[] };
        blipPlant?: { skills: string[] };
        plants?: Record<string, { skills: string[] }>;
      };
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');

    const millSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-goggles-mill-'));
    const gogglesSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-goggles-seat-'));
    const scoutSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-scout-seat-'));
    try {
      writeFileSync(
        path.join(millSeat, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const millInv = mintConsumerSuit(root, millSeat, () => undefined);
      expect(millInv.plant).toEqual(['mill']);
      expect(millInv.millPlant?.skills).toEqual(['mill', 'inspect']);
      expect(millInv.plants?.goggles).toBeUndefined();
      expect(existsSync(path.join(millSeat, '.opencode/skills/goggles/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(millSeat, '.opencode/skills/mill/SKILL.md'))).toBe(true);

      writeFileSync(
        path.join(gogglesSeat, 'package.json'),
        `${JSON.stringify({ name: 'nibbler-suit', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(gogglesSeat, 'foundry.json'),
        `${JSON.stringify({ plant: 'goggles', costume: false }, null, 2)}\n`,
      );
      const reqs = loadPlantRequests(gogglesSeat, root);
      expect(reqs).toHaveLength(1);
      expect(reqs[0]?.builtin).toBeFalsy();
      expect(reqs[0]?.packageName).toBe('@0xray/foundry');
      expect(reqs[0]?.plantId).toBe('goggles');
      expect(reqs[0]?.millOff).toBe(true);
      expect(sorted(reqs[0]?.skills)).toEqual(GOGGLES_SKILLS);

      const inv = mintConsumerSuit(root, gogglesSeat, () => undefined);
      expect(inv.costume).toBe(false);
      expect(inv.suit).toBe('fastened');
      expect(inv.plant).toEqual(['goggles']);
      expect(inv.millPlant?.skills).toEqual([]);
      expect(inv.soundPlant?.skills).toEqual([]);
      expect(inv.blipPlant?.skills).toEqual([]);
      expect(sorted(inv.plants?.goggles?.skills)).toEqual(GOGGLES_SKILLS);
      for (const name of GOGGLES_SKILLS) {
        expect(existsSync(path.join(gogglesSeat, '.opencode/skills', name, 'SKILL.md'))).toBe(true);
        expect(
          existsSync(path.join(gogglesSeat, '.grok/plugins/0xray/skills', name, 'SKILL.md')),
        ).toBe(true);
      }
      expect(existsSync(path.join(gogglesSeat, '.opencode/agents/goggles.yml'))).toBe(true);
      expect(existsSync(path.join(gogglesSeat, '.opencode/agents/goggles-look.yml'))).toBe(true);
      expect(existsSync(path.join(gogglesSeat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(gogglesSeat, '.opencode/skills/inspect/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(gogglesSeat, '.opencode/skills/enforcer/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(gogglesSeat, '.opencode/skills/sound/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(gogglesSeat, '.opencode/skills/blip/SKILL.md'))).toBe(false);

      const report = await inspectSuit(gogglesSeat, { millRoot: root, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const receipt = report.checks.find((c) => c.id === 'receipt') as {
        plant?: string[];
        millPlant?: string[];
      };
      expect(receipt.plant).toEqual(['goggles']);
      expect(receipt.millPlant).toEqual([]);

      const unknown = path.join(gogglesSeat, '.opencode/skills/enforcer');
      mkdirSync(unknown, { recursive: true });
      writeFileSync(path.join(unknown, 'SKILL.md'), 'UNKNOWN SKILL\n');
      const closed = await inspectSuit(gogglesSeat, { millRoot: root, skipLive: true });
      expect(closed.ok).toBe(false);
      expect(closed.failed).toContain('plant-vs-worn');
      const plantCheck = closed.checks.find((c) => c.id === 'plant-vs-worn') as {
        ok?: boolean;
        detail?: string;
        extraSkills?: string[];
      };
      expect(plantCheck.ok).toBe(false);
      expect(plantCheck.detail || '').toMatch(/enforcer/);
      expect(plantCheck.extraSkills).toContain('enforcer');

      writeFileSync(
        path.join(scoutSeat, 'package.json'),
        `${JSON.stringify({ name: 'nibbler-suit', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(scoutSeat, 'foundry.json'),
        `${JSON.stringify({ plant: 'scout', costume: false }, null, 2)}\n`,
      );
      const scoutInv = mintConsumerSuit(root, scoutSeat, () => undefined);
      expect(scoutInv.plant).toEqual(['goggles']);
      expect(scoutInv.millPlant?.skills).toEqual([]);
      expect(sorted(scoutInv.plants?.goggles?.skills)).toEqual(GOGGLES_SKILLS);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/goggles/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/sound/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
    } finally {
      rmSync(millSeat, { recursive: true, force: true });
      rmSync(gogglesSeat, { recursive: true, force: true });
      rmSync(scoutSeat, { recursive: true, force: true });
    }
  });
});
