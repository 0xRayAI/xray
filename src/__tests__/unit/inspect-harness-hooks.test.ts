import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { probeHarness } from '../../../scripts/foundry/inspect.mjs';

describe('inspect harness hooks', () => {
  it('counts a Grok hook whose command is nested under hooks', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'xray-grok-hooks-'));
    try {
      const file = path.join(root, '.grok', 'plugins', '0xray', 'hooks', 'hooks.json');
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(
        file,
        JSON.stringify({
          hooks: {
            PreToolUse: [{ hooks: [{ type: 'command', command: 'node run-grok-hook.mjs pre-tool-use.js' }] }],
          },
        }),
      );
      const report = probeHarness(root);
      expect(report.hooks.grok).toBe(true);
      expect(report.hooks.cursor).toBe(false);
      expect(report.hooks.bound).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
