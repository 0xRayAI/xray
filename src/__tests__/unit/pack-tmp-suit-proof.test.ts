import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { proofFoundryEnv } from '../../../scripts/node/pack-tmp-suit-proof.mjs';

describe('proofFoundryEnv', () => {
  it('keeps a real machine plugin out of the seat inspect', () => {
    const consumer = mkdtempSync(path.join(os.tmpdir(), 'proof-env-'));
    try {
      const env = proofFoundryEnv(consumer, {
        ...process.env,
        FOUNDRY_MACHINE_HOME: os.homedir(),
      });
      expect(env.HOME).toBe(path.join(consumer, '.proof-home'));
      expect(env.FOUNDRY_MACHINE_HOME).toBe(path.join(consumer, '.proof-machine'));
      expect(env.FOUNDRY_ROOT).toBe(consumer);
      expect(fs.existsSync(env.FOUNDRY_MACHINE_HOME)).toBe(true);
      expect(fs.existsSync(path.join(env.FOUNDRY_MACHINE_HOME, '.grok', 'plugins', '0xray'))).toBe(false);
    } finally {
      rmSync(consumer, { recursive: true, force: true });
    }
  });
});
