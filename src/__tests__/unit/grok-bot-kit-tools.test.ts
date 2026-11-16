import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

  it('the packed kit ships packet-body and cloud_line, and the gate passes', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'gb-pack-'));
    try {
      const pack = spawnSync('npm', ['pack', '--pack-destination', dir], {
        cwd: path.join(root, 'grok-bot'),
        encoding: 'utf8',
      });
      expect(pack.status).toBe(0);
      const tgz = readdirSync(dir).find((name) => name.endsWith('.tgz'));
      expect(tgz).toBeTruthy();
      const listing = spawnSync('tar', ['-tzf', path.join(dir, tgz as string)], { encoding: 'utf8' });
      expect(listing.stdout).toContain('package/lib/packet-body.mjs');
      expect(listing.stdout).toContain('package/lib/cloud_line.py');
      spawnSync('tar', ['-xzf', path.join(dir, tgz as string), '-C', dir], { encoding: 'utf8' });
      const notes = path.join(dir, 'notes.md');
      writeFileSync(notes, '## turn\n- shipped org/app#12\n');
      const gate = spawnSync(process.execPath, [path.join(dir, 'package', 'lib', 'exit-gate.mjs'), notes], {
        encoding: 'utf8',
      });
      expect(gate.status).toBe(0);
      expect(gate.stderr).not.toContain('packet-body');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
