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
    expect(inv.genres.find((g) => g.id === 'dubstep')?.status).toBe('live');
    expect(inv.voices.some((v) => v.id === '808-slide' && v.status === 'live')).toBe(true);
    expect(inv.voices.some((v) => v.id === 'wobble-bass' && v.status === 'live')).toBe(true);
    expect(inv.voices.some((v) => v.id === 'chopped-vocal' && v.status === 'live')).toBe(true);
    expect(inv.genres.find((g) => g.id === 'phonk')?.voices).toEqual(
      expect.arrayContaining(['chopped-vocal', '808-slide']),
    );
    expect(read('scripts/foundry/plant/sounds/SOUND-INVENTORY.md')).toMatch(/night-drive/);
    expect(read('scripts/foundry/sound-rippel.cjs')).not.toMatch(/destination:\s*"ambient"/);
  });

  it('locks destination art to night-drive and inspects that bed', { timeout: 20000 }, () => {
    const { resolveGenre, GENRE_ALIASES, renderVinylDust, renderStaticDrop, renderChoppedVocal } =
      requireCjs(path.join(root, 'scripts/foundry/sound-rippel.cjs')) as {
        resolveGenre: (name: string) => { id: string; voices: string[] };
        GENRE_ALIASES: Record<string, string>;
        renderVinylDust: (opts: { sampleRate: number; seconds: number; velocity: number }) => Float64Array;
        renderStaticDrop: (opts: { sampleRate: number; velocity: number }) => Float64Array;
        renderChoppedVocal: (opts: {
          sampleRate: number;
          freq: number;
          velocity: number;
          chops: number;
          grain: number;
        }) => Float64Array;
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
        grid?: { bpm: number };
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
    const chop = renderChoppedVocal({
      sampleRate: 44100,
      freq: 220,
      velocity: 0.3,
      chops: 3,
      grain: 0.05,
    });
    expect(dust.some((n) => n !== 0)).toBe(true);
    expect(drop.some((n) => n !== 0)).toBe(true);
    let chopOnsets = 0;
    let armed = true;
    for (let i = 0; i < chop.length; i += 64) {
      let acc = 0;
      for (let j = i; j < i + 64 && j < chop.length; j++) acc += chop[j] * chop[j];
      const rms = Math.sqrt(acc / 64);
      if (armed && rms > 0.01) {
        chopOnsets += 1;
        armed = false;
      } else if (rms < 0.002) {
        armed = true;
      }
    }
    expect(chopOnsets).toBeGreaterThanOrEqual(3);
    const bed = sound.renderSamples({
      brief: 'road to the grid destination',
      genre: 'destination',
      seconds: 4.44,
      syncopate: true,
    });
    expect(bed.genre.id).toBe('destination');
    expect(sound.evaluateMetrics(bed.samples, 44100).status).toBe('PASS');
    const slow = sound.renderSamples({
      brief: 'destination lock',
      genre: 'destination',
      seconds: 4.44,
      syncopate: true,
    });
    expect(slow.grid?.bpm ?? 90).toBe(90);
    expect(sound.evaluateMetrics(slow.samples, 44100).status).toBe('PASS');
  });

  it('tastes every live body at ship bar 8 and inspects dubstep', { timeout: 40000 }, () => {
    const { tasteMatrix, SHIP_BAR } = requireCjs(path.join(root, 'scripts/foundry/sound-taste.cjs')) as {
      tasteMatrix: () => {
        status: string;
        shipBar: number;
        seats: Array<{ genre: string; score: number; status: string; fails: string[] }>;
      };
      SHIP_BAR: number;
    };
    const sound = requireCjs(path.join(root, 'scripts/foundry/sound-bed.cjs')) as {
      renderSamples: (opts: { brief: string; genre: string; seconds: number; syncopate?: boolean }) => {
        genre: { id: string; voices: string[] };
        samples: Float64Array;
      };
      evaluateMetrics: (samples: Float64Array, sampleRate: number) => { status: string };
    };
    expect(SHIP_BAR).toBe(8);
    const report = tasteMatrix();
    expect(report.shipBar).toBe(8);
    expect(report.seats.map((s) => s.genre)).toEqual(
      expect.arrayContaining(['destination', 'phonk', 'dubstep', 'ambient']),
    );
    expect(report.status, JSON.stringify(report.seats.filter((s) => s.status === 'FAIL'))).toBe(
      'PASS',
    );
    expect(report.seats.every((s) => s.score + 1e-9 >= 8)).toBe(true);
    const step = sound.renderSamples({
      brief: 'half time drop',
      genre: 'dubstep',
      seconds: 4.44,
      syncopate: true,
    });
    expect(step.genre.id).toBe('dubstep');
    expect(step.genre.voices).toEqual(expect.arrayContaining(['wobble-bass', 'drop-impact']));
    expect(sound.evaluateMetrics(step.samples, 44100).status).toBe('PASS');
  });
});
