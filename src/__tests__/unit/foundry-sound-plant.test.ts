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

function sine(
  seconds: number,
  hz: number,
  amp: number,
  sampleRate: number,
  env?: (t: number, dur: number) => number,
): Float64Array {
  const n = Math.floor(seconds * sampleRate);
  const samples = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const gain = env ? env(t, seconds) : 1;
    samples[i] = amp * gain * Math.sin(2 * Math.PI * hz * t);
  }
  return samples;
}

function introBodyFade(t: number, seconds: number): number {
  if (t < 0.75) return 0.16 + 0.2 * (t / 0.75);
  if (t >= seconds - 1) return Math.max(0, 1 - (t - (seconds - 1)));
  return 1;
}

describe('foundry sound plant — files and mint', () => {
  it('ships sound + sound-inspect plant next to mill (not a mill copy)', () => {
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/sound/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/sound-inspect/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/sound.yml'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/sound-inspect.yml'))).toBe(true);
    expect(read('scripts/foundry/plant/skills/sound/SKILL.md')).toMatch(/brief/i);
    expect(read('scripts/foundry/plant/skills/sound/SKILL.md')).toMatch(/checksum seed/i);
    expect(read('scripts/foundry/plant/skills/sound-inspect/SKILL.md')).toMatch(/chop/i);
    expect(read('scripts/foundry/plant/skills/sound-inspect/SKILL.md')).not.toMatch(/Inspect AI work/);
    expect(read('scripts/foundry/plant/skills/sound/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/cli.mjs')).toContain('sound: { script: "sound.mjs"');
    expect(read('scripts/foundry/mint-suit.cjs')).toContain('FACTORY_PLANT_CATALOG');
    expect(read('scripts/foundry/inspect.mjs')).toContain('sound-bed');
  });

  it('mints a sound seat without mill skills and allowlists them', async () => {
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
        soundPlant?: { skills: string[] };
        costume?: boolean;
      };
      loadFactoryPlantKinds: (dir: string) => string[];
      FACTORY_PLANT_CATALOG: { sound: { skills: string[] } };
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    expect(FACTORY_PLANT_CATALOG.sound.skills).toEqual(['sound', 'sound-inspect']);

    const millSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-mill-seat-'));
    const soundSeat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-seat-'));
    try {
      writeFileSync(
        path.join(millSeat, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      const millInv = mintConsumerSuit(root, millSeat, () => undefined);
      expect(millInv.plant).toEqual(['mill']);
      expect(millInv.millPlant?.skills).toEqual(['mill', 'inspect']);
      expect(millInv.soundPlant?.skills).toEqual([]);
      expect(existsSync(path.join(millSeat, '.opencode/skills/sound/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(millSeat, '.opencode/skills/mill/SKILL.md'))).toBe(true);

      writeFileSync(
        path.join(soundSeat, 'package.json'),
        `${JSON.stringify({ name: 'dist-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(soundSeat, 'foundry.json'),
        `${JSON.stringify({ plant: 'sound' }, null, 2)}\n`,
      );
      expect(loadFactoryPlantKinds(soundSeat)).toEqual(['sound']);
      const soundInv = mintConsumerSuit(root, soundSeat, () => undefined);
      expect(soundInv.costume).toBe(false);
      expect(soundInv.suit).toBe('fastened');
      expect(soundInv.plant).toEqual(['sound']);
      expect(soundInv.millPlant?.skills).toEqual([]);
      expect(soundInv.soundPlant?.skills).toEqual(['sound', 'sound-inspect']);
      expect(existsSync(path.join(soundSeat, '.opencode/skills/sound/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(soundSeat, '.opencode/skills/sound-inspect/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(soundSeat, '.opencode/agents/sound.yml'))).toBe(true);
      expect(existsSync(path.join(soundSeat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(soundSeat, '.opencode/skills/inspect/SKILL.md'))).toBe(false);
      expect(
        existsSync(path.join(soundSeat, '.grok/plugins/0xray/skills/sound/SKILL.md')),
      ).toBe(true);

      const report = await inspectSuit(soundSeat, { millRoot: root, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const receipt = report.checks.find((c) => c.id === 'receipt') as {
        plant?: string[];
        soundPlant?: string[];
        millPlant?: string[];
      };
      expect(receipt.plant).toEqual(['sound']);
      expect(receipt.soundPlant).toEqual(['sound', 'sound-inspect']);
      expect(receipt.millPlant).toEqual([]);
      const bed = report.checks.find((c) => c.id === 'sound-bed') as {
        status?: string;
        skipped?: boolean;
      };
      expect(bed.status).toBe('NONE');
      expect(bed.skipped).toBe(true);

      mkdirSync(path.join(soundSeat, '.opencode/skills/enforcer'), { recursive: true });
      writeFileSync(path.join(soundSeat, '.opencode/skills/enforcer/SKILL.md'), 'LEFTOVER\n');
      expect(() => mintConsumerSuit(root, soundSeat, () => undefined)).toThrow(/costume dump/);
    } finally {
      rmSync(millSeat, { recursive: true, force: true });
      rmSync(soundSeat, { recursive: true, force: true });
    }
  });

  it('treats leftover sound skills on a mill seat as costume', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-dump-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'acme-app', version: '1.0.0' }, null, 2)}\n`,
      );
      mkdirSync(path.join(tmp, '.opencode/skills/sound'), { recursive: true });
      writeFileSync(path.join(tmp, '.opencode/skills/sound/SKILL.md'), 'STRAY SOUND\n');
      expect(() => mintConsumerSuit(root, tmp, () => undefined)).toThrow(/costume dump/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry sound plant — metrics fail-closed + PASS wav', () => {
  it('fails closed on silence, clip, chop, and a constant drone', () => {
    const {
      SAMPLE_RATE,
      evaluateMetrics,
      evaluateWavFile,
      writeWav16Mono,
    } = requireCjs(path.join(root, 'scripts/foundry/sound-bed.cjs')) as {
      SAMPLE_RATE: number;
      evaluateMetrics: (
        samples: Float64Array,
        sampleRate: number,
      ) => { status: string; gates?: Record<string, boolean>; failClosed?: boolean };
      evaluateWavFile: (file: string) => { status: string; reason?: string };
      writeWav16Mono: (file: string, samples: Float64Array, sampleRate: number) => string;
    };

    const silent = evaluateMetrics(new Float64Array(SAMPLE_RATE * 4), SAMPLE_RATE);
    expect(silent.failClosed).toBe(true);
    expect(silent.status).toBe('FAIL');
    expect(silent.gates?.levels).toBe(false);

    const clipped = evaluateMetrics(
      sine(4, 220, 1, SAMPLE_RATE, introBodyFade),
      SAMPLE_RATE,
    );
    expect(clipped.status).toBe('FAIL');
    expect(clipped.gates?.peak).toBe(false);

    const choppy = new Float64Array(SAMPLE_RATE * 4);
    for (let i = 0; i < choppy.length; i++) {
      const on = Math.floor(i / Math.floor(SAMPLE_RATE * 0.25)) % 2 === 0;
      choppy[i] = on ? 0.4 : 0.01;
    }
    const chop = evaluateMetrics(choppy, SAMPLE_RATE);
    expect(chop.status).toBe('FAIL');
    expect(chop.gates?.chop).toBe(false);

    const drone = evaluateMetrics(sine(4, 440, 0.35, SAMPLE_RATE, introBodyFade), SAMPLE_RATE);
    expect(drone.status).toBe('FAIL');
    expect(drone.gates?.hum).toBe(false);

    expect(evaluateWavFile('/no/such/bed.wav').status).toBe('FAIL');
    expect(evaluateWavFile('/no/such/bed.wav').reason).toMatch(/missing/);

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-badwav-'));
    try {
      const junk = path.join(tmp, 'nope.wav');
      writeFileSync(junk, 'not a wav');
      expect(evaluateWavFile(junk).status).toBe('FAIL');
      const short = path.join(tmp, 'short.wav');
      writeWav16Mono(short, sine(0.4, 220, 0.2, SAMPLE_RATE), SAMPLE_RATE);
      expect(evaluateWavFile(short).status).toBe('FAIL');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('renders a short synthetic bed that PASSes the gate and inspects the receipt', async () => {
    const { renderBed, seedFromBrief, readReceipt, evaluateWavFile } = requireCjs(
      path.join(root, 'scripts/foundry/sound-bed.cjs'),
    ) as {
      renderBed: (opts: {
        root: string;
        brief: string;
        genre?: string;
        seconds?: number;
      }) => {
        receipt: {
          status: string;
          seed: string;
          genre: string;
          metrics: unknown;
          engine?: string;
          topology?: string;
          voices?: string[];
        };
        wav: string;
      };
      seedFromBrief: (brief: string, genre: string) => string;
      readReceipt: (dir: string) => { status: string } | null;
      evaluateWavFile: (file: string) => { status: string };
    };
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    const { inspectBed } = await import('../../../scripts/foundry/sound.mjs');

    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-pass-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'dist-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'sound' }, null, 2)}\n`);
      mintConsumerSuit(root, tmp, () => undefined);

      const brief = 'night alley rain pad';
      const first = renderBed({ root: tmp, brief, genre: 'ambient', seconds: 4 });
      expect(first.receipt.engine).toBe('rippel-headless');
      expect(first.receipt.topology).toBe('membrane+metal+mixer');
      expect(first.receipt.status, JSON.stringify(first.receipt.metrics, null, 2)).toBe('PASS');
      expect(first.receipt.seed).toBe(seedFromBrief(brief, 'ambient'));
      expect(first.receipt.genre).toBe('ambient');
      expect(existsSync(first.wav)).toBe(true);
      expect(evaluateWavFile(first.wav).status).toBe('PASS');
      expect(readReceipt(tmp)?.status).toBe('PASS');

      const again = renderBed({ root: tmp, brief, genre: 'ambient', seconds: 4 });
      expect(again.receipt.seed).toBe(first.receipt.seed);

      const phonk = renderBed({ root: tmp, brief: 'trunk bounce alias', genre: 'phonk', seconds: 4 });
      expect(phonk.receipt.genre).toBe('phonk');
      expect(phonk.receipt.voices).toEqual(
        expect.arrayContaining(['membrane-808', 'metal-hat', 'mixer']),
      );
      expect(phonk.receipt.status, JSON.stringify(phonk.receipt.metrics, null, 2)).toBe('PASS');

      const report = await inspectSuit(tmp, { millRoot: root, skipLive: true });
      expect(report.ok, JSON.stringify(report.checks, null, 2)).toBe(true);
      const bed = report.checks.find((c) => c.id === 'sound-bed') as {
        status?: string;
        ok?: boolean;
      };
      expect(bed.status).toBe('PASS');
      expect(bed.ok).toBe(true);

      const soundInspect = inspectBed(tmp);
      expect(soundInspect.ok).toBe(true);
      expect(soundInspect.status).toBe('PASS');

      const cli = spawnSync(process.execPath, [path.join(root, 'scripts/foundry/cli.js'), 'sound', 'inspect'], {
        cwd: tmp,
        encoding: 'utf8',
        env: { ...process.env, FOUNDRY_ROOT: tmp },
      });
      expect(cli.status, `${cli.stdout}${cli.stderr}`).toBe(0);
      expect(cli.stdout).toMatch(/"PASS"/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('inspect fails closed when the last bed receipt is FAIL', async () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (pkg: string, target: string, log: (...a: unknown[]) => void) => unknown;
    };
    const { writeReceipt } = requireCjs(path.join(root, 'scripts/foundry/sound-bed.cjs')) as {
      writeReceipt: (dir: string, receipt: Record<string, unknown>) => string;
    };
    const { inspectSuit } = await import('../../../scripts/foundry/inspect.mjs');
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-fail-receipt-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'dist-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'sound' }, null, 2)}\n`);
      mintConsumerSuit(root, tmp, () => undefined);
      writeReceipt(tmp, {
        kind: 'sound-bed',
        status: 'FAIL',
        failClosed: true,
        reason: 'peak',
        gates: { chop: true, levels: true, peak: false, hum: true },
      });
      const report = await inspectSuit(tmp, { millRoot: root, skipLive: true });
      expect(report.ok).toBe(false);
      expect(report.failed).toContain('sound-bed');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry sound plant — Rippel topology', () => {
  it('techno/phonk use membrane+metal chains and are richer than a 3-sine bed', () => {
    const { renderSamples, SAMPLE_RATE, TONE_OFFLINE_BLOCKER, crestFactor } = requireCjs(
      path.join(root, 'scripts/foundry/sound-bed.cjs'),
    ) as {
      renderSamples: (opts: { brief: string; genre: string; seconds: number }) => {
        samples: Float64Array;
        genre: { id: string; voices: string[] };
        topology: string;
        engine: string;
      };
      SAMPLE_RATE: number;
      TONE_OFFLINE_BLOCKER: string;
      crestFactor: (samples: Float64Array) => number;
    };
    expect(TONE_OFFLINE_BLOCKER).toMatch(/OfflineAudioContext/);
    expect(read('scripts/foundry/sound-rippel.cjs')).toContain('renderMembrane');
    expect(read('scripts/foundry/sound-rippel.cjs')).toContain('renderMetal');
    expect(read('scripts/foundry/sound-bed.cjs')).not.toContain('three-sine');
    expect(read('scripts/foundry/sound-bed.cjs')).toContain('sound-rippel.cjs');

    const techno = renderSamples({ brief: 'warehouse floor', genre: 'techno', seconds: 4 });
    expect(techno.engine).toBe('rippel-headless');
    expect(techno.topology).toBe('membrane+metal+mixer');
    expect(techno.genre.voices).toEqual(
      expect.arrayContaining(['membrane-kick', 'metal-hat', 'mixer']),
    );
    const sine = new Float64Array(SAMPLE_RATE * 4);
    for (let i = 0; i < sine.length; i++) {
      const t = i / SAMPLE_RATE;
      sine[i] = 0.2 * Math.sin(2 * Math.PI * 110 * t) + 0.15 * Math.sin(2 * Math.PI * 165 * t);
    }
    expect(crestFactor(techno.samples)).toBeGreaterThan(crestFactor(sine) * 1.15);
  });
});

describe('foundry sound plant — docs and CI', () => {
  it('friend-tests human docs and keeps mill CI on the sound unit file', () => {
    expect(read('scripts/foundry/README.md')).toMatch(/plant": "sound"/);
    expect(read('scripts/foundry/README.md')).toMatch(/A friend would hear/);
    expect(read('AGENTS.md')).toMatch(/sound-inspect/);
    expect(read('AGENTS-consumer.md')).toMatch(/sound render/);
    expect(read('README.md')).toMatch(/plant": "sound"/);
    expect(read('llms.txt')).toMatch(/factory-sound/);
    expect(read('.github/workflows/mill-ci.yml')).toContain('foundry-sound-plant.test.ts');
    expect(read('.github/workflows/enforce-version-compliance.yml')).toContain(
      'foundry-sound-plant.test.ts',
    );
  });
});
