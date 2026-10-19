import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('readFoundryExtra', () => {
  it('keeps a features.json plant when foundry.json is invalid', () => {
    const { readFoundryExtra } = requireCjs(path.join(root, 'scripts/foundry/mill-plant.cjs')) as {
      readFoundryExtra: (dir: string) => { plant?: string };
    };
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-foundry-extra-'));
    try {
      mkdirSync(path.join(dir, '.xray'), { recursive: true });
      writeFileSync(
        path.join(dir, '.xray', 'features.json'),
        `${JSON.stringify({ plant: 'sound', goggles: { enabled: true } })}\n`,
      );
      writeFileSync(path.join(dir, 'foundry.json'), '{ this is not json');
      expect(readFoundryExtra(dir).plant).toBe('sound');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads a later valid foundry.json when the first file does not parse', () => {
    const { readFoundryExtra } = requireCjs(path.join(root, 'scripts/foundry/mill-plant.cjs')) as {
      readFoundryExtra: (dir: string) => { plant?: string; role?: string };
    };
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-foundry-extra-next-'));
    try {
      mkdirSync(path.join(dir, '.xray'), { recursive: true });
      writeFileSync(
        path.join(dir, '.xray', 'features.json'),
        `${JSON.stringify({ plant: 'sound', role: 'domain' })}\n`,
      );
      writeFileSync(path.join(dir, 'foundry.json'), '{ this is not json');
      writeFileSync(path.join(dir, '.xray', 'foundry.json'), `${JSON.stringify({ plant: 'blip' })}\n`);
      const extra = readFoundryExtra(dir);
      expect(extra.plant).toBe('blip');
      expect(extra.role).toBe('domain');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
