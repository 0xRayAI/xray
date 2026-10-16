import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('repertoire wear points at the project copy', () => {
  it('shipped features.json does not read the factory tarball', () => {
    const features = JSON.parse(
      readFileSync(path.join(root, 'xray', 'features.json'), 'utf8'),
    ) as {
      memory_routing: { config: { signalsPath: string; statePath: string } };
    };
    expect(features.memory_routing.config.signalsPath).toBe(
      '.xray/state/repertoire/curated_signals.json',
    );
    expect(features.memory_routing.config.signalsPath).not.toMatch(/node_modules/);
    expect(features.memory_routing.config.statePath).toBe(
      '.xray/state/repertoire/inference-state.json',
    );
  });
});
