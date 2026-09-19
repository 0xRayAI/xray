import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('foundry sound inventory — art locks a genre', () => {
  it('lists live bodies, needed sounds, and destination night-drive', () => {
    const invPath = path.join(root, 'scripts/foundry/plant/sounds/inventory.json');
    expect(existsSync(invPath)).toBe(true);
    const inv = JSON.parse(read('scripts/foundry/plant/sounds/inventory.json')) as {
      law: string;
      seedPick: string[];
      artLock: Record<string, string>;
      aliases: Record<string, string>;
      genres: Array<{ id: string; status: string; voices: string[] }>;
      voices: Array<{ id: string; status: string }>;
    };
    expect(inv.law).toMatch(/art selects a genre/i);
    expect(inv.seedPick).toEqual(['ambient', 'techno', 'phonk', 'jazz', 'rock', 'timeless']);
    expect(inv.artLock.destination).toBe('destination');
    expect(inv.aliases.nightdrive).toBe('destination');
    expect(inv.aliases['night-drive']).toBe('destination');
    expect(inv.genres.map((g) => g.id)).toEqual(
      expect.arrayContaining(['ambient', 'phonk', 'destination', 'dubstep']),
    );
    const dest = inv.genres.find((g) => g.id === 'destination');
    expect(dest?.status).toBe('live');
    expect(dest?.voices).toEqual(
      expect.arrayContaining(['membrane-808', 'reese-bass', 'vinyl-dust', 'static-drop']),
    );
    expect(inv.genres.find((g) => g.id === 'dubstep')?.status).toBe('need');
    expect(inv.voices.some((v) => v.id === '808-slide' && v.status === 'need')).toBe(true);
    expect(read('scripts/foundry/plant/sounds/SOUND-INVENTORY.md')).toMatch(/night-drive/);
    expect(read('scripts/foundry/sound-rippel.cjs')).not.toMatch(/destination:\s*"ambient"/);
  });

  it('locks destination art to night-drive and inspects that bed', { timeout: 20000 }, () => {
    const { resolveGenre, GENRE_ALIASES, renderVinylDust, renderStaticDrop } = requireCjs(
      path.join(root, 'scripts/foundry/sound-rippel.cjs'),
    ) as {
      resolveGenre: (name: string) => { id: string; voices: string[] };
      GENRE_ALIASES: Record<string, string>;
      renderVinylDust: (opts: { sampleRate: number; seconds: number; velocity: number }) => Float64Array;
      renderStaticDrop: (opts: { sampleRate: number; velocity: number }) => Float64Array;
    };
    const { resolveArtGenre, resolveGenreKind } = requireCjs(
      path.join(root, 'scripts/foundry/blip-rippel.cjs'),
    ) as {
      resolveArtGenre: (motion: string, opts: { seedHex?: string; genre?: string }) => string;
      resolveGenreKind: (opts: { genre?: string; seedHex?: string }) => string;
    };
    const sound = requireCjs(path.join(root, 'scripts/foundry/sound-bed.cjs')) as {
      renderSamples: (opts: { brief: string; genre: string; seconds: number; syncopate?: boolean }) => {
        genre: { id: string; voices: string[] };
        samples: Float64Array;
      };
      evaluateMetrics: (samples: Float64Array, sampleRate: number) => { status: string };
    };
    expect(GENRE_ALIASES.destination).toBe('destination');
    expect(GENRE_ALIASES.nightdrive).toBe('destination');
    expect(resolveGenre('destination').id).toBe('destination');
    expect(resolveGenre('nightdrive').id).toBe('destination');
    expect(resolveGenre('ambient').id).toBe('ambient');
    expect(resolveGenreKind({ genre: 'destination' })).toBe('destination');
    expect(resolveArtGenre('destination', { seedHex: '0xdeadbeef', genre: 'jazz' })).toBe(
      'destination',
    );
    expect(resolveArtGenre('orb', { genre: 'jazz' })).toBe('jazz');
    expect(resolveGenre('destination').voices).toEqual(
      expect.arrayContaining(['vinyl-dust', 'static-drop', 'membrane-808']),
    );
    const dust = renderVinylDust({ sampleRate: 44100, seconds: 0.2, velocity: 0.2 });
    const drop = renderStaticDrop({ sampleRate: 44100, velocity: 0.5 });
    expect(dust.some((n) => n !== 0)).toBe(true);
    expect(drop.some((n) => n !== 0)).toBe(true);
    const bed = sound.renderSamples({
      brief: 'road to the grid destination',
      genre: 'destination',
      seconds: 4.44,
      syncopate: true,
    });
    expect(bed.genre.id).toBe('destination');
    expect(sound.evaluateMetrics(bed.samples, 44100).status).toBe('PASS');
  });
});
