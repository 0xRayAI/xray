import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bin = path.join(root, 'grok-bot', 'bin', 'grok-bot.js');

function run(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env });
}

describe('grok-bot live-inbox and exit-gate ship in the kit (xray#1071)', () => {
  const bare = { PATH: process.env.PATH, HOME: tmpdir() };

  it('live-inbox with no board env exits 2 and names both vars', () => {
    const r = run(['live-inbox', 'coordinator'], bare);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('LIVE_URL');
    expect(r.stderr).toContain('SEAT_KEYS_DIR');
  });

  it('exit-gate passes a backed NOTES section and fails an unbacked bug', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gb-gate-'));
    try {
      const ok = path.join(dir, 'ok.md');
      writeFileSync(ok, '## turn\n- shipped org/app#12\n');
      expect(run(['exit-gate', ok], bare).status).toBe(0);
      const bad = path.join(dir, 'bad.md');
      writeFileSync(bad, '## turn\n- bug: the wake drops a line\n');
      expect(run(['exit-gate', bad], bare).status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
