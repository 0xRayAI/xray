import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { assertGogglesOn } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
  assertGogglesOn: (dir: string) => void;
};

describe('wear keeps goggles on', () => {
  it('throws when the suit turns goggles off and allows the default', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'xray-goggles-on-'));
    try {
      expect(() => assertGogglesOn(dir)).not.toThrow();
      mkdirSync(path.join(dir, '.xray'), { recursive: true });
      writeFileSync(
        path.join(dir, '.xray', 'features.json'),
        `${JSON.stringify({ goggles: { enabled: true } }, null, 2)}\n`,
      );
      expect(() => assertGogglesOn(dir)).not.toThrow();
      writeFileSync(
        path.join(dir, '.xray', 'features.json'),
        `${JSON.stringify({ goggles: { enabled: false } }, null, 2)}\n`,
      );
      expect(() => assertGogglesOn(dir)).toThrow(/goggles off/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
