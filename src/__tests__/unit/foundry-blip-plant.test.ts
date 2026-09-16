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
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/factory plant/i);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/still/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/orb/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).toMatch(/swirl/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).not.toMatch(/day-2/i);
    expect(read('scripts/foundry/plant/skills/blip-inspect/SKILL.md')).toMatch(/4\.44/);
    expect(read('scripts/foundry/plant/skills/blip-inspect/SKILL.md')).not.toMatch(/Inspect AI work/);
    expect(read('scripts/foundry/plant/skills/blip/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/cli.mjs')).toContain('blip: { script: "blip.mjs"');
    expect(read('scripts/foundry/mint-suit.cjs')).toContain('FACTORY_PLANT_CATALOG');
    expect(read('scripts/foundry/inspect.mjs')).toContain('checkBlip');
    expect(read('scripts/foundry/blip-render.cjs')).toContain('registry.json');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('animationIcons.ts');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('e5014cd');
    expect(read('scripts/foundry/blip-render.cjs')).toContain('--engine wireframe');
    expect(read('scripts/foundry/plant/motions/registry.json')).toMatch(/"orb"/);
    expect(read('scripts/foundry/plant/motions/registry.json')).toMatch(/"kapow"/);
    expect(read('scripts/foundry/plant/motions/registry.json')).toMatch(/#08090B/);
    expect(read('scripts/foundry/blip-render.cjs')).toContain('#08090B');
    expect(read('scripts/foundry/blip-render.cjs')).toContain('#3DE0E8');
    expect(read('scripts/foundry/blip-render.cjs')).toContain('power-plant-intro');
    expect(read('scripts/foundry/plant/motions/registry.json')).toMatch(/"status": "growth"/);
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

describe('foundry blip plant — registry + fail-closed + PASS mp4', () => {
  it('loads the on-disk registry, implements v0 six, and FAILs unknown/kapow', () => {
    const { resolveMode, listMotionIds, listV0Ids, parsePictureMode, SSOT, ANIMATION_TO_VISUALIZATION } =
      requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
        resolveMode: (name: string) => {
          ok: boolean;
          motionId?: string;
          renderer?: string;
          reason?: string;
        };
        listMotionIds: () => string[];
        listV0Ids: () => string[];
        parsePictureMode: (raw: string) => { pictureMode: string; motionId: string };
        SSOT: { commit: string | null; paths: string[] };
        ANIMATION_TO_VISUALIZATION: Record<string, string>;
      };
    expect(listV0Ids()).toEqual(['still', 'orb', 'swirl', 'snap', 'waves', 'spark']);
    expect(listMotionIds()).toEqual(
      expect.arrayContaining(['still', 'orb', 'swirl', 'snap', 'waves', 'spark', 'kapow']),
    );
    expect(SSOT.commit).toMatch(/^e5014cd/);
    expect(SSOT.paths).toEqual(
      expect.arrayContaining([
        'animationIcons.ts',
        'types/index.ts',
        'SimplifiedVisualConverter.tsx',
        'MiniAnimationViewer',
        'FiveDimensionalVisualizer',
      ]),
    );
    expect(ANIMATION_TO_VISUALIZATION).toMatchObject({
      orb: 'canvas',
      swirl: '3d-sacred',
      snap: 'neural',
      waves: 'waveform',
      spark: 'particles',
    });
    expect(parsePictureMode('motion:swirl')).toEqual({
      pictureMode: 'motion:swirl',
      motionId: 'swirl',
    });
    for (const id of ['still', 'orb', 'swirl', 'snap', 'waves', 'spark']) {
      const resolved = resolveMode(id === 'still' ? 'still' : `motion:${id}`);
      expect(resolved.ok, id).toBe(true);
      expect(resolved.motionId).toBe(id);
    }
    const kapow = resolveMode('motion:kapow');
    expect(kapow.ok).toBe(false);
    expect(kapow.reason).toMatch(/growth\/stub/);
    const unknown = resolveMode('kenburns');
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toMatch(/unknown motion id/);
  });

  it('still generator paints only the Power Plant palette', () => {
    const { PALETTE, RGB, paintStill, writePpm, WIDTH, HEIGHT, stillPlate, STILL_PLATES, sampleStillFrames } =
      requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
        PALETTE: Record<string, string>;
        RGB: Record<string, number[]>;
        paintStill: (seed: string, t?: number) => (x: number, y: number) => number[];
        writePpm: (
          file: string,
          width: number,
          height: number,
          paint: (x: number, y: number) => number[],
        ) => string;
        WIDTH: number;
        HEIGHT: number;
        stillPlate: (seed: string, t?: number) => string;
        STILL_PLATES: string[];
        sampleStillFrames: (seed: string) => { differ: boolean };
      };
    expect(PALETTE).toEqual({
      void: '#08090B',
      ink: '#F5F7FA',
      cyan: '#3DE0E8',
      gold: '#F5C518',
      blue: '#4A7FD4',
    });
    expect(STILL_PLATES).toEqual(['titlecard', 'corridor', 'rain', 'endcard']);
    const allowed = new Set(Object.values(RGB).map((rgb) => rgb.join(',')));
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-plate-'));
    try {
      expect(sampleStillFrames('0xdeadbeef').differ).toBe(true);
      for (const seed of ['0x00', '0x01', '0x02', '0x03', '0xdeadbeef']) {
        const file = path.join(tmp, `${stillPlate(seed)}.ppm`);
        writePpm(file, WIDTH, HEIGHT, paintStill(seed, 0));
        const raw = readFileSync(file);
        const header = Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`);
        expect(raw.subarray(0, header.length).equals(header)).toBe(true);
        const pixels = raw.subarray(header.length);
        expect(pixels.length).toBe(WIDTH * HEIGHT * 3);
        const counts = new Map<string, number>();
        for (let i = 0; i < pixels.length; i += 3) {
          const key = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`;
          expect(allowed.has(key), key).toBe(true);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const voidKey = RGB.void.join(',');
        expect(counts.get(voidKey) || 0).toBeGreaterThan((WIDTH * HEIGHT) / 3);
        expect(counts.get(RGB.cyan.join(',')) || 0).toBeGreaterThan(0);
        expect(counts.get(RGB.gold.join(',')) || 0).toBeGreaterThan(0);
        expect(counts.get(RGB.ink.join(',')) || 0).toBeGreaterThan(0);
        expect(counts.get(RGB.blue.join(',')) || 0).toBeGreaterThan(0);
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('renders still + Rippel five that PASS the gate and inspects the receipt', { timeout: 90000 }, async () => {
    const { renderBlip, seedFromBrief, readReceipt, evaluateMp4File, DURATION_SEC, hasFfmpeg, V0_IDS } =
      requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
        renderBlip: (opts: {
          root: string;
          brief: string;
          mode?: string;
          pictureMode?: string;
          bed?: string;
        }) => {
          receipt: {
            status: string;
            seed: string;
            mode: string;
            pictureMode?: string;
            motionId?: string;
            durationSec: number;
            visualization?: string | null;
            palette?: Record<string, string>;
            plate?: string;
            stillPlate?: string | null;
            engine?: string;
            look?: string | null;
            fallback?: boolean;
            hasAudio?: boolean;
            audioChannels?: number | null;
            maxVolumeDb?: number | null;
            width?: number | null;
            height?: number | null;
            visualConfig?: {
              circleCount?: number;
              mesh?: { id?: string } | null;
              field?: { id?: string; grid?: string } | null;
            } | null;
            reason?: string | null;
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
        hasFfmpeg: () => boolean;
        V0_IDS: string[];
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

      const ffmpeg = hasFfmpeg();
      const brief = 'night alley still';
      const still = renderBlip({ root: tmp, brief, mode: 'still' });
      expect(still.receipt.engine).toBe('power-plant-headless');
      expect(still.receipt.look).toBe('power-plant-blip');
      expect(still.receipt.ssot).toMatchObject({
        repo: 'htafolla/rippel-synapse-flow',
        commit: 'e5014cd46fbe5f132391333d8296f4416896dbee',
        access: 'headless-port',
      });
      if (!ffmpeg) {
        expect(still.receipt.status).toBe('FAIL');
        expect(still.receipt.reason).toMatch(/ffmpeg/);
      } else {
        expect(still.receipt.status, JSON.stringify(still.receipt, null, 2)).toBe('PASS');
        expect(still.receipt.seed).toBe(seedFromBrief(brief, 'still'));
        expect(still.receipt.mode).toBe('still');
        expect(still.receipt.pictureMode).toBe('still');
        expect(still.receipt.durationSec).toBe(DURATION_SEC);
        expect(still.receipt.palette).toEqual({
          void: '#08090B',
          ink: '#F5F7FA',
          cyan: '#3DE0E8',
          gold: '#F5C518',
          blue: '#4A7FD4',
        });
        expect(still.receipt.plate).toBe('power-plant-intro');
        expect(still.receipt.stillPlate).toMatch(/titlecard|corridor|rain|endcard/);
        expect(still.receipt.width).toBeGreaterThanOrEqual(1280);
        expect(still.receipt.height).toBeGreaterThanOrEqual(720);
        expect(existsSync(still.mp4)).toBe(true);
        expect(
          evaluateMp4File(still.mp4, { mode: 'still', wantAudio: true, motion: true }).status,
        ).toBe('PASS');
        expect(still.receipt.hasAudio).toBe(true);
        expect(readReceipt(tmp)?.status).toBe('PASS');

        const again = renderBlip({ root: tmp, brief, mode: 'still' });
        expect(again.receipt.seed).toBe(still.receipt.seed);

        for (const id of V0_IDS.filter((name) => name !== 'still')) {
          const rendered = renderBlip({
            root: tmp,
            brief: `night alley ${id}`,
            pictureMode: `motion:${id}`,
          });
          expect(rendered.receipt.status, JSON.stringify(rendered.receipt, null, 2)).toBe('PASS');
          expect(rendered.receipt.motionId).toBe(id);
          expect(rendered.receipt.pictureMode).toBe(`motion:${id}`);
          expect(rendered.receipt.engine).toBe('rippel-headless');
          expect(rendered.receipt.look).toBe('rippel-v2');
          expect(rendered.receipt.fallback).toBe(false);
          expect(rendered.receipt.hasAudio).toBe(true);
          expect(rendered.receipt.audioChannels).toBe(2);
          expect(rendered.receipt.maxVolumeDb).toBeGreaterThan(-40);
          expect(rendered.receipt.width).toBeGreaterThanOrEqual(1280);
          expect(rendered.receipt.height).toBeGreaterThanOrEqual(720);
          expect(rendered.receipt.visualConfig?.circleCount).toBeGreaterThan(0);
          expect(rendered.receipt.visualConfig?.mesh?.id).toBeTruthy();
          expect(rendered.receipt.visualConfig?.field?.id).toBeTruthy();
          expect(rendered.receipt.palette?.void).toBe('#08090B');
        }

        const kapow = renderBlip({
          root: tmp,
          brief: 'night alley kapow',
          pictureMode: 'motion:kapow',
        });
        expect(kapow.receipt.status).toBe('FAIL');
        expect(kapow.receipt.reason).toMatch(/growth\/stub/);

        const muxed = renderBlip({ root: tmp, brief: 'still with bed', mode: 'still' });
        expect(muxed.receipt.status, JSON.stringify(muxed.receipt, null, 2)).toBe('PASS');
        expect(muxed.receipt).toMatchObject({ hasAudio: true, hasVideo: true, audioChannels: 2 });
        expect(muxed.receipt.maxVolumeDb).toBeGreaterThan(-40);
      }

      const unknown = renderBlip({ root: tmp, brief: 'nope', mode: 'kenburns' });
      expect(unknown.receipt.status).toBe('FAIL');
      expect(unknown.receipt.reason).toMatch(/unknown motion id/);
      if (ffmpeg) {
        const restore = renderBlip({ root: tmp, brief, mode: 'still' });
        expect(restore.receipt.status).toBe('PASS');
      }

      const report = await inspectSuit(tmp, { millRoot: root, skipLive: true });
      const blipCheck = report.checks.find((c) => c.id === 'blip') as {
        status?: string;
        ok?: boolean;
        motions?: string[];
      };
      expect(blipCheck.motions).toEqual(
        expect.arrayContaining(['still', 'orb', 'swirl', 'snap', 'waves', 'spark']),
      );
      if (ffmpeg) {
        expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
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
      } else {
        expect(report.ok).toBe(false);
        expect(report.failed).toContain('blip');
      }
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

describe('foundry blip plant — Rippel converter vs wireframe flag', () => {
  it('builds VisualConfig.circles and living frames that differ', () => {
    const {
      buildVisualConfig,
      sampleMotionFrames,
      ANIMATION_TO_VISUALIZATION,
      MESH_FAMILIES,
      MESH_GAITS,
      LOOK_KINDS,
      GRID_KINDS,
      GRAD_KINDS,
    } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        visualConfig: { circles: Array<{ note: string; frequency: number; radius: number }> };
        mesh: {
          id: string;
          family: string;
          gait: string;
          verts: number[][];
          edges: number[][];
          faces: number[][];
          shells: number;
          scale: number;
          coreStyle: string;
        };
        field: {
          id: string;
          grid: string;
          gradient: string;
          stars: unknown[];
          blinkers: unknown[];
        };
      };
      sampleMotionFrames: (
        renderer: string,
        seed: string,
        duration: number,
        brief: string,
      ) => {
        differ: boolean;
        living: boolean;
        look: string;
        sharpness: { ratio: number; edges: number };
        tempo: number;
        width: number;
        height: number;
        circleCount: number;
        visualization: string;
        mesh: { id: string; family: string; gait?: string } | null;
        field: { id: string; grid: string; gradient: string } | null;
        fill: number;
      };
      ANIMATION_TO_VISUALIZATION: Record<string, string>;
      MESH_FAMILIES: string[];
      MESH_GAITS: string[];
      LOOK_KINDS: string[];
      GRID_KINDS: string[];
      GRAD_KINDS: string[];
    };
    const checksum = buildVisualConfig({
      brief: 'warehouse floor · Power Plant',
      seedHex: '0xdeadbeef',
    });
    const other = buildVisualConfig({
      brief: 'other mint · alley',
      seedHex: '0xcafef00d',
    });
    expect(MESH_FAMILIES.length).toBeGreaterThanOrEqual(12);
    expect(LOOK_KINDS).toEqual(['focus', 'cage']);
    expect(MESH_GAITS).toEqual(expect.arrayContaining(['tumble', 'shear', 'pulse', 'orbit', 'snap']));
    expect(checksum.mesh?.id).toBeTruthy();
    expect(checksum.mesh.id).not.toBe(other.mesh.id);
    expect(checksum.mesh.family).toMatch(
      /^(tetra|octa|cube|prism|star|cage|spire|icosa|helix|torus|lattice|flower)$/,
    );
    expect(checksum.mesh.gait).toMatch(/^(tumble|shear|pulse|orbit|snap)$/);
    expect(checksum.mesh.coreStyle).toMatch(/^(disc|eclipse|pulse)$/);
    expect(checksum.mesh.verts.length).toBeGreaterThan(3);
    expect(checksum.mesh.edges.length).toBeGreaterThan(3);
    expect(checksum.mesh.edges.length).toBeLessThanOrEqual(16);
    expect(checksum.mesh.faces.length).toBeGreaterThan(0);
    expect(checksum.mesh.faces.length).toBeLessThanOrEqual(16);
    expect(checksum.mesh.scale).toBeGreaterThan(0.55);
    expect(checksum.mesh.scale).toBeLessThan(0.8);
    expect(checksum.mesh.shells).toBe(1);
    expect(GRID_KINDS).toEqual(expect.arrayContaining(['floor', 'meridian', 'ticks', 'none']));
    expect(GRAD_KINDS).toEqual(expect.arrayContaining(['horizon', 'corner', 'veil']));
    expect(checksum.field?.id).toBeTruthy();
    expect(checksum.field.id).not.toBe(other.field.id);
    expect(checksum.field.grid).toMatch(/^(floor|meridian|ticks|none)$/);
    expect(checksum.field.gradient).toMatch(/^(horizon|corner|veil)$/);
    expect(checksum.field.stars.length).toBeGreaterThanOrEqual(16);
    expect(checksum.field.blinkers.length).toBeGreaterThanOrEqual(3);
    expect(checksum.visualConfig.circles.length).toBeGreaterThan(3);
    expect(checksum.visualConfig.circles[0]?.frequency).toBeGreaterThan(0);
    expect(checksum.visualConfig.circles[0]?.radius).toBeGreaterThan(0);
    for (const id of ['orb', 'swirl', 'snap', 'waves', 'spark']) {
      const sample = sampleMotionFrames(id, '0xdeadbeef', 4.44, 'warehouse floor · Power Plant');
      expect(sample.visualization).toBe(ANIMATION_TO_VISUALIZATION[id]);
      expect(sample.look).toBe('rippel-v2');
      expect(sample.differ, id).toBe(true);
      expect(sample.living, id).toBe(true);
      expect(sample.sharpness.edges, id).toBeGreaterThan(400);
      expect(sample.sharpness.ratio, id).toBeGreaterThan(0.006);
      expect(sample.width).toBe(1280);
      expect(sample.height).toBe(720);
      expect(sample.circleCount).toBeGreaterThan(0);
      expect(sample.tempo).toBeGreaterThan(0);
      expect(sample.mesh?.id, id).toBeTruthy();
      expect(sample.field?.id, id).toBeTruthy();
      expect(sample.field?.grid, id).toMatch(/^(floor|meridian|ticks|none)$/);
      expect(sample.fill, id).toBeGreaterThan(0.055);
    }
    const prints = ['warehouse floor · Power Plant', 'other mint · alley', 'neon dock · vault', 'salt mill · dusk'].map(
      (brief, i) =>
        buildVisualConfig({ brief, seedHex: `0xdeadbee${i}` }).mesh.id,
    );
    expect(new Set(prints).size).toBe(prints.length);
    const fields = ['warehouse floor · Power Plant', 'other mint · alley', 'neon dock · vault', 'salt mill · dusk'].map(
      (brief, i) =>
        buildVisualConfig({ brief, seedHex: `0xdeadbee${i}` }).field.id,
    );
    expect(new Set(fields).size).toBe(fields.length);
    for (let i = 0; i < 24; i++) {
      const minted = buildVisualConfig({ brief: `mint ${i} · field`, seedHex: `0xabc${i}` });
      expect(minted.mesh.edges.length).toBeLessThanOrEqual(16);
      expect(minted.field.grid).toMatch(/^(floor|meridian|ticks|none)$/);
    }
  });

  it('keeps orb in focus — short rim drop, not full-radius bokeh', () => {
    const { paintRippelFrame, orbFocusWidth } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
      }) => { buffer: Buffer; width: number; height: number };
      orbFocusWidth: (
        buf: Buffer,
        width: number,
        height: number,
      ) => { peak: number; inner: number; drop: number };
    };
    const frame = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex: '0xdeadbeef',
      brief: 'warehouse floor · Power Plant',
    });
    const focus = orbFocusWidth(frame.buffer, frame.width, frame.height);
    expect(focus.peak).toBeGreaterThan(0.55);
    expect(focus.drop).toBeGreaterThan(0);
    expect(focus.drop).toBeLessThan(16);
    expect(focus.inner + focus.drop).toBeLessThan(120);
  });

  it('keeps focus and cage as seed-selected look variants', () => {
    const {
      LOOK_KINDS,
      buildVisualConfig,
      paintRippelFrame,
      summarizeVisual,
      framesDiffer,
      orbFocusWidth,
      resolveLookKind,
    } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      LOOK_KINDS: string[];
      resolveLookKind: (opts: { seedHex?: string; lookKind?: string }) => string;
      buildVisualConfig: (opts: { brief: string; seedHex: string; lookKind?: string }) => {
        lookKind: string;
      };
      summarizeVisual: (checksum: { lookKind?: string; visualConfig?: { circles: unknown[] } }) => {
        lookKind: string | null;
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
      }) => { buffer: Buffer; width: number; height: number; lookKind: string };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
      orbFocusWidth: (
        buf: Buffer,
        width: number,
        height: number,
      ) => { peak: number; inner: number; drop: number };
    };
    expect(LOOK_KINDS).toEqual(['focus', 'cage']);
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    expect(resolveLookKind({ seedHex })).toBe('cage');
    expect(resolveLookKind({ seedHex: '0x00' })).toBe('focus');
    expect(resolveLookKind({ seedHex: '0x01' })).toBe('cage');
    expect(buildVisualConfig({ brief, seedHex }).lookKind).toBe('cage');
    expect(buildVisualConfig({ brief, seedHex, lookKind: 'focus' }).lookKind).toBe('focus');
    expect(summarizeVisual(buildVisualConfig({ brief, seedHex, lookKind: 'focus' })).lookKind).toBe(
      'focus',
    );
    const focusFrame = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex,
      brief,
      lookKind: 'focus',
    });
    const cageFrame = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex,
      brief,
      lookKind: 'cage',
    });
    expect(focusFrame.lookKind).toBe('focus');
    expect(cageFrame.lookKind).toBe('cage');
    expect(framesDiffer(focusFrame.buffer, cageFrame.buffer)).toBe(true);
    const focus = orbFocusWidth(focusFrame.buffer, focusFrame.width, focusFrame.height);
    expect(focus.peak).toBeGreaterThan(0.55);
    expect(focus.drop).toBeGreaterThan(0);
    expect(focus.drop).toBeLessThan(16);
    expect(focus.inner).toBeGreaterThan(50);
    function cyanBody(buf: Buffer): number {
      let n = 0;
      for (let i = 0; i < buf.length; i += 3) {
        if (Math.abs(buf[i] - 61) < 10 && Math.abs(buf[i + 1] - 224) < 10 && Math.abs(buf[i + 2] - 232) < 10) {
          n += 1;
        }
      }
      return n;
    }
    expect(cyanBody(focusFrame.buffer)).toBeGreaterThan(cyanBody(cageFrame.buffer) * 2);
    expect(() => resolveLookKind({ lookKind: 'potato' })).toThrow(/unknown look/);
  });

  it('keeps Rippel v2 sharp and beat-coupled on all five viz', () => {
    const { paintRippelFrame, goldPixelCount, LOOK, buildVisualConfig } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      LOOK: string;
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        genreConfig: { tempo: number };
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
      }) => { buffer: Buffer; look: string };
      goldPixelCount: (buf: Buffer) => number;
    };
    expect(LOOK).toBe('rippel-v2');
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const bpm = buildVisualConfig({ brief, seedHex }).genreConfig.tempo;
    const offBeat = (0.5 * 60) / bpm;
    for (const id of ['orb', 'swirl', 'snap', 'waves', 'spark']) {
      const kick = paintRippelFrame({ renderer: id, t: 0, seedHex, brief });
      const off = paintRippelFrame({ renderer: id, t: offBeat, seedHex, brief });
      expect(kick.look, id).toBe('rippel-v2');
      expect(goldPixelCount(kick.buffer), id).not.toBe(goldPixelCount(off.buffer));
    }
  });

  it('locks auto-bed kicks and offbeats to the visual motion grid', () => {
    const rippel = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        genreConfig: { tempo: number; phase0: number };
      };
      kickAccent: (beat: number) => number;
      andAccent: (beat: number) => number;
    };
    const sound = requireCjs(path.join(root, 'scripts/foundry/sound-bed.cjs')) as {
      renderSamples: (opts: {
        brief: string;
        genre: string;
        seconds: number;
        seed?: string;
        syncopate?: boolean;
      }) => {
        samples: Float64Array;
        sampleRate: number;
        genre: { bpm: number };
        grid: { phase0: number; syncopate: boolean; bpm: number; and: number };
        seed: string;
      };
      highpassEnergy: (samples: Float64Array, sampleRate: number, hz: number) => number;
    };
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = rippel.buildVisualConfig({ brief, seedHex });
    const bed = sound.renderSamples({
      brief,
      genre: 'ambient',
      seconds: 4.44,
      seed: seedHex,
      syncopate: true,
    });
    expect(bed.seed).toBe(seedHex);
    expect(bed.genre.bpm).toBe(checksum.genreConfig.tempo);
    expect(bed.grid.phase0).toBe(0);
    expect(checksum.genreConfig.phase0).toBe(0);
    expect(bed.grid.syncopate).toBe(true);
    expect(rippel.kickAccent(0)).toBeGreaterThan(rippel.andAccent(0));
    expect(rippel.andAccent(0.5)).toBeGreaterThan(rippel.kickAccent(0.5));
    const beat = 60 / bed.genre.bpm;
    function rms(t: number, dur: number): number {
      const i0 = Math.max(0, Math.floor(t * bed.sampleRate));
      const i1 = Math.min(bed.samples.length, Math.floor((t + dur) * bed.sampleRate));
      let acc = 0;
      let n = 0;
      for (let i = i0; i < i1; i += 1) {
        acc += bed.samples[i] * bed.samples[i];
        n += 1;
      }
      return Math.sqrt(acc / Math.max(1, n));
    }
    expect(rms(0, 0.05)).toBeGreaterThan(rms(beat * 0.25, 0.05));
    const slice = (t: number, dur: number) =>
      bed.samples.subarray(
        Math.max(0, Math.floor(t * bed.sampleRate)),
        Math.min(bed.samples.length, Math.floor((t + dur) * bed.sampleRate)),
      );
    expect(sound.highpassEnergy(slice(beat * 0.5, 0.06), bed.sampleRate, 2000)).toBeGreaterThan(
      sound.highpassEnergy(slice(beat * 0.25, 0.06), bed.sampleRate, 2000) * 0.85,
    );
  });

  it('keeps ffmpeg wireframe behind a flag and FAILs silent mp4s', { timeout: 90000 }, async () => {
    const { renderBlip, evaluateMp4File, hasFfmpeg } = requireCjs(
      path.join(root, 'scripts/foundry/blip-render.cjs'),
    ) as {
      renderBlip: (opts: Record<string, unknown>) => {
        receipt: {
          status: string;
          engine?: string;
          fallback?: boolean;
          hasAudio?: boolean;
          audioChannels?: number | null;
          maxVolumeDb?: number | null;
          reason?: string | null;
        };
        mp4: string;
      };
      evaluateMp4File: (
        file: string,
        opts?: { mode?: string; wantAudio?: boolean; motion?: boolean },
      ) => { status: string; reason?: string | null; hasAudio?: boolean };
      hasFfmpeg: () => boolean;
    };
    if (!hasFfmpeg()) return;
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-flag-'));
    try {
      const flagged = renderBlip({
        root: tmp,
        brief: 'warehouse floor · Power Plant',
        mode: 'motion:orb',
        engine: 'wireframe',
      });
      expect(flagged.receipt.status, JSON.stringify(flagged.receipt, null, 2)).toBe('PASS');
      expect(flagged.receipt.engine).toBe('ffmpeg-wireframe-fallback');
      expect(flagged.receipt.fallback).toBe(true);
      expect(flagged.receipt.hasAudio).toBe(true);
      expect(flagged.receipt.audioChannels).toBe(2);
      expect(flagged.receipt.maxVolumeDb).toBeGreaterThan(-40);

      const silentBed = writeSilentWav(path.join(tmp, 'bed.wav'), 5);
      const muted = renderBlip({
        root: tmp,
        brief: 'warehouse floor · Power Plant',
        mode: 'motion:orb',
        bed: silentBed,
      });
      expect(muted.receipt.status, JSON.stringify(muted.receipt, null, 2)).toBe('FAIL');
      expect(muted.receipt.reason).toMatch(/inaudible bed/);

      const picture = path.join(tmp, 'silent.mp4');
      const ffmpeg = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=black:s=1280x720:d=4.44:r=30',
          '-pix_fmt',
          'yuv420p',
          '-an',
          picture,
        ],
        { encoding: 'utf8' },
      );
      expect(ffmpeg.status, ffmpeg.stderr).toBe(0);
      const silent = evaluateMp4File(picture, { mode: 'orb', wantAudio: true, motion: true });
      expect(silent.status).toBe('FAIL');
      expect(silent.reason).toMatch(/audio stream missing/);
      expect(silent.hasAudio).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip plant — docs and CI', () => {
  it('friend-tests human docs and keeps mill CI on the blip unit file', () => {
    expect(read('scripts/foundry/README.md')).toMatch(/plant": "blip"/);
    expect(read('scripts/foundry/README.md')).toMatch(/4\.44/);
    expect(read('scripts/foundry/README.md')).toMatch(
      /A friend would hear: Blips should look like Rippel living motions with sound/,
    );
    expect(read('scripts/foundry/README.md')).toMatch(/Rippel five/);
    expect(read('scripts/foundry/README.md')).toMatch(/Power Plant/);
    expect(read('scripts/foundry/README.md')).toMatch(/#08090B/);
    expect(read('scripts/foundry/README.md')).toMatch(/growth stub/);
    expect(read('scripts/foundry/README.md')).not.toMatch(/day-2/i);
    expect(read('.github/workflows/mill-ci.yml')).toContain('ffmpeg');
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
