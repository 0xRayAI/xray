import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatGogglesStatus, probeGoggles } from '../../cli/goggles-status.js';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../../..');

function tempCwd(): string {
  return mkdtempSync(join(tmpdir(), 'goggles-status-'));
}

describe('goggles status probe', () => {
  it('a blank lens is a match and a missing organ is not drift', () => {
    const cwd = tempCwd();
    mkdirSync(join(cwd, '.xray', 'state'), { recursive: true });
    writeFileSync(join(cwd, '.xray', 'state', 'LENS.md'), 'quiet (match)\n');
    const worn = probeGoggles(repoRoot, cwd);
    expect(worn.organPresent).toBe(true);
    expect(worn.organLine).toBe('Goggles: worn');
    expect(worn.kind0Quiet).toBe(true);
    expect(worn.kind0Label).toBe('quiet (match)');
    expect(formatGogglesStatus(worn).join('\n')).toBe(
      ['Goggles: worn', 'Kind 0: quiet (match)'].join('\n'),
    );

    const empty = tempCwd();
    const missing = probeGoggles(empty, empty);
    expect(missing.organPresent).toBe(false);
    expect(missing.organLine).toBe('Goggles: not found');
    expect(missing.kind0Label).toBe('(no LENS yet)');
    expect(missing.kind0Text).not.toContain('Drift');
    rmSync(cwd, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  });

  it('drift stays on its own line when the organ is missing', () => {
    const cwd = tempCwd();
    mkdirSync(join(cwd, '.xray', 'state'), { recursive: true });
    writeFileSync(join(cwd, '.xray', 'state', 'LENS.md'), 'Actuality. Drift: worn is not the map.\n');
    const probe = probeGoggles(cwd, cwd);
    expect(probe.organLine).toBe('Goggles: not found');
    expect(probe.kind0Label).toBe('Actuality. Drift: worn is not the map.');
    expect(probe.kind0Quiet).toBe(false);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('a map that is not the six is drift when no lens has been written', () => {
    const root = tempCwd();
    const rel = join('src', 'integrations', 'hooks');
    mkdirSync(join(root, rel), { recursive: true });
    writeFileSync(join(root, rel, 'goggles-pipeline.mjs'), '// organ\n');
    writeFileSync(join(root, rel, 'goggles-planes.json'), `${JSON.stringify({ planes: ['ground'] })}\n`);
    const probe = probeGoggles(root, root);
    expect(probe.organLine).toBe('Goggles: worn');
    expect(probe.kind0Label).toBe('Actuality. Drift: worn is not the map.');
    expect(probe.kind0Label).not.toContain('ground');
    rmSync(root, { recursive: true, force: true });
  });

  it('status and health both call the same probe', () => {
    const status = readFileSync(join(repoRoot, 'src/cli/commands/status.ts'), 'utf8');
    const health = readFileSync(join(repoRoot, 'src/cli/index.ts'), 'utf8');
    expect(status).toContain('formatGogglesStatus(report.goggles)');
    expect(status).toContain('probeGoggles(packageRoot, cwd)');
    expect(health).toContain('formatGogglesStatus(probeGoggles(packageRoot, process.cwd()))');
    expect(health).toContain('.command("look")');
    expect(health).toContain('Kind 0 is quiet on a match');
    expect(health).not.toContain('Glimpse every plane');
  });
});
