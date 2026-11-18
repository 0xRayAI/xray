import { spawnSync } from 'node:child_process';
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
  parsePlantRef,
  readProtocol,
  selectPlantFiles,
  resolvePackageRoot,
  loadPlantRequests,
} = requireCjs(path.join(millRoot, 'mill-plant.cjs')) as {
  PACKAGE_ALIASES: Record<string, string>;
  parsePlantRef: (raw: string) => {
    builtin?: boolean;
    packageName?: string | null;
    plantId?: string | null;
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

const { look, inspectFeed, evaluateFeed } = requireCjs(path.join(millRoot, 'scout-feed.cjs')) as {
  look: (opts: {
    root: string;
    brief?: string;
    plane?: string;
    topic?: string;
    body?: string;
    file?: string;
    paths?: string[];
  }) => { receipt: { status: string; reason: string | null; plane: string | null; topic: string | null; paths: string[]; digest: string | null } };
  inspectFeed: (dir: string) => { ok: boolean; status: string; reason: string | null };
  evaluateFeed: (opts: { plane: string; body: string; digestExists: boolean }) => {
    status: string;
    reason: string | null;
    gates: { plane: boolean; body: boolean; digest: boolean };
  };
};

function sorted(names: string[] | undefined): string[] {
  return [...(names || [])].sort((a, b) => a.localeCompare(b));
}

const SCOUT_SKILLS = ['scout', 'scout-inspect', 'scout-look'];

describe('foundry scout plant — resolve', () => {
  it('maps scout to @0xray/foundry and leaves sound/blip on @0xray/blip', () => {
    expect(PACKAGE_ALIASES.scout).toBe('@0xray/foundry');
    expect(PACKAGE_ALIASES.goggles).toBeUndefined();
    expect(PACKAGE_ALIASES.sound).toBe('@0xray/blip');
    expect(PACKAGE_ALIASES.blip).toBe('@0xray/blip');

    const scout = parsePlantRef('scout');
    expect(scout.alias).toBe(true);
    expect(scout.packageName).toBe('@0xray/foundry');
    expect(scout.plantId).toBe('scout');

    const hud = parsePlantRef('goggles');
    expect(hud.alias).toBeFalsy();
    expect(hud.packageName).toBe('goggles');
    expect(hud.plantId).toBeNull();

    const sound = parsePlantRef('sound');
    expect(sound.packageName).toBe('@0xray/blip');
    expect(sound.plantId).toBe('sound');
    const blip = parsePlantRef('blip');
    expect(blip.packageName).toBe('@0xray/blip');
    expect(blip.plantId).toBe('blip');

    expect(resolvePackageRoot('@0xray/foundry', root)).toBe(millRoot);
    const proto = readProtocol(millRoot);
    expect(proto.protocol).toBe('foundry-plant/0');
    expect(proto.plants?.scout?.millOff).toBe(true);
    expect(proto.plants?.goggles).toBeUndefined();

    const scoutFiles = selectPlantFiles(millRoot, 'scout');
    expect(scoutFiles.millOff).toBe(true);
    expect(sorted(scoutFiles.skills)).toEqual(SCOUT_SKILLS);
    expect(scoutFiles.skills).not.toContain('sound');
    expect(scoutFiles.skills).not.toContain('goggles');
    expect(scoutFiles.skills).not.toContain('mill');

    const blipRoot = resolvePackageRoot('@0xray/blip', root) as string;
    const soundFiles = selectPlantFiles(blipRoot, 'sound');
    expect(soundFiles.skills).toEqual(
      expect.arrayContaining(['sound', 'sound-inspect', 'sound-mixer']),
    );
    expect(soundFiles.skills).not.toContain('scout');
    const blipFiles = selectPlantFiles(blipRoot, 'blip');
    expect(blipFiles.skills).toEqual(expect.arrayContaining(['blip', 'blip-inspect']));
    expect(blipFiles.skills).not.toContain('scout');

    const body = readFileSync(path.join(millRoot, 'plant/skills/scout/SKILL.md'), 'utf8');
    expect(body).toMatch(/Nibbler/);
    expect(body).toMatch(/digest/i);
    expect(body).toMatch(/not the suit HUD/i);
    expect(body).toMatch(/not the eng mill/i);
    expect(body).toMatch(/not Dist beds/i);
    expect(body).not.toMatch(/\bhangar\b/i);
    expect(readFileSync(path.join(millRoot, 'cli.mjs'), 'utf8')).toContain('scout: { script: "scout.mjs"');
    expect(readFileSync(path.join(root, 'scripts/foundry/README.md'), 'utf8')).toMatch(/"plant": "scout"/);
    expect(readFileSync(path.join(root, 'scripts/foundry/package.json'), 'utf8')).toMatch(/"version": "0\.1\.15"/);
  });
});

describe('foundry scout plant — mint and inspect', () => {
  it('fastens only scout skills, and plant-vs-worn fails closed on an unknown skill', async () => {
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
    const millSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-scout-mill-'));
    const scoutSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-scout-seat-'));
    try {
      writeFileSync(
        path.join(millSeat, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const millInv = mintConsumerSuit(root, millSeat, () => undefined);
      expect(millInv.plant).toEqual(['mill']);
      expect(millInv.millPlant?.skills).toEqual(['mill', 'inspect']);
      expect(millInv.plants?.scout).toBeUndefined();
      expect(existsSync(path.join(millSeat, '.opencode/skills/scout/SKILL.md'))).toBe(false);

      writeFileSync(
        path.join(scoutSeat, 'package.json'),
        `${JSON.stringify({ name: 'nibbler-suit', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(scoutSeat, 'foundry.json'),
        `${JSON.stringify({ plant: 'scout', costume: false }, null, 2)}\n`,
      );
      const reqs = loadPlantRequests(scoutSeat, root);
      expect(reqs).toHaveLength(1);
      expect(reqs[0]?.packageName).toBe('@0xray/foundry');
      expect(reqs[0]?.plantId).toBe('scout');
      expect(reqs[0]?.millOff).toBe(true);
      expect(sorted(reqs[0]?.skills)).toEqual(SCOUT_SKILLS);

      const inv = mintConsumerSuit(root, scoutSeat, () => undefined);
      expect(inv.costume).toBe(false);
      expect(inv.suit).toBe('fastened');
      expect(inv.plant).toEqual(['scout']);
      expect(inv.millPlant?.skills).toEqual([]);
      expect(inv.soundPlant?.skills).toEqual([]);
      expect(inv.blipPlant?.skills).toEqual([]);
      expect(sorted(inv.plants?.scout?.skills)).toEqual(SCOUT_SKILLS);
      for (const name of SCOUT_SKILLS) {
        expect(existsSync(path.join(scoutSeat, '.opencode/skills', name, 'SKILL.md'))).toBe(true);
      }
      expect(existsSync(path.join(scoutSeat, '.opencode/agents/scout.yml'))).toBe(true);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/goggles/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(scoutSeat, '.opencode/skills/sound/SKILL.md'))).toBe(false);

      const quiet = await inspectSuit(scoutSeat, { millRoot: root, skipLive: true });
      expect(quiet.ok, JSON.stringify(quiet.checks, null, 2)).toBe(true);
      const none = quiet.checks.find((c) => c.id === 'scout-feed') as { status?: string; skipped?: boolean };
      expect(none.status).toBe('NONE');
      expect(none.skipped).toBe(true);

      const unknown = path.join(scoutSeat, '.opencode/skills/enforcer');
      mkdirSync(unknown, { recursive: true });
      writeFileSync(path.join(unknown, 'SKILL.md'), 'UNKNOWN SKILL\n');
      const closed = await inspectSuit(scoutSeat, { millRoot: root, skipLive: true });
      expect(closed.ok).toBe(false);
      expect(closed.failed).toContain('plant-vs-worn');
      const plantCheck = closed.checks.find((c) => c.id === 'plant-vs-worn') as {
        ok?: boolean;
        extraSkills?: string[];
      };
      expect(plantCheck.ok).toBe(false);
      expect(plantCheck.extraSkills).toContain('enforcer');
    } finally {
      rmSync(millSeat, { recursive: true, force: true });
      rmSync(scoutSeat, { recursive: true, force: true });
    }
  });
});

describe('foundry scout plant — digest receipt', () => {
  it('fails closed on a missing plane, an empty body, and a missing digest', () => {
    const missingPlane = evaluateFeed({ plane: '', body: 'card', digestExists: true });
    expect(missingPlane.status).toBe('FAIL');
    expect(missingPlane.reason).toBe('missing-plane');
    expect(missingPlane.gates.plane).toBe(false);

    const empty = evaluateFeed({ plane: 'dev', body: '   ', digestExists: true });
    expect(empty.status).toBe('FAIL');
    expect(empty.reason).toBe('empty-body');

    const noDigest = evaluateFeed({ plane: 'domain', body: 'one card', digestExists: false });
    expect(noDigest.status).toBe('FAIL');
    expect(noDigest.reason).toBe('missing-digest');

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-scout-feed-'));
    try {
      const badPlane = look({ root: tmp, brief: 'night board', plane: '', body: 'the card is the feed' });
      expect(badPlane.receipt.status).toBe('FAIL');
      expect(badPlane.receipt.reason).toBe('missing-plane');
      expect(existsSync(path.join(tmp, '.xray/scout/digest.md'))).toBe(false);

      const badBody = look({ root: tmp, brief: 'night board', plane: 'dev', body: '' });
      expect(badBody.receipt.status).toBe('FAIL');
      expect(badBody.receipt.reason).toBe('empty-body');

      const good = look({
        root: tmp,
        brief: 'night board',
        plane: 'dev',
        topic: 'lane feed',
        paths: ['docs-site/docs/plates', 'src/integrations/hooks/plates.cjs'],
        body: 'the card is the feed',
      });
      expect(good.receipt.status).toBe('PASS');
      expect(good.receipt.plane).toBe('dev');
      expect(good.receipt.topic).toBe('lane feed');
      expect(good.receipt.paths).toEqual(['docs-site/docs/plates', 'src/integrations/hooks/plates.cjs']);
      expect(good.receipt.digest).toBe('.xray/scout/digest.md');
      const digest = readFileSync(path.join(tmp, '.xray/scout/digest.md'), 'utf8');
      expect(digest).toMatch(/Plane: dev/);
      expect(digest).toMatch(/the card is the feed/);
      const quoted = inspectFeed(tmp);
      expect(quoted.ok).toBe(true);
      expect(quoted.status).toBe('PASS');

      rmSync(path.join(tmp, '.xray/scout/digest.md'));
      const gone = inspectFeed(tmp);
      expect(gone.ok).toBe(false);
      expect(gone.reason).toBe('missing-digest');
      const stored = JSON.parse(readFileSync(path.join(tmp, '.xray/scout-feed-receipt.json'), 'utf8')) as {
        status: string;
        reason: string;
      };
      expect(stored.status).toBe('FAIL');
      expect(stored.reason).toBe('missing-digest');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('scout look and scout inspect quote the receipt from the CLI', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-scout-cli-'));
    try {
      const note = path.join(tmp, 'note.txt');
      writeFileSync(note, 'from a file\n');
      const lookCli = spawnSync(
        process.execPath,
        [
          path.join(millRoot, 'cli.js'),
          'scout',
          'look',
          '--brief',
          'file look',
          '--plane',
          'integration',
          '--file',
          note,
          '--path',
          'note.txt',
        ],
        { cwd: tmp, encoding: 'utf8', env: { ...process.env, FOUNDRY_ROOT: tmp } },
      );
      expect(lookCli.status, `${lookCli.stdout}${lookCli.stderr}`).toBe(0);
      expect(lookCli.stdout).toMatch(/"PASS"/);
      expect(lookCli.stdout).toMatch(/"integration"/);
      const inspectCli = spawnSync(process.execPath, [path.join(millRoot, 'cli.js'), 'scout', 'inspect'], {
        cwd: tmp,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: tmp },
      });
      expect(inspectCli.status, `${inspectCli.stdout}${inspectCli.stderr}`).toBe(0);
      expect(inspectCli.stdout).toMatch(/"PASS"/);
      expect(inspectCli.stdout).toMatch(/note\.txt/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
