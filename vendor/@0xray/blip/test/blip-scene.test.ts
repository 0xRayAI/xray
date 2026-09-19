import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const mill = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string): string {
  return readFileSync(path.join(mill, rel), 'utf8');
}

describe('blip-scene — Tron destination, not a foundry', () => {
  it('pairs Tron oranges with dark beds and keeps house cyan as the program rim', () => {
    expect(existsSync(path.join(mill, 'blip-scene.cjs'))).toBe(true);
    const { TRON, SCENE_PAIRS, pickPair } = requireCjs(path.join(mill, 'blip-scene.cjs')) as {
      TRON: Record<string, { hex: string; rgb: number[] }>;
      SCENE_PAIRS: Array<{ id: string; hex: string; jewel: number[]; rim: number[] }>;
      pickPair: (seed: string) => { id: string; hex: string };
    };
    expect(TRON.legacy.hex).toBe('#DF740C');
    expect(TRON.guard.hex).toBe('#FF410D');
    expect(TRON.clu.hex).toBe('#F79D1E');
    expect(TRON.poster.hex).toBe('#F2A007');
    expect(TRON.ember.hex).toBe('#ED681F');
    expect(SCENE_PAIRS.map((p) => p.id)).toEqual(['legacy', 'guard', 'clu', 'poster', 'ember']);
    expect(SCENE_PAIRS.every((p) => p.hex.startsWith('#'))).toBe(true);
    expect(SCENE_PAIRS.every((p) => p.rim[0] === 61 && p.rim[1] === 224 && p.rim[2] === 232)).toBe(
      true,
    );
    expect(pickPair('0xdeadbeef').id).toBeTruthy();
    expect(read('plant/motions/registry.json')).toMatch(/destination/);
    expect(read('blip-scene.cjs')).not.toMatch(/\bfoundry plant\b/i);
  });

  it('paints a road into a colored horizon that changes on the jewel cut', () => {
    const { sampleDestinationFrames, ENGINE, LOOK, ORGAN, pickPair } = requireCjs(
      path.join(mill, 'blip-scene.cjs'),
    ) as {
      sampleDestinationFrames: (
        seed: string,
        brief: string,
      ) => { differ: boolean; hook: { pair: string }; turn: { pair: string; marks: { bloom: number } } };
      ENGINE: string;
      LOOK: string;
      ORGAN: string;
      pickPair: (seed: string) => { motif: string };
    };
    expect(ENGINE).toBe('scene-headless');
    expect(LOOK).toBe('destination-blip');
    expect(ORGAN).toBe('destination');
    const frames = sampleDestinationFrames('0xdeadbeef', 'road to the grid destination');
    expect(frames.differ).toBe(true);
    expect(frames.hook.pair).toBe(frames.turn.pair);
    expect(frames.turn.marks.bloom).toBeGreaterThan(0.4);
    expect(pickPair('0xdeadbeef').motif).not.toBe(pickPair('0x9f76dd89').motif);
  });

  it('clocks hook slit, turn bloom, and tag hold on the picture phrase', () => {
    const { paintDestinationFrame } = requireCjs(path.join(mill, 'blip-scene.cjs')) as {
      paintDestinationFrame: (opts: Record<string, unknown>) => {
        marks: { clock: string; bloom: number; approach: number };
        motif: string;
      };
    };
    const size = { width: 1280, height: 720, brief: 'road to the grid destination' };
    const hook = paintDestinationFrame({ ...size, seedHex: '0x9f76dd89', t: 0.3 });
    const turn = paintDestinationFrame({ ...size, seedHex: '0x9f76dd89', t: 1.9 });
    const tag = paintDestinationFrame({ ...size, seedHex: '0x9f76dd89', t: 3.4 });
    expect(hook.marks.clock).toBe('hook');
    expect(turn.marks.clock).toBe('turn');
    expect(tag.marks.clock).toBe('tag');
    expect(hook.marks.bloom).toBeLessThan(0.16);
    expect(turn.marks.bloom).toBeGreaterThan(0.4);
    expect(tag.marks.bloom).toBeGreaterThan(0.9);
    expect(hook.marks.approach).toBeLessThan(turn.marks.approach);
    expect(tag.marks.approach).toBeGreaterThan(0.9);
    expect(hook.motif).toBe('gate');
  });

  it('renders destination that PASS inspect with a Tron scene pair', { timeout: 60000 }, () => {
    const { renderBlip, hasFfmpeg } = requireCjs(path.join(mill, 'blip-render.cjs')) as {
      hasFfmpeg: () => boolean;
      renderBlip: (opts: Record<string, unknown>) => {
        receipt: {
          status: string;
          motionId: string;
          engine: string;
          look: string;
          organ: string;
          scenePair: string | null;
          sceneHex: string | null;
          hasAudio: boolean;
        };
      };
    };
    if (!hasFfmpeg()) return;
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'blip-dest-'));
    const bed = path.join(tmp, 'bed.wav');
    const sampleRate = 44100;
    const n = Math.floor(4.44 * sampleRate);
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + n * 2, 4);
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
    buf.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) buf.writeInt16LE(i % 32 === 0 ? 12000 : 800, 44 + i * 2);
    writeFileSync(bed, buf);
    try {
      const { receipt } = renderBlip({
        root: tmp,
        brief: 'road to the grid destination',
        pictureMode: 'motion:destination',
        bed,
        registryPath: path.join(mill, 'plant/motions/registry.json'),
      });
      expect(receipt.status, JSON.stringify(receipt)).toBe('PASS');
      expect(receipt.motionId).toBe('destination');
      expect(receipt.engine).toBe('scene-headless');
      expect(receipt.look).toBe('destination-blip');
      expect(receipt.organ).toBe('destination');
      expect(receipt.hasAudio).toBe(true);
      expect(['legacy', 'guard', 'clu', 'poster', 'ember']).toContain(receipt.scenePair);
      expect(receipt.sceneHex).toMatch(/^#/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
