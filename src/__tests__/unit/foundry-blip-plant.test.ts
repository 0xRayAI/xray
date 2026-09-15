import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

function writeSilentWav(file: string, seconds = 1): string {
  const sampleRate = 44100;
  const n = Math.floor(seconds * sampleRate);
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  writeFileSync(file, buf);
  return file;
}

describe('foundry blip plant — files and mint', () => {
  it('ships blip + blip-inspect plant next to mill (not a mill copy)', () => {
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/blip/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/blip-inspect/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip.yml'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip-inspect.yml'))).toBe(true);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/4\.44/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/still/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/orb/);
    expect(read('scripts/foundry/plant/skills/blip-inspect/SKILL.md')).toMatch(/4\.44/);
    expect(read('scripts/foundry/plant/skills/blip-inspect/SKILL.md')).not.toMatch(/Inspect AI work/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/cli.mjs')).toContain('blip: { script: "blip.mjs"');
    expect(read('scripts/foundry/mint-suit.cjs')).toContain('FACTORY_PLANT_CATALOG');
    expect(read('scripts/foundry/inspect.mjs')).toContain('checkBlip');
    expect(read('scripts/foundry/blip-render.cjs')).toContain("orb: \"canvas\"");
    expect(read('scripts/foundry/blip-render.cjs')).toContain('animationIcons.ts');
    expect(read('scripts/foundry/blip-render.cjs')).toContain('commit: null');
  });

  it('mints a blip seat without mill skills and allowlists them', async () => {
    const { mintConsumerSuit, loadFactoryPlantKinds, FACTORY_PLANT_CATALOG } = requireCjs(
      path.join(root, 'scripts/foundry/mint-suit.cjs'),
    ) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => {
        suit: string;
        plant?: string[];
        millPlant?: { skills: string[] };
        blipPlant?: { skills: string[] };
        costume?: boolean;
      };
      loadFactoryPlantKinds: (dir: string) => string[];
      FACTORY_PLANT_CATALOG: { blip: { skills: string[] } };
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    expect(FACTORY_PLANT_CATALOG.blip.skills).toEqual(['blip', 'blip-inspect']);

    const millSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-mill-seat-'));
    const blipSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-seat-'));
    try {
      writeFileSync(
        path.join(millSeat, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const millInv = mintConsumerSuit(root, millSeat, () => undefined);
      expect(millInv.plant).toEqual(['mill']);
      expect(millInv.millPlant?.skills).toEqual(['mill', 'inspect']);
      expect(millInv.blipPlant?.skills).toEqual([]);
      expect(existsSync(path.join(millSeat, '.opencode/skills/blip/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(millSeat, '.opencode/skills/mill/SKILL.md'))).toBe(true);

      writeFileSync(
        path.join(blipSeat, 'package.json'),
        `${JSON.stringify({ name: 'blip-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(blipSeat, 'foundry.json'),
        `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`,
      );
      expect(loadFactoryPlantKinds(blipSeat)).toEqual(['blip']);
      const blipInv = mintConsumerSuit(root, blipSeat, () => undefined);
      expect(blipInv.costume).toBe(false);
      expect(blipInv.suit).toBe('fastened');
      expect(blipInv.plant).toEqual(['blip']);
      expect(blipInv.millPlant?.skills).toEqual([]);
      expect(blipInv.blipPlant?.skills).toEqual(['blip', 'blip-inspect']);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip-inspect/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/agents/blip.yml'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/inspect/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(blipSeat, '.grok/plugins/0xray/skills/blip/SKILL.md'))).toBe(true);

      const report = await inspectSuit(blipSeat, { millRoot: root, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const receipt = report.checks.find((c) => c.id === 'receipt') as {
        plant?: string[];
        blipPlant?: string[];
        millPlant?: string[];
      };
      expect(receipt.plant).toEqual(['blip']);
      expect(receipt.blipPlant).toEqual(['blip', 'blip-inspect']);
      expect(receipt.millPlant).toEqual([]);
      const blipCheck = report.checks.find((c) => c.id === 'blip') as {
        status?: string;
        skipped?: boolean;
      };
      expect(blipCheck.status).toBe('NONE');
      expect(blipCheck.skipped).toBe(true);

      mkdirSync(path.join(blipSeat, '.opencode/skills/enforcer'), { recursive: true });
      writeFileSync(path.join(blipSeat, '.opencode/skills/enforcer/SKILL.md'), 'LEFTOVER\n');
      expect(() => mintConsumerSuit(root, blipSeat, () => undefined)).toThrow(/costume dump/);
    } finally {
      rmSync(millSeat, { recursive: true, force: true });
      rmSync(blipSeat, { recursive: true, force: true });
    }
  });

  it('treats leftover blip skills on a mill seat as costume', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-dump-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, '.opencode/skills/blip'), { recursive: true });
      writeFileSync(path.join(tmp, '.opencode/skills/blip/SKILL.md'), 'STRAY BLIP\n');
      expect(() => mintConsumerSuit(root, tmp, () => undefined)).toThrow(/costume dump/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip plant — modes fail-closed + PASS mp4', () => {
  it('rejects day-2 Rippel modes and unknown names without inventing them', () => {
    const { resolveMode, RIPPEL_ANIMATION, ANIMATION_TO_VISUALIZATION, SSOT } = requireCjs(
      path.join(root, 'scripts/foundry/blip-render.cjs'),
    ) as {
      resolveMode: (name: string) => { id: string; ok: boolean; day2?: boolean; reason?: string };
      RIPPEL_ANIMATION: string[];
      ANIMATION_TO_VISUALIZATION: Record<string, string>;
      SSOT: { commit: string | null; paths: string[]; visualization: Record<string, string> };
    };
    expect(RIPPEL_ANIMATION).toEqual(['orb', 'swirl', 'snap', 'waves', 'spark']);
    expect(ANIMATION_TO_VISUALIZATION).toEqual({
      orb: 'canvas',
      swirl: '3d-sacred',
      snap: 'neural',
      waves: 'waveform',
      spark: 'particles',
    });
    expect(SSOT.commit).toBeNull();
    expect(SSOT.paths).toEqual(
      expect.arrayContaining(['animationIcons.ts', 'types/index.ts', 'SimplifiedVisualConverter.tsx']),
    );

    const swirl = resolveMode('swirl');
    expect(swirl.ok).toBe(false);
    expect(swirl.day2).toBe(true);
    expect(swirl.reason).toMatch(/day-2/);

    const unknown = resolveMode('kenburns');
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toMatch(/unknown picture mode/);
  });

  it('renders still + orb that PASS the gate and inspects the receipt', async () => {
    const { renderBlip, seedFromBrief, readReceipt, evaluateMp4File, DURATION_SEC } = requireCjs(
      path.join(root, 'scripts/foundry/blip-render.cjs'),
    ) as {
      renderBlip: (opts: {
        root: string;
        brief: string;
        mode?: string;
        bed?: string;
      }) => {
        receipt: {
          status: string;
          seed: string;
          mode: string;
          durationSec: number;
          visualization?: string | null;
          engine?: string;
          ssot?: { repo: string; commit: string | null; access?: string };
        };
        mp4: string;
      };
      seedFromBrief: (brief: string, mode: string) => string;
      readReceipt: (dir: string) => { status: string; mode?: string } | null;
      evaluateMp4File: (
        file: string,
        opts?: { mode?: string; wantAudio?: boolean },
      ) => { status: string; durationSec?: number | null };
      DURATION_SEC: number;
    };
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    const { inspectBlip } = await import('../../../scripts/foundry/blip.mjs');

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-pass-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'blip-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);
      mintConsumerSuit(root, tmp, () => undefined);

      const brief = 'night alley still';
      const still = renderBlip({ root: tmp, brief, mode: 'still' });
      expect(still.receipt.engine).toBe('ffmpeg-headless');
      expect(still.receipt.ssot).toMatchObject({
        repo: 'htafolla/rippel-synapse-flow',
        commit: null,
        access: 'tray',
      });
      expect(still.receipt.status, JSON.stringify(still.receipt, null, 2)).toBe('PASS');
      expect(still.receipt.seed).toBe(seedFromBrief(brief, 'still'));
      expect(still.receipt.mode).toBe('still');
      expect(still.receipt.durationSec).toBe(DURATION_SEC);
      expect(existsSync(still.mp4)).toBe(true);
      expect(evaluateMp4File(still.mp4, { mode: 'still' }).status).toBe('PASS');
      expect(readReceipt(tmp)?.status).toBe('PASS');

      const again = renderBlip({ root: tmp, brief, mode: 'still' });
      expect(again.receipt.seed).toBe(still.receipt.seed);

      const orb = renderBlip({ root: tmp, brief: 'night alley orb', mode: 'orb' });
      expect(orb.receipt.mode).toBe('orb');
      expect(orb.receipt.visualization).toBe('canvas');
      expect(orb.receipt.status, JSON.stringify(orb.receipt, null, 2)).toBe('PASS');

      const day2 = renderBlip({ root: tmp, brief: 'later', mode: 'spark' });
      expect(day2.receipt.status).toBe('FAIL');
      expect(day2.receipt.mode).toBe('spark');

      const bed = writeSilentWav(path.join(tmp, 'bed.wav'), 2);
      const muxed = renderBlip({ root: tmp, brief: 'still with bed', mode: 'still', bed });
      expect(muxed.receipt.status, JSON.stringify(muxed.receipt, null, 2)).toBe('PASS');
      expect(muxed.receipt).toMatchObject({ hasAudio: true, hasVideo: true });

      const report = await inspectSuit(tmp, { millRoot: root, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const blipCheck = report.checks.find((c) => c.id === 'blip') as {
        status?: string;
        ok?: boolean;
        mode?: string;
      };
      expect(blipCheck.status).toBe('PASS');
      expect(blipCheck.ok).toBe(true);

      const blipInspect = inspectBlip(tmp);
      expect(blipInspect.ok).toBe(true);
      expect(blipInspect.status).toBe('PASS');

      const cli = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/foundry/cli.js'), 'blip', 'inspect'],
        {
          cwd: tmp,
          encoding: 'utf8',
          env: { ...process.env, FOUNDRY_ROOT: tmp },
        },
      );
      expect(cli.status, `${cli.stdout}${cli.stderr}`).toBe(0);
      expect(cli.stdout).toMatch(/"PASS"/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('inspect fails closed when the last blip receipt is FAIL', async () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const { writeReceipt } = requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
      writeReceipt: (dir: string, receipt: Record<string, unknown>) => string;
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-fail-receipt-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'blip-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);
      mintConsumerSuit(root, tmp, () => undefined);
      writeReceipt(tmp, {
        kind: 'blip',
        status: 'FAIL',
        failClosed: true,
        mode: 'still',
        durationSec: 4.44,
        reason: 'duration',
        gates: { file: true, duration: false, video: true, audio: true, mode: true },
      });
      const report = await inspectSuit(tmp, { millRoot: root, skipLive: true });
      expect(report.ok).toBe(false);
      expect(report.failed).toContain('blip');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip plant — docs and CI', () => {
  it('friend-tests human docs and keeps mill CI on the blip unit file', () => {
    expect(read('scripts/foundry/README.md')).toMatch(/plant": "blip"/);
    expect(read('scripts/foundry/README.md')).toMatch(/4\.44/);
    expect(read('scripts/foundry/README.md')).toMatch(/A friend would hear: build the tiny-video factory/);
    expect(read('AGENTS.md')).toMatch(/blip-inspect/);
    expect(read('AGENTS-consumer.md')).toMatch(/blip render/);
    expect(read('README.md')).toMatch(/plant": "blip"/);
    expect(read('llms.txt')).toMatch(/factory-blip/);
    expect(read('.github/workflows/mill-ci.yml')).toContain('foundry-blip-plant.test.ts');
    expect(read('.github/workflows/enforce-version-compliance.yml')).toContain(
      'foundry-blip-plant.test.ts',
    );
    expect(read('scripts/foundry/package.json')).toMatch(/"version": "0\.1\.10"/);
  });
});
