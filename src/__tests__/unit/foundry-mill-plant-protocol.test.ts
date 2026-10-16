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
  PROTOCOL,
  PACKAGE_ALIASES,
  parsePlantRef,
  readProtocol,
  selectPlantFiles,
  resolvePackageRoot,
  loadPlantRequests,
} = requireCjs(path.join(millRoot, 'mill-plant.cjs')) as {
  PROTOCOL: string | { id?: string; name?: string; protocol?: string };
  PACKAGE_ALIASES: Record<string, string>;
  parsePlantRef: (raw: string) => {
    builtin?: boolean;
    packageName?: string | null;
    package?: string | null;
    plantId?: string;
  };
  readProtocol: (pkgRoot: string) => {
    protocol?: string;
    skills?: string[];
    agents?: string[];
  };
  selectPlantFiles: (
    pkgRoot: string,
    plantId: string,
  ) => { skills: string[]; agents: string[] };
  resolvePackageRoot: (name: string, fromDir: string) => string | null;
  loadPlantRequests: (
    dir: string,
    millPackageRoot?: string,
  ) => Array<{
    builtin?: boolean;
    packageName?: string | null;
    plantId?: string;
    packageRoot?: string;
  }>;
};

function protocolId(value: typeof PROTOCOL): string {
  if (typeof value === 'string') return value;
  return String(value.id || value.name || value.protocol || '');
}

function sorted(names: string[] | undefined): string[] {
  return [...(names || [])].sort((a, b) => a.localeCompare(b));
}

function mustResolve(name: string, fromDir: string): string {
  const pkgRoot = resolvePackageRoot(name, fromDir);
  expect(pkgRoot, `resolve ${name} from ${fromDir}`).toBeTruthy();
  return pkgRoot as string;
}

function writeSkill(dir: string, name: string, body = `${name}\n`): void {
  mkdirSync(path.join(dir, 'plant/skills', name), { recursive: true });
  writeFileSync(path.join(dir, 'plant/skills', name, 'SKILL.md'), body);
}

function writeAgent(dir: string, file: string, body = `name: ${file}\n`): void {
  mkdirSync(path.join(dir, 'plant/agents'), { recursive: true });
  writeFileSync(path.join(dir, 'plant/agents', file), body);
}

