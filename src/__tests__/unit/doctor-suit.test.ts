import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../cli/commands/doctor.js';

function skill(dir: string, name: string): void {
  const file = path.join(dir, '.opencode', 'skills', name, 'SKILL.md');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, '# skill\n');
}

describe('doctor wear proof and goggles', () => {
  it('does not treat cursor-hook-wear meta.json as the only worn proof', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-doctor-meta-'));
    mkdirSync(path.join(dir, '.xray', 'state', 'cursor-hook-wear'), { recursive: true });
    writeFileSync(path.join(dir, '.xray', 'state', 'cursor-hook-wear', 'meta.json'), '{}\n');
    const metaOnly = runDoctor(dir);
    expect(metaOnly.text).toContain('not worn');
    expect(metaOnly.text).not.toContain('worn (no git: hooks skipped)');
    expect(metaOnly.exitCode).toBe(0);

    skill(dir, 'mill');
    const millOnly = runDoctor(dir);
    expect(millOnly.text).toContain('not worn');
  });

  it('counts a non-git sound seat as worn without a mill skill', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-doctor-sound-'));
    mkdirSync(path.join(dir, '.xray'), { recursive: true });
    writeFileSync(path.join(dir, '.xray', 'features.json'), '{}\n');
    writeFileSync(path.join(dir, 'foundry.json'), `${JSON.stringify({ plant: 'sound' })}\n`);
    for (const name of ['sound', 'sound-inspect', 'sound-mixer']) skill(dir, name);
    const result = runDoctor(dir);
    expect(result.text).toContain('worn (no git: hooks skipped)');
    expect(result.text).not.toContain('not worn');
    expect(result.exitCode).toBe(0);
  });

  it('fails when goggles.enabled is false', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-doctor-goggles-'));
    mkdirSync(path.join(dir, '.xray'), { recursive: true });
    writeFileSync(
      path.join(dir, '.xray', 'features.json'),
      `${JSON.stringify({ goggles: { enabled: false } })}\n`,
    );
    skill(dir, 'mill');
    skill(dir, 'inspect');
    const off = runDoctor(dir);
    expect(off.exitCode).toBe(1);
    expect(off.text).toContain('goggles off — the suit keeps goggles on');

    writeFileSync(path.join(dir, '.xray', 'features.json'), `${JSON.stringify({ goggles: { enabled: true } })}\n`);
    const on = runDoctor(dir);
    expect(on.exitCode).toBe(0);
    expect(on.text).not.toContain('goggles off');
  });

  it('rejects Node below the patched 24.22.1 LTS', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-doctor-node-'));
    const stale = runDoctor(dir, 'v24.10.0');
    expect(stale.text).toContain('Node.js version too old');
    expect(stale.text).toContain('Upgrade to Node.js 24.22.1+');
    const patched = runDoctor(dir, 'v24.22.1');
    expect(patched.text).toContain('✅ Node.js version: v24.22.1');
    expect(patched.text).not.toContain('Node.js version too old');
  });

  it('says worn inside a git work tree', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-doctor-git-'));
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    mkdirSync(path.join(dir, '.xray'), { recursive: true });
    writeFileSync(path.join(dir, '.xray', 'features.json'), '{}\n');
    skill(dir, 'mill');
    skill(dir, 'inspect');
    const result = runDoctor(dir);
    expect(result.text).toMatch(/^worn$/m);
    expect(result.text).not.toContain('not worn');
    expect(result.exitCode).toBe(0);
  });
});
