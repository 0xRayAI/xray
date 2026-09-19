import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('foundry sound + picture inventory — bar 8 via @0xray/blip', () => {
  it('resolves published mill seats at or above 8', { timeout: 40000 }, () => {
    const millDir = path.dirname(requireCjs.resolve('@0xray/blip/sound-taste'));
    expect(existsSync(path.join(millDir, 'plant/sounds/inventory.json'))).toBe(true);
    expect(existsSync(path.join(millDir, 'plant/pictures/inventory.json'))).toBe(true);
    const sounds = JSON.parse(
      readFileSync(path.join(millDir, 'plant/sounds/inventory.json'), 'utf8'),
    ) as { bar: number; voices: Array<{ taste: number }> };
    const pictures = JSON.parse(
      readFileSync(path.join(millDir, 'plant/pictures/inventory.json'), 'utf8'),
    ) as {
      bar: number;
      motions: Array<{ vibe: number; looker: number }>;
      strokes: Array<{ vibe: number; looker: number }>;
    };
    expect(sounds.bar).toBe(8);
    expect(pictures.bar).toBe(8);
    expect(sounds.voices.every((v) => v.taste + 1e-9 >= 8)).toBe(true);
    expect(pictures.motions.every((m) => m.vibe >= 8 && m.looker >= 8)).toBe(true);
    expect(pictures.strokes.every((s) => s.vibe >= 8 && s.looker >= 8)).toBe(true);

    const { tasteMatrix, SHIP_BAR } = requireCjs(path.join(root, 'scripts/foundry/sound-taste.cjs')) as {
      tasteMatrix: () => {
        status: string;
        seats: Array<{ genre: string; score: number; status: string }>;
      };
      SHIP_BAR: number;
    };
    const { voiceMatrix } = requireCjs(path.join(root, 'scripts/foundry/sound-voice.cjs')) as {
      voiceMatrix: () => {
        status: string;
        seats: Array<{ id: string; score: number; status: string }>;
      };
    };
    expect(SHIP_BAR).toBe(8);
    const taste = tasteMatrix();
    const voice = voiceMatrix();
    expect(taste.status, JSON.stringify(taste.seats.filter((s) => s.status !== 'PASS'))).toBe('PASS');
    expect(voice.status, JSON.stringify(voice.seats.filter((s) => s.status !== 'PASS'))).toBe('PASS');
    expect(taste.seats.every((s) => s.score + 1e-9 >= 8)).toBe(true);
    expect(voice.seats.every((s) => s.score + 1e-9 >= 8)).toBe(true);
  });
});