describe('foundry-plant/0 — parse/resolve', () => {
  it('maps mill to builtin, blip to @0xray/blip, @0xray/blip/sound to sound prefix', () => {
    expect(protocolId(PROTOCOL)).toBe('foundry-plant/0');
    expect(PACKAGE_ALIASES.blip).toBe('@0xray/blip');

    const mill = parsePlantRef('mill');
    expect(mill.builtin).toBe(true);
    expect(mill.packageName ?? mill.package ?? null).toBeNull();
    expect(mill.plantId).toBe('mill');

    const blip = parsePlantRef('blip');
    expect(blip.builtin).toBeFalsy();
    expect(blip.packageName || blip.package).toBe('@0xray/blip');
    expect(blip.plantId).toBe('blip');

    const sound = parsePlantRef('@0xray/blip/sound');
    expect(sound.builtin).toBeFalsy();
    expect(sound.packageName || sound.package).toBe('@0xray/blip');
    expect(sound.plantId).toBe('sound');

    const pkgRoot = resolvePackageRoot('@0xray/blip', millRoot);
    expect(pkgRoot).toBeTruthy();
    expect(pkgRoot).toContain(`${path.sep}@0xray${path.sep}blip`);
    expect(pkgRoot).not.toContain(path.join('scripts', 'foundry', 'plant'));
    expect(existsSync(path.join(pkgRoot as string, 'plant/skills/blip-looker/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(pkgRoot as string, 'package.json'))).toBe(true);
    expect(JSON.parse(readFileSync(path.join(pkgRoot as string, 'package.json'), 'utf8')).name).toBe(
      '@0xray/blip',
    );

    const proto = readProtocol(pkgRoot as string);
    expect(proto.protocol || protocolId(PROTOCOL)).toBe('foundry-plant/0');
    const blipFiles = selectPlantFiles(pkgRoot as string, 'blip');
    expect(blipFiles.skills).toEqual(expect.arrayContaining(['blip', 'blip-looker']));
    expect(blipFiles.skills).not.toContain('sound');
  });
});

describe('foundry-plant/0 — prefix selection', () => {
  it('selects plant id foo plus foo-* only from a fake mill package', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-plant-prefix-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: '@fake/mill', version: '0.0.0' }, null, 2)}\n`,
      );
      writeSkill(tmp, 'foo');
      writeSkill(tmp, 'foo-bar');
      writeSkill(tmp, 'other');
      writeAgent(tmp, 'foo.yml');
      writeAgent(tmp, 'foo-bar.yml');
      writeAgent(tmp, 'other.yml');

      const files = selectPlantFiles(tmp, 'foo');
      expect(sorted(files.skills)).toEqual(['foo', 'foo-bar']);
      expect(sorted(files.agents)).toEqual(['foo-bar.yml', 'foo.yml']);
      expect(files.skills).not.toContain('other');
      expect(files.agents).not.toContain('other.yml');

      const proto = readProtocol(tmp);
      expect(proto.protocol || protocolId(PROTOCOL)).toBe('foundry-plant/0');
      expect(sorted(selectPlantFiles(tmp, 'other').skills)).toEqual(['other']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry-plant/0 — mint blip from mill package', () => {
  it('fastens blip-looker from @0xray/blip and does not fasten mill+inspect', () => {
    const { mintConsumerSuit } = requireCjs(path.join(millRoot, 'mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => {
        plant?: string[];
        millPlant?: { skills: string[] };
        blipPlant?: { skills: string[] };
      };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-plant-blip-mint-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'tiny-video', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);

      const reqs = loadPlantRequests(tmp);
      expect(reqs).toHaveLength(1);
      expect(reqs[0]?.builtin).toBeFalsy();
      expect(reqs[0]?.packageName).toBe('@0xray/blip');
      expect(reqs[0]?.plantId).toBe('blip');

      const blipRoot = mustResolve('@0xray/blip', millRoot);
      const protocolSet = selectPlantFiles(blipRoot, 'blip');
      expect(protocolSet.skills).toContain('blip-looker');
      expect(protocolSet.skills).toContain('blip');
      expect(protocolSet.skills).not.toContain('sound');

      const inv = mintConsumerSuit(millRoot, tmp, () => undefined);
      expect(inv.plant).toEqual(['blip']);
      expect(inv.millPlant?.skills || []).toEqual([]);
      expect(sorted(inv.blipPlant?.skills)).toEqual(sorted(protocolSet.skills));
      expect(existsSync(path.join(tmp, '.opencode/skills/blip-looker/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(tmp, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(tmp, '.opencode/skills/inspect/SKILL.md'))).toBe(false);
      expect(readFileSync(path.join(tmp, '.opencode/skills/blip-looker/SKILL.md'), 'utf8')).toBe(
        readFileSync(path.join(blipRoot, 'plant/skills/blip-looker/SKILL.md'), 'utf8'),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry-plant/0 — inspect receipt uses protocol set', () => {
  it('is ok when inventory.blipPlant.skills match the mill package prefix set (looker from mill)', async () => {
    const { mintConsumerSuit } = requireCjs(path.join(millRoot, 'mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => {
        blipPlant?: { skills: string[] };
      };
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-plant-blip-inspect-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'tiny-video', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);

      const blipRoot = mustResolve('@0xray/blip', millRoot);
      const protocolSet = selectPlantFiles(blipRoot, 'blip');
      expect(protocolSet.skills).toContain('blip-looker');
      expect(existsSync(path.join(blipRoot, 'plant/skills/blip-looker/SKILL.md'))).toBe(true);

      const inv = mintConsumerSuit(millRoot, tmp, () => undefined);
      expect(sorted(inv.blipPlant?.skills)).toEqual(sorted(protocolSet.skills));

      const report = await inspectSuit(tmp, { millRoot, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const receipt = report.checks.find((c) => c.id === 'receipt') as {
        ok?: boolean;
        blipPlant?: string[];
        millPlant?: string[];
        detail?: string | null;
      };
      expect(receipt.ok).toBe(true);
      expect(sorted(receipt.blipPlant)).toEqual(sorted(protocolSet.skills));
      expect(receipt.millPlant).toEqual([]);
      expect(protocolSet.skills).toContain('blip-looker');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry-plant/0 — missing package fail-closes', () => {
  it('does not fasten @not-a-real-mill/nope from leftover foundry plant copies', () => {
    const { mintConsumerSuit } = requireCjs(path.join(millRoot, 'mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-plant-missing-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'nope-seat', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'foundry.json'),
        `${JSON.stringify({ plant: '@not-a-real-mill/nope' }, null, 2)}\n`,
      );

      const parsed = parsePlantRef('@not-a-real-mill/nope');
      expect(parsed.builtin).toBeFalsy();
      expect(parsed.packageName || parsed.package).toBe('@not-a-real-mill/nope');

      const missing = resolvePackageRoot('@not-a-real-mill/nope', millRoot);
      if (missing) {
        throw new Error(`expected unresolved mill package, got ${missing}`);
      }
      expect(missing).toBeNull();
      expect(() => loadPlantRequests(tmp, millRoot)).toThrow(
        /not installed|unresolved|fail-closed|missing mill package/i,
      );
      expect(() => mintConsumerSuit(millRoot, tmp, () => undefined)).toThrow(
        /not installed|unresolved|fail-closed|missing mill package/i,
      );
      expect(existsSync(path.join(tmp, '.opencode/skills/blip/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(tmp, '.opencode/skills/mill/SKILL.md'))).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
