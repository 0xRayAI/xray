import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('vendored synthesis complete-todo', () => {
  it('refuses to mint PASS and writes no consult receipt', () => {
    const script = path.join(
      process.cwd(),
      'vendor/@0xray/repertoire/scripts/run-live-synthesis-checkpoint.mjs',
    );
    const receipt = path.join(
      process.cwd(),
      'vendor/@0xray/repertoire/.xray/state/synthesis-consult-s.1.json',
    );
    const result = spawnSync(
      process.execPath,
      [script, 'complete-todo', '--id=s.1', '--verdict=PASS'],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('cannot mint a PASS receipt');
    expect(fs.existsSync(receipt)).toBe(false);
  });
});
