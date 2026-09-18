import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const millDir = path.dirname(requireCjs.resolve('@0xray/blip/blip-render'));

function read(rel: string): string {
  const millNames = [
    'blip-render.cjs',
    'blip-rippel.cjs',
    'blip-rippel-organs.cjs',
    'blip-kapow.cjs',
    'blip-vibe.cjs',
    'blip-looker.cjs',
    'blip.mjs',
    'sound-bed.cjs',
    'sound-rippel.cjs',
    'sound-mixer.cjs',
    'sound.mjs',
  ];
  const base = path.basename(rel);
  if (rel.startsWith('scripts/foundry/') && millNames.includes(base)) {
    return readFileSync(path.join(millDir, base), 'utf8');
  }
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
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/blip-looker/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip.yml'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip-inspect.yml'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip-looker.yml'))).toBe(true);
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
    expect(read('scripts/foundry/plant/motions/registry.json')).toMatch(/"status": "opt"/);
    expect(read('scripts/foundry/blip-kapow.cjs')).toContain('Two-tier stamp');
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
    expect(FACTORY_PLANT_CATALOG.blip.skills).toEqual([
      'blip',
      'blip-inspect',
      'blip-vibe',
      'blip-looker',
    ]);

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
      expect(blipInv.blipPlant?.skills).toEqual([
        'blip',
        'blip-inspect',
        'blip-vibe',
        'blip-looker',
      ]);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip-inspect/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip-vibe/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/skills/blip-looker/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/agents/blip.yml'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/agents/blip-vibe.yml'))).toBe(true);
      expect(existsSync(path.join(blipSeat, '.opencode/agents/blip-looker.yml'))).toBe(true);
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
      expect(receipt.blipPlant).toEqual(['blip', 'blip-inspect', 'blip-vibe', 'blip-looker']);
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
  it('loads the on-disk registry, implements v0 six, and FAILs unknown — kapow is a design opt', () => {
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
    expect(kapow.ok).toBe(true);
    expect(kapow.renderer).toBe('kapow');
    const unknown = resolveMode('kenburns');
    expect(unknown.ok).toBe(false);
    expect(unknown.reason).toMatch(/unknown motion id/);
  });

  it('salts the mill seed so the same brief is unique per mint', () => {
    const { seedFromBrief } = requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
      seedFromBrief: (brief: string, mode: string, salt?: string | number) => string;
    };
    const brief = 'Cyan arc over a gold nameplate. Factory floor at shift change.';
    const a = seedFromBrief(brief, 'kapow', 17);
    const b = seedFromBrief(brief, 'kapow', 19);
    const bare = seedFromBrief(brief, 'kapow');
    expect(a).not.toBe(b);
    expect(a).not.toBe(bare);
    expect(seedFromBrief(brief, 'kapow', 17)).toBe(a);
  });

  it('stamps a two-tier KAPOW — outer winds, inner + word hit the jewel cut', () => {
    const { sampleKapowFrames } = requireCjs(path.join(root, 'scripts/foundry/blip-kapow.cjs')) as {
      sampleKapowFrames: (
        seed: string,
        brief?: string,
      ) => {
        differ: boolean;
        hook: { marks: { outer: number; inner: number; word: number } };
        turn: { marks: { outer: number; inner: number; word: number } };
      };
    };
    const frames = sampleKapowFrames('0xdeadbeef', 'broken angel kapow');
    expect(frames.differ).toBe(true);
    expect(frames.hook.marks.outer).toBeGreaterThan(frames.hook.marks.inner);
    expect(frames.turn.marks.inner).toBeGreaterThan(frames.hook.marks.inner);
    expect(frames.turn.marks.word).toBeGreaterThan(frames.hook.marks.word);
    expect(frames.turn.marks.word).toBeGreaterThan(0.55);
  });

  it('kapow holds unique paints — does not raster every 30fps tick', () => {
    const { writeRawKapow, KAPOW_UNIQUE_KEYS, FPS } = requireCjs(
      path.join(root, 'scripts/foundry/blip-render.cjs'),
    ) as {
      writeRawKapow: (
        file: string,
        width: number,
        height: number,
        frameCount: number,
        paintInto: (buf: Buffer, t: number) => void,
      ) => string;
      KAPOW_UNIQUE_KEYS: number;
      FPS: number;
    };
    const tmp = path.join(os.tmpdir(), `kapow-hold-${Date.now()}.rgb`);
    let paints = 0;
    writeRawKapow(tmp, 4, 4, Math.round(4.44 * FPS), () => {
      paints += 1;
    });
    expect(paints).toBe(KAPOW_UNIQUE_KEYS);
    expect(paints).toBeLessThan(20);
    rmSync(tmp, { force: true });
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

  it('renders still + Rippel five that PASS the gate and inspects the receipt', { timeout: 180000 }, async () => {
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
        expect(kapow.receipt.status, JSON.stringify(kapow.receipt, null, 2)).toBe('PASS');
        expect(kapow.receipt.motionId).toBe('kapow');
        expect(kapow.receipt.engine).toBe('kapow-headless');
        expect(kapow.receipt.look).toBe('kapow-blip');
        expect(kapow.receipt.organ).toBe('kapow');
        expect(kapow.receipt.hasAudio).toBe(true);
        expect(kapow.receipt.width).toBeGreaterThanOrEqual(1280);
        expect(kapow.receipt.height).toBeGreaterThanOrEqual(720);

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
      CAMERA_KINDS,
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
          camera: string;
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
      CAMERA_KINDS: string[];
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
    expect(CAMERA_KINDS).toEqual(['front', 'three-quarter', 'top', 'low', 'dutch', 'side']);
    expect(checksum.mesh?.id).toBeTruthy();
    expect(checksum.mesh.id).not.toBe(other.mesh.id);
    expect(checksum.mesh.family).toMatch(
      /^(tetra|octa|cube|prism|star|cage|spire|icosa|helix|torus|lattice|flower)$/,
    );
    expect(checksum.mesh.gait).toMatch(/^(tumble|shear|pulse|orbit|snap)$/);
    expect(checksum.mesh.coreStyle).toMatch(/^(disc|eclipse|pulse)$/);
    expect(checksum.mesh.camera).toMatch(/^(front|three-quarter|top|low|dutch|side)$/);
    expect(checksum.mesh.verts.length).toBeGreaterThan(3);
    expect(checksum.mesh.edges.length).toBeGreaterThan(3);
    expect(checksum.mesh.edges.length).toBeLessThanOrEqual(16);
    expect(checksum.mesh.faces.length).toBeGreaterThan(0);
    expect(checksum.mesh.faces.length).toBeLessThanOrEqual(16);
    expect(checksum.mesh.scale).toBeGreaterThan(0.55);
    expect(checksum.mesh.scale).toBeLessThan(0.8);
    expect(checksum.mesh.shells).toBe(1);
    expect(GRID_KINDS).toEqual(['floor', 'none']);
    expect(GRAD_KINDS).toEqual(expect.arrayContaining(['horizon', 'corner', 'veil']));
    expect(checksum.field?.id).toBeTruthy();
    expect(checksum.field.id).not.toBe(other.field.id);
    expect(checksum.field.grid).toMatch(/^(floor|none)$/);
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
      expect(sample.field?.grid, id).toMatch(/^(floor|none)$/);
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
      expect(minted.field.grid).toMatch(/^(floor|none)$/);
      expect(minted.field.grid).not.toMatch(/ticks|meridian/);
    }
  });

  it('does not paint outer-edge ticks or a meridian box', () => {
    const { fillVoid, paintField, buildVisualConfig } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      fillVoid: (buf: Buffer) => void;
      paintField: (
        buf: Buffer,
        width: number,
        height: number,
        t: number,
        checksum: { field: Record<string, unknown>; genreConfig?: { tempo: number } },
      ) => void;
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        field: Record<string, unknown>;
        genreConfig: { tempo: number };
      };
    };
    const width = 320;
    const height = 180;
    const checksum = buildVisualConfig({ brief: 'bezel off · Power Plant', seedHex: '0xdeadbeef' });
    const paint = (grid: string) => {
      const buf = Buffer.alloc(width * height * 3);
      fillVoid(buf);
      paintField(buf, width, height, 1.2, {
        ...checksum,
        field: { ...checksum.field, grid },
      });
      return buf;
    };
    const none = paint('none');
    expect(paint('ticks').equals(none)).toBe(true);
    expect(paint('meridian').equals(none)).toBe(true);
    expect(paint('floor').equals(none)).toBe(false);
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
        lookKind?: string;
        genre?: string;
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
      lookKind: 'focus',
      genre: 'ambient',
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
        bodyKind?: string;
        genre?: string;
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
      genre: 'ambient',
    });
    const cageFrame = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'mill',
      genre: 'ambient',
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

  it('plays hook → turn → tag on the same grid as the bed', () => {
    const { phraseOf, buildVisualConfig, paintRippelFrame, framesDiffer } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string; turnHit: number; hookEase: number; turnEase: number; tagEase: number };
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        genreConfig: { tempo: number };
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
      }) => { buffer: Buffer };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
    };
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = buildVisualConfig({ brief, seedHex });
    const beat = 60 / checksum.genreConfig.tempo;
    expect(phraseOf(checksum, 0).section).toBe('hook');
    expect(phraseOf(checksum, 0).hookEase).toBeGreaterThan(0.9);
    expect(phraseOf(checksum, beat * 2).section).toBe('turn');
    expect(phraseOf(checksum, beat * 2).turnHit).toBeGreaterThan(0.7);
    expect(phraseOf(checksum, beat * 2).turnEase).toBeGreaterThan(0.35);
    expect(phraseOf(checksum, 4.2).section).toBe('tag');
    expect(phraseOf(checksum, 4.2).tagEase).toBeGreaterThan(0.7);
    const hook = paintRippelFrame({ renderer: 'orb', t: 0, seedHex, brief, lookKind: 'focus' });
    const turn = paintRippelFrame({
      renderer: 'orb',
      t: beat * 2,
      seedHex,
      brief,
      lookKind: 'focus',
    });
    const tag = paintRippelFrame({ renderer: 'orb', t: 4.2, seedHex, brief, lookKind: 'focus' });
    expect(framesDiffer(hook.buffer, turn.buffer)).toBe(true);
    expect(framesDiffer(turn.buffer, tag.buffer)).toBe(true);
  });

  it('focus orb wears field + mesh mass so two briefs do not clone', () => {
    const { paintRippelFrame, framesDiffer, orbFocusWidth } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
      }) => { buffer: Buffer; width: number; height: number };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
      orbFocusWidth: (buf: Buffer, width: number, height: number) => { peak: number; drop: number };
    };
    const a = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex: '0xaaa111',
      brief: 'warehouse floor · Power Plant',
      lookKind: 'focus',
    });
    const b = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex: '0xbbb222',
      brief: 'other mint · alley',
      lookKind: 'focus',
    });
    expect(framesDiffer(a.buffer, b.buffer)).toBe(true);
    expect(orbFocusWidth(a.buffer, a.width, a.height).peak).toBeGreaterThan(0.55);
    expect(orbFocusWidth(a.buffer, a.width, a.height).drop).toBeLessThan(16);
  });

  it('dissolves still plates instead of hard-cutting', () => {
    const { plateClock } = requireCjs(path.join(root, 'scripts/foundry/blip-render.cjs')) as {
      plateClock: (
        seed: string,
        t?: number,
      ) => { plate: string; prev: string | null; prevMix: number; step: number };
    };
    const open = plateClock('0xdeadbeef', 0);
    expect(open.prevMix).toBe(0);
    expect(open.prev).toBeNull();
    let faded = false;
    for (let t = 0.05; t < 4.4; t += 0.05) {
      const clock = plateClock('0xdeadbeef', t);
      if (clock.step > 0 && clock.prevMix > 0.2) {
        expect(clock.prev).toMatch(/titlecard|corridor|rain|endcard/);
        faded = true;
        break;
      }
    }
    expect(faded).toBe(true);
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

  it('wears the five Rippel organs — snap and spark are not the swirl cage', () => {
    const { paintRippelFrame, framesDiffer, ORGAN, sampleMotionFrames } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      ORGAN: Record<string, string>;
      sampleMotionFrames: (
        renderer: string,
        seed: string,
        duration: number,
        brief: string,
        extra?: { bodyKind?: string },
      ) => {
        organ?: string;
        visualization: string;
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
        bodyKind?: string;
      }) => { buffer: Buffer; organ: string; visualization: string; bodyKind: string };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
    };
    expect(ORGAN).toMatchObject({
      canvas: 'mandala',
      '3d-sacred': 'sacred-flow',
      neural: 'synapse',
      waveform: 'liquid-waves',
      particles: 'cosmic-dance',
    });
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const swirl = paintRippelFrame({ renderer: 'swirl', t: 0.4, seedHex, brief, bodyKind: 'rippel' });
    const snap = paintRippelFrame({ renderer: 'snap', t: 0.4, seedHex, brief, bodyKind: 'rippel' });
    const spark = paintRippelFrame({ renderer: 'spark', t: 0.4, seedHex, brief, bodyKind: 'rippel' });
    const cage = paintRippelFrame({
      renderer: 'orb',
      t: 0.4,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'rippel',
    });
    const focus = paintRippelFrame({ renderer: 'orb', t: 0.4, seedHex, brief, lookKind: 'focus' });
    expect(swirl.organ).toBe('sacred-flow');
    expect(snap.organ).toBe('synapse');
    expect(spark.organ).toBe('cosmic-dance');
    expect(cage.organ).toBe('mandala');
    expect(focus.organ).toBe('focus');
    expect(framesDiffer(swirl.buffer, snap.buffer)).toBe(true);
    expect(framesDiffer(swirl.buffer, spark.buffer)).toBe(true);
    expect(framesDiffer(snap.buffer, spark.buffer)).toBe(true);
    expect(framesDiffer(cage.buffer, focus.buffer)).toBe(true);
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('InteractiveCanvas.tsx');
    expect(read('scripts/foundry/blip-rippel-organs.cjs')).toContain('NeuralNetworkVisualizer');
    expect(sampleMotionFrames('snap', seedHex, 4.44, brief, { bodyKind: 'rippel' }).organ).toBe(
      'synapse',
    );
    expect(sampleMotionFrames('spark', seedHex, 4.44, brief, { bodyKind: 'rippel' }).organ).toBe(
      'cosmic-dance',
    );
  });

  it('keeps mill Wu/mesh bodies next to refined Rippel drawers', () => {
    const { paintRippelFrame, framesDiffer, BODY_KINDS, resolveBodyKind, organOf } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      BODY_KINDS: string[];
      resolveBodyKind: (opts: { seedHex?: string; bodyKind?: string }) => string;
      organOf: (viz: string, look: string, body: string) => string;
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
        bodyKind?: string;
      }) => { buffer: Buffer; organ: string; bodyKind: string };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
    };
    expect(BODY_KINDS).toEqual(['mill', 'rippel']);
    expect(organOf('canvas', 'cage', 'mill')).toBe('cage');
    expect(organOf('canvas', 'cage', 'rippel')).toBe('mandala');
    expect(organOf('neural', 'cage', 'mill')).toBe('strike');
    expect(organOf('neural', 'cage', 'rippel')).toBe('synapse');
    expect(organOf('particles', 'cage', 'mill')).toBe('embers');
    expect(() => resolveBodyKind({ bodyKind: 'potato' })).toThrow(/unknown body/);
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const millCage = paintRippelFrame({
      renderer: 'orb',
      t: 0.4,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'mill',
    });
    const rippelMandala = paintRippelFrame({
      renderer: 'orb',
      t: 0.4,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'rippel',
    });
    const millSnap = paintRippelFrame({ renderer: 'snap', t: 0.4, seedHex, brief, bodyKind: 'mill' });
    const rippelSnap = paintRippelFrame({
      renderer: 'snap',
      t: 0.4,
      seedHex,
      brief,
      bodyKind: 'rippel',
    });
    expect(millCage.organ).toBe('cage');
    expect(rippelMandala.organ).toBe('mandala');
    expect(millSnap.organ).toBe('strike');
    expect(rippelSnap.organ).toBe('synapse');
    expect(framesDiffer(millCage.buffer, rippelMandala.buffer)).toBe(true);
    expect(framesDiffer(millSnap.buffer, rippelSnap.buffer)).toBe(true);
    expect(read('scripts/foundry/blip.mjs')).toContain('--body mill|rippel');
    expect(read('scripts/foundry/blip.mjs')).toContain('--camera front|three-quarter|top|low|dutch|side');
  });

  it('wears one mill suit — satellites, seed genre, same phrase as the bed', () => {
    const {
      paintRippelFrame,
      resolveGenreKind,
      GENRE_KINDS,
      buildVisualConfig,
      phraseOf,
    } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      GENRE_KINDS: string[];
      resolveGenreKind: (opts: { seedHex?: string; genre?: string }) => string;
      buildVisualConfig: (opts: { brief: string; seedHex: string; genre?: string }) => {
        genre: string;
        genreConfig: { tempo: number; phase0: number };
      };
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
        bodyKind?: string;
        genre?: string;
      }) => { buffer: Buffer; genre: string; organ: string };
    };
    expect(GENRE_KINDS).toEqual(['ambient', 'techno', 'phonk', 'jazz', 'rock', 'timeless']);
    expect(resolveGenreKind({ genre: 'techno' })).toBe('techno');
    expect(resolveGenreKind({ genre: 'country' })).toBe('timeless');
    expect(() => resolveGenreKind({ genre: 'potato' })).toThrow(/unknown genre/);
    const seedHex = '0xdeadbeef';
    const brief = 'warehouse floor · Power Plant';
    expect(resolveGenreKind({ seedHex })).toBe(buildVisualConfig({ brief, seedHex }).genre);
    expect(buildVisualConfig({ brief, seedHex, genre: 'jazz' }).genre).toBe('jazz');
    const millSwirl = paintRippelFrame({
      renderer: 'swirl',
      t: 0.4,
      seedHex,
      brief,
      bodyKind: 'mill',
    });
    const millSnap = paintRippelFrame({
      renderer: 'snap',
      t: 0.4,
      seedHex,
      brief,
      bodyKind: 'mill',
    });
    const millSpark = paintRippelFrame({
      renderer: 'spark',
      t: 0.4,
      seedHex,
      brief,
      bodyKind: 'mill',
    });
    expect(millSwirl.organ).toBe('mesh');
    expect(millSnap.organ).toBe('strike');
    expect(millSpark.organ).toBe('embers');
    expect(millSwirl.genre).toBe(resolveGenreKind({ seedHex }));
    const { framesDiffer } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
    };
    expect(framesDiffer(millSwirl.buffer, millSnap.buffer)).toBe(true);
    expect(framesDiffer(millSwirl.buffer, millSpark.buffer)).toBe(true);
    expect(framesDiffer(millSnap.buffer, millSpark.buffer)).toBe(true);
    const checksum = buildVisualConfig({ brief, seedHex });
    expect(phraseOf(checksum, 0).section).toBe('hook');
    expect(read('scripts/foundry/blip.mjs')).toContain('--genre');
    expect(read('scripts/foundry/sound-rippel.cjs')).toContain('hookEase');
  });

  it('wears one mill suit across mill and Rippel bodies — phrase + distinct silhouettes', () => {
    const { paintRippelFrame, framesDiffer, phraseOf, buildVisualConfig, organOf, BODY_KINDS } =
      requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
        BODY_KINDS: string[];
        organOf: (viz: string, look: string, body: string) => string;
        phraseOf: (
          checksum: { genreConfig?: { tempo: number } },
          t: number,
        ) => { section: string };
        buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
          genreConfig: { tempo: number };
        };
        paintRippelFrame: (opts: {
          renderer: string;
          t: number;
          seedHex: string;
          brief: string;
          lookKind?: string;
          bodyKind?: string;
        }) => { buffer: Buffer; organ: string; bodyKind: string };
        framesDiffer: (a: Buffer, b: Buffer) => boolean;
      };
    expect(BODY_KINDS).toEqual(['mill', 'rippel']);
    expect(read('scripts/foundry/blip-rippel-organs.cjs')).toContain('stampMillCore');
    expect(read('scripts/foundry/blip-rippel-organs.cjs')).toContain('suitOf');
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = buildVisualConfig({ brief, seedHex });
    const beat = 60 / checksum.genreConfig.tempo;
    expect(phraseOf(checksum, 0).section).toBe('hook');
    expect(phraseOf(checksum, beat * 2).section).toBe('turn');
    expect(phraseOf(checksum, 4.2).section).toBe('tag');
    const catalog = [
      { renderer: 'orb', lookKind: 'cage', mill: 'cage', rippel: 'mandala' },
      { renderer: 'swirl', mill: 'mesh', rippel: 'sacred-flow' },
      { renderer: 'snap', mill: 'strike', rippel: 'synapse' },
      { renderer: 'waves', mill: 'ribbons', rippel: 'liquid-waves' },
      { renderer: 'spark', mill: 'embers', rippel: 'cosmic-dance' },
    ] as const;
    for (const row of catalog) {
      expect(organOf(row.renderer === 'orb' ? 'canvas' : row.renderer === 'swirl' ? '3d-sacred' : row.renderer === 'snap' ? 'neural' : row.renderer === 'waves' ? 'waveform' : 'particles', 'cage', 'mill')).toBe(row.mill);
      expect(organOf(row.renderer === 'orb' ? 'canvas' : row.renderer === 'swirl' ? '3d-sacred' : row.renderer === 'snap' ? 'neural' : row.renderer === 'waves' ? 'waveform' : 'particles', 'cage', 'rippel')).toBe(row.rippel);
      for (const bodyKind of ['mill', 'rippel'] as const) {
        const hook = paintRippelFrame({
          renderer: row.renderer,
          t: 0,
          seedHex,
          brief,
          lookKind: row.lookKind,
          bodyKind,
        });
        const turn = paintRippelFrame({
          renderer: row.renderer,
          t: beat * 2,
          seedHex,
          brief,
          lookKind: row.lookKind,
          bodyKind,
        });
        const tag = paintRippelFrame({
          renderer: row.renderer,
          t: 4.2,
          seedHex,
          brief,
          lookKind: row.lookKind,
          bodyKind,
        });
        expect(hook.bodyKind, `${row.renderer}:${bodyKind}`).toBe(bodyKind);
        expect(hook.organ, `${row.renderer}:${bodyKind}`).toBe(bodyKind === 'mill' ? row.mill : row.rippel);
        expect(framesDiffer(hook.buffer, turn.buffer), `${row.renderer}:${bodyKind} hook/turn`).toBe(true);
        expect(framesDiffer(turn.buffer, tag.buffer), `${row.renderer}:${bodyKind} turn/tag`).toBe(true);
      }
      const mill = paintRippelFrame({
        renderer: row.renderer,
        t: beat * 2,
        seedHex,
        brief,
        lookKind: row.lookKind,
        bodyKind: 'mill',
      });
      const rippel = paintRippelFrame({
        renderer: row.renderer,
        t: beat * 2,
        seedHex,
        brief,
        lookKind: row.lookKind,
        bodyKind: 'rippel',
      });
      expect(framesDiffer(mill.buffer, rippel.buffer), `${row.renderer} mill/rippel`).toBe(true);
    }
  });

  it('metamorphosizes mill mesh, strike, and embers into distinct stills', () => {
    const { paintRippelFrame, frameFill, phraseOf, buildVisualConfig } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      frameFill: (buf: Buffer) => number;
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string };
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        genreConfig: { tempo: number };
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        bodyKind?: string;
        lookKind?: string;
        genre?: string;
      }) => { buffer: Buffer; organ: string; width: number; height: number };
    };
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = buildVisualConfig({ brief, seedHex });
    const turnT = (60 / checksum.genreConfig.tempo) * 2;
    expect(phraseOf(checksum, turnT).section).toBe('turn');
    const mesh = paintRippelFrame({
      renderer: 'swirl',
      t: turnT,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const strike = paintRippelFrame({
      renderer: 'snap',
      t: turnT,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const embers = paintRippelFrame({
      renderer: 'spark',
      t: turnT,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const waves = paintRippelFrame({
      renderer: 'waves',
      t: turnT,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    expect(mesh.organ).toBe('mesh');
    expect(strike.organ).toBe('strike');
    expect(embers.organ).toBe('embers');
    function bright(buf: Buffer): number {
      let n = 0;
      for (let i = 0; i < buf.length; i += 3) {
        if (buf[i] + buf[i + 1] + buf[i + 2] > 140) n += 1;
      }
      return n;
    }
    function goldColumn(buf: Buffer, width: number, height: number): boolean {
      for (let x = 0; x < width; x += 2) {
        let n = 0;
        for (let y = 0; y < height; y += 1) {
          const i = (y * width + x) * 3;
          if (buf[i] > 180 && buf[i + 1] > 140 && buf[i + 2] < 110) n += 1;
        }
        if (n > height * 0.28) return true;
      }
      return false;
    }
    expect(frameFill(mesh.buffer)).toBeGreaterThan(frameFill(strike.buffer));
    expect(bright(mesh.buffer)).toBeGreaterThan(4000);
    expect(bright(embers.buffer)).toBeGreaterThan(4000);
    expect(frameFill(embers.buffer)).toBeGreaterThan(0.018);
    expect(bright(strike.buffer)).toBeGreaterThan(1200);
    expect(goldColumn(waves.buffer, waves.width, waves.height)).toBe(false);
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('ghost hull + 2–3 held strikes');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('edge midpoints');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('spinMul');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('sat.depth < 0');
    expect(read('scripts/foundry/blip-rippel.cjs')).not.toContain(
      'mixRgb(THEME.gold, THEME.cyan, 0.45 + 0.2 * Math.sin',
    );
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('stampHouseNoun');
    expect(read('scripts/foundry/blip-rippel.cjs')).not.toContain('phraseMix(phrase, 0.42, 1, 0.3)');
  });

  it('plays the entertainment verb — focus moons pass behind the noun, turn ruptures', () => {
    const { paintRippelFrame, layoutFocusRing, phraseOf, buildVisualConfig } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      layoutFocusRing: (
        circles: Array<{ color: string; frequency: number; radius: number }>,
        width: number,
        height: number,
        t: number,
        checksum: { genreConfig?: { tempo: number } },
      ) => Array<{ depth: number; r: number }>;
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string };
      buildVisualConfig: (opts: { brief: string; seedHex: string }) => {
        genreConfig: { tempo: number };
        visualConfig: { circles: Array<{ color: string; frequency: number; radius: number }> };
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
        bodyKind?: string;
        genre?: string;
      }) => { buffer: Buffer };
    };
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = buildVisualConfig({ brief, seedHex });
    const turnT = (60 / checksum.genreConfig.tempo) * 2;
    expect(phraseOf(checksum, 0).section).toBe('hook');
    expect(phraseOf(checksum, turnT).section).toBe('turn');
    const hookRing = layoutFocusRing(checksum.visualConfig.circles, 1280, 720, 0, checksum);
    const turnRing = layoutFocusRing(checksum.visualConfig.circles, 1280, 720, turnT, checksum);
    const hookR = hookRing.reduce((s, p) => s + p.r, 0);
    const turnR = turnRing.reduce((s, p) => s + p.r, 0);
    expect(turnR).toBeGreaterThan(hookR);
    expect(hookRing.some((p) => p.depth < 0)).toBe(true);
    expect(hookRing.some((p) => p.depth >= 0)).toBe(true);
    const focus = paintRippelFrame({
      renderer: 'orb',
      t: turnT,
      seedHex,
      brief,
      lookKind: 'focus',
      genre: 'ambient',
    });
    expect(focus.buffer.length).toBeGreaterThan(0);
  });

  it('ruptures cage and snap on the turn and eclipses one moon behind the noun', () => {
    const {
      paintRippelFrame,
      eclipseOf,
      phraseOf,
      buildVisualConfig,
      frameFill,
      goldPixelCount,
    } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      eclipseOf: (
        checksum: { genreConfig?: { tempo: number } },
        width: number,
        height: number,
        t: number,
      ) => { x: number; y: number; r: number; depth: number };
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string; turnHit: number };
      buildVisualConfig: (opts: { brief: string; seedHex: string; genre?: string }) => {
        genreConfig: { tempo: number };
      };
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        lookKind?: string;
        bodyKind?: string;
        genre?: string;
      }) => { buffer: Buffer };
      frameFill: (buf: Buffer) => number;
      goldPixelCount: (buf: Buffer) => number;
    };
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const checksum = buildVisualConfig({ brief, seedHex, genre: 'ambient' });
    const turnT = (60 / checksum.genreConfig.tempo) * 2;
    expect(phraseOf(checksum, turnT).section).toBe('turn');
    expect(phraseOf(checksum, turnT).turnHit).toBeGreaterThan(0.7);
    const hookCage = paintRippelFrame({
      renderer: 'orb',
      t: 0,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const turnCage = paintRippelFrame({
      renderer: 'orb',
      t: turnT,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const hookSnap = paintRippelFrame({
      renderer: 'snap',
      t: 0,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const turnSnap = paintRippelFrame({
      renderer: 'snap',
      t: turnT,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    function centerBurst(buf: Buffer, width = 1280, height = 720): number {
      const x0 = (width * 0.32) | 0;
      const x1 = (width * 0.68) | 0;
      const y0 = (height * 0.28) | 0;
      const y1 = (height * 0.72) | 0;
      let n = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * width + x) * 3;
          const r = buf[i];
          const g = buf[i + 1];
          const b = buf[i + 2];
          const jewel = r < 160 && g > 90 && b > 140;
          const gold = r > 200 && g > 150 && g < 230 && b < 70;
          if (jewel || gold) n += 1;
        }
      }
      return n;
    }
    expect(centerBurst(turnCage.buffer)).toBeGreaterThan(centerBurst(hookCage.buffer));
    expect(goldPixelCount(turnCage.buffer)).toBeGreaterThan(goldPixelCount(hookCage.buffer));
    expect(goldPixelCount(turnSnap.buffer)).toBeGreaterThan(goldPixelCount(hookSnap.buffer));
    expect(centerBurst(turnSnap.buffer)).toBeGreaterThan(centerBurst(hookSnap.buffer));
    const midCage = paintRippelFrame({
      renderer: 'orb',
      t: 2.22,
      seedHex,
      brief,
      lookKind: 'cage',
      bodyKind: 'mill',
      genre: 'ambient',
    });
    const midSnap = paintRippelFrame({
      renderer: 'snap',
      t: 2.22,
      seedHex,
      brief,
      bodyKind: 'mill',
      genre: 'ambient',
    });
    expect(goldPixelCount(midCage.buffer)).toBeGreaterThan(goldPixelCount(hookCage.buffer));
    expect(goldPixelCount(midSnap.buffer)).toBeGreaterThan(goldPixelCount(hookSnap.buffer));
    const moons = [0, 0.8, 1.6, 2.2, 3.1, 4.0].map((t) => eclipseOf(checksum, 1280, 720, t));
    expect(moons.some((m) => m.depth < 0)).toBe(true);
    expect(moons.some((m) => m.depth >= 0)).toBe(true);
    expect(moons.every((m) => m.r > 60)).toBe(true);
    const behind = moons.find((m) => m.depth < 0);
    const front = moons.find((m) => m.depth >= 0);
    expect(behind && front).toBeTruthy();
    const cx = 639.5;
    const cy = 359.5;
    expect(Math.hypot((behind as { x: number; y: number }).x - cx, (behind as { y: number }).y - cy)).toBeLessThan(120);
    expect(Math.abs((front as { y: number }).y - cy)).toBeGreaterThan(16);
    expect((behind as { r: number }).r + (front as { r: number }).r).toBeGreaterThan(130);
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('paintEclipseMoon');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('paintCageRupture');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('paintSnapRupture');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('ruptureHit');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('rupturePeak');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('ruptureRecoil');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('paintCageShards');
    expect(read('scripts/foundry/blip-rippel.cjs')).toContain('crack');
  });

  it('seed-picks a camera and turn push-in keeps the same organ', () => {
    const {
      CAMERA_KINDS,
      cameraPose,
      resolveCameraKind,
      buildMesh,
      buildVisualConfig,
      fingerprintMesh,
      projectMesh,
      paintRippelFrame,
      framesDiffer,
      phraseOf,
    } = requireCjs(path.join(root, 'scripts/foundry/blip-rippel.cjs')) as {
      CAMERA_KINDS: string[];
      cameraPose: (
        kind: string,
        phrase: { turnHit?: number },
      ) => { yaw: number; pitch: number; roll: number; flatten: number; dolly: number };
      resolveCameraKind: (opts: { camera?: string }) => string | null;
      buildMesh: (
        seedHex: string,
        brief: string,
        camera?: string,
      ) => { camera: string; gait: string; id: string; family: string; faces: number[][] };
      buildVisualConfig: (opts: { brief: string; seedHex: string; camera?: string }) => {
        mesh: { camera: string };
        genreConfig: { tempo: number };
      };
      fingerprintMesh: (mesh: { camera?: string }) => { camera: string } | null;
      projectMesh: (
        mesh: Record<string, unknown>,
        width: number,
        height: number,
        t: number,
        checksum: { genreConfig?: { tempo: number } },
      ) => Array<{ x: number; y: number }>;
      paintRippelFrame: (opts: {
        renderer: string;
        t: number;
        seedHex: string;
        brief: string;
        camera?: string;
        lookKind?: string;
        bodyKind?: string;
      }) => { buffer: Buffer; camera: string; mesh: { camera: string } };
      framesDiffer: (a: Buffer, b: Buffer) => boolean;
      phraseOf: (
        checksum: { genreConfig?: { tempo: number } },
        t: number,
      ) => { section: string; turnHit: number };
    };
    expect(CAMERA_KINDS).toEqual(['front', 'three-quarter', 'top', 'low', 'dutch', 'side']);
    expect(resolveCameraKind({})).toBeNull();
    expect(resolveCameraKind({ camera: 'dutch' })).toBe('dutch');
    expect(() => resolveCameraKind({ camera: 'potato' })).toThrow(/unknown camera/);
    const brief = 'warehouse floor · Power Plant';
    const seedHex = '0xdeadbeef';
    const mesh = buildMesh(seedHex, brief);
    expect(CAMERA_KINDS).toContain(mesh.camera);
    expect(mesh.id).toContain(mesh.camera);
    const cubes = [];
    for (let i = 0; i < 80 && cubes.length < 1; i++) {
      const hunted = buildMesh(`0xabc${i}`, `cube hunt ${i}`);
      if (hunted.family === 'cube') cubes.push(hunted);
    }
    expect(cubes[0]?.faces.length).toBeGreaterThanOrEqual(8);
    expect(fingerprintMesh(mesh)?.camera).toBe(mesh.camera);
    const forced = buildVisualConfig({ brief, seedHex, camera: 'side' });
    expect(forced.mesh.camera).toBe('side');
    const hook = cameraPose('front', { turnHit: 0 });
    const turn = cameraPose('front', { turnHit: 1 });
    expect(turn.dolly).toBeGreaterThan(hook.dolly);
    expect(turn.dolly - hook.dolly).toBeGreaterThan(0.1);
    const top = cameraPose('top', { turnHit: 0 });
    const low = cameraPose('low', { turnHit: 0 });
    const dutch = cameraPose('dutch', { turnHit: 0 });
    const side = cameraPose('side', { turnHit: 0 });
    expect(top.pitch).toBeGreaterThan(low.pitch);
    expect(top.flatten).toBeLessThan(low.flatten);
    expect(top.flatten).toBeLessThan(0.2);
    expect(low.pitch).toBeLessThan(-1);
    expect(dutch.roll).toBeGreaterThan(hook.roll);
    expect(dutch.roll).toBeGreaterThan(0.45);
    expect(side.yaw).toBeGreaterThan(hook.yaw);
    const checksum = buildVisualConfig({ brief, seedHex, camera: 'front' });
    const turnT = (60 / checksum.genreConfig.tempo) * 2;
    expect(phraseOf(checksum, turnT).section).toBe('turn');
    const jewel = Object.assign({}, mesh, { camera: 'front' });
    const frontPts = projectMesh(jewel, 1280, 720, turnT, checksum);
    const topPts = projectMesh(Object.assign({}, jewel, { camera: 'top' }), 1280, 720, turnT, checksum);
    const sidePts = projectMesh(Object.assign({}, jewel, { camera: 'side' }), 1280, 720, turnT, checksum);
    const spanY = (pts: Array<{ y: number }>) =>
      Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    const spanX = (pts: Array<{ x: number }>) =>
      Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    expect(spanY(frontPts)).toBeGreaterThan(spanY(topPts));
    expect(spanX(sidePts)).not.toBeCloseTo(spanX(frontPts), 0);
    const lowPts = projectMesh(Object.assign({}, jewel, { camera: 'low' }), 1280, 720, turnT, checksum);
    const dutchPts = projectMesh(Object.assign({}, jewel, { camera: 'dutch' }), 1280, 720, turnT, checksum);
    const midY = (pts: Array<{ y: number }>) => pts.reduce((s, p) => s + p.y, 0) / pts.length;
    expect(midY(lowPts)).toBeLessThan(midY(topPts));
    expect(Math.abs(dutchPts[0].y - frontPts[0].y) + Math.abs(dutchPts[1].y - frontPts[1].y)).toBeGreaterThan(8);
    const swirlFront = paintRippelFrame({
      renderer: 'swirl',
      t: turnT,
      seedHex,
      brief,
      camera: 'front',
      bodyKind: 'mill',
    });
    const swirlSide = paintRippelFrame({
      renderer: 'swirl',
      t: turnT,
      seedHex,
      brief,
      camera: 'side',
      bodyKind: 'mill',
    });
    const swirlTop = paintRippelFrame({
      renderer: 'swirl',
      t: turnT,
      seedHex,
      brief,
      camera: 'top',
      bodyKind: 'mill',
    });
    expect(swirlFront.camera).toBe('front');
    expect(swirlFront.mesh.camera).toBe('front');
    expect(framesDiffer(swirlFront.buffer, swirlSide.buffer)).toBe(true);
    expect(framesDiffer(swirlFront.buffer, swirlTop.buffer)).toBe(true);
    expect(framesDiffer(swirlSide.buffer, swirlTop.buffer)).toBe(true);
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
    const genre = rippel.resolveGenreKind({ seedHex });
    const checksum = rippel.buildVisualConfig({ brief, seedHex });
    expect(checksum.genre).toBe(genre);
    const bed = sound.renderSamples({
      brief,
      genre,
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
      sound.highpassEnergy(slice(beat * 0.25, 0.06), bed.sampleRate, 2000),
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
    expect(read('scripts/foundry/README.md')).toMatch(/design opt/);
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
    expect(read('scripts/foundry/package.json')).toMatch(/"version": "0\.1\.11"/);
    expect(read('scripts/foundry/package.json')).toMatch(/"@0xray\/blip"/);
  });
});
