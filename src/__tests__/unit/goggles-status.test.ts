import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatGogglesStatus, probeGoggles } from '../../cli/goggles-status.js';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '../../..');

describe('goggles status probe', () => {
  it('names the organ and ignores the lens file', () => {
    const worn = probeGoggles(repoRoot, repoRoot);
    expect(worn.organPresent).toBe(true);
    expect(worn.organLine).toBe('Goggles: worn');
    expect(formatGogglesStatus(worn)).toEqual(['Goggles: worn']);

    const empty = mkdtempSync(join(tmpdir(), 'goggles-status-'));
    const missing = probeGoggles(empty, empty);
    expect(missing.organPresent).toBe(false);
    expect(missing.organLine).toBe('Goggles: not found');
    expect(formatGogglesStatus(missing)).toEqual(['Goggles: not found']);
    rmSync(empty, { recursive: true, force: true });
  });

  it('status and health both call the same probe', () => {
    const status = readFileSync(join(repoRoot, 'src/cli/commands/status.ts'), 'utf8');
    const health = readFileSync(join(repoRoot, 'src/cli/index.ts'), 'utf8');
    expect(status).toContain('formatGogglesStatus(report.goggles)');
    expect(status).toContain('probeGoggles(packageRoot, cwd)');
    expect(health).toContain('formatGogglesStatus(probeGoggles(packageRoot, process.cwd()))');
    expect(health).toContain('.command("look")');
    expect(health).toContain('One outer is a reading. digest and triage return a card.');
    expect(health).not.toContain('Kind 0');
    expect(health).not.toContain('Glimpse every plane');
  });
});
