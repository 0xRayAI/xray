import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REQUIRED_PACK_PATHS } from '../../../scripts/foundry/assert-packed-dist-cli.mjs';
import { execFileSync } from 'node:child_process';
import {
  CONSUMER_WEAR_PATHS,
  HOOKS_SKIPPED_DETAIL,
  VALIDATE_PACK_PATHS,
  collectValidateReport,
} from '../../cli/commands/validate.js';

function touch(filePath: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, '{}\n');
}

describe('validate command — consumer wear, not leftover init.sh', () => {
  it('keeps VALIDATE_PACK_PATHS in lockstep with the pack gate', () => {
    expect([...VALIDATE_PACK_PATHS].sort()).toEqual([...REQUIRED_PACK_PATHS].sort());
  });

  it('fails a bare directory with no 0xray package', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-empty-'));
    const report = collectValidateReport(dir);
    expect(report.ok).toBe(false);
    expect(report.checks[0]?.id).toBe('package');
  });

  it('fails a consumer that has the package but no wear files', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-bare-'));
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.0.15"}\n');
    for (const rel of VALIDATE_PACK_PATHS) {
      touch(path.join(pkg, rel));
    }
    const report = collectValidateReport(dir);
    expect(report.consumer).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === 'pack-paths')?.ok).toBe(true);
    expect(report.checks.find((c) => c.id === 'consumer-wear')?.ok).toBe(false);
  });

  it('passes a consumer with pack paths, wear, mill plant, and repertoire', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-wear-'));
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.0.15"}\n');
    for (const rel of VALIDATE_PACK_PATHS) {
      touch(path.join(pkg, rel));
    }
    for (const rel of CONSUMER_WEAR_PATHS) {
      touch(path.join(dir, rel));
    }
    touch(path.join(dir, '.opencode', 'skills', 'mill', 'SKILL.md'));
    touch(path.join(dir, '.opencode', 'skills', 'inspect', 'SKILL.md'));
    touch(path.join(pkg, 'vendor', '@0xray', 'repertoire', 'package.json'));
    const report = collectValidateReport(dir);
    expect(report.ok).toBe(true);
    expect(report.checks.every((c) => c.ok)).toBe(true);
  });

  it('fails wear when Station Durable still says Hold npm', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-hold-'));
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.0.15"}\n');
    for (const rel of VALIDATE_PACK_PATHS) {
      touch(path.join(pkg, rel));
    }
    for (const rel of CONSUMER_WEAR_PATHS) {
      touch(path.join(dir, rel));
    }
    touch(path.join(dir, '.opencode', 'skills', 'mill', 'SKILL.md'));
    touch(path.join(dir, '.opencode', 'skills', 'inspect', 'SKILL.md'));
    touch(path.join(pkg, 'vendor', '@0xray', 'repertoire', 'package.json'));
    mkdirSync(path.join(dir, '.xray', 'state'), { recursive: true });
    writeFileSync(
      path.join(dir, '.xray', 'state', 'STATION.md'),
      ['# Station', '', '## Durable', 'Same cloud. Same critic. Hold npm.', ''].join('\n'),
    );
    const report = collectValidateReport(dir);
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.id === 'durable-hold')?.ok).toBe(false);
  });

  it('skips the three cursor hook paths when the folder is not a git work tree', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-nogit-'));
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.1.1"}\n');
    for (const rel of VALIDATE_PACK_PATHS) touch(path.join(pkg, rel));
    for (const rel of CONSUMER_WEAR_PATHS) {
      if (rel.startsWith('.cursor/')) continue;
      touch(path.join(dir, rel));
    }
    touch(path.join(dir, '.opencode', 'skills', 'mill', 'SKILL.md'));
    touch(path.join(dir, '.opencode', 'skills', 'inspect', 'SKILL.md'));
    touch(path.join(pkg, 'vendor', '@0xray', 'repertoire', 'package.json'));
    const report = collectValidateReport(dir);
    expect(report.ok).toBe(true);
    const wear = report.checks.find((c) => c.id === 'consumer-wear');
    expect(wear?.ok).toBe(true);
    expect(wear?.detail).toContain(HOOKS_SKIPPED_DETAIL);
    expect(report.checks.map((c) => c.id)).toEqual([
      'package',
      'pack-paths',
      'consumer-wear',
      'plant',
      'skill-bodies',
      'repertoire',
      'durable-hold',
    ]);
  });

  it('still requires the three cursor hook paths in a git work tree', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-git-'));
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.1.1"}\n');
    for (const rel of VALIDATE_PACK_PATHS) touch(path.join(pkg, rel));
    for (const rel of CONSUMER_WEAR_PATHS) {
      if (rel.startsWith('.cursor/')) continue;
      touch(path.join(dir, rel));
    }
    touch(path.join(dir, '.opencode', 'skills', 'mill', 'SKILL.md'));
    touch(path.join(dir, '.opencode', 'skills', 'inspect', 'SKILL.md'));
    touch(path.join(pkg, 'vendor', '@0xray', 'repertoire', 'package.json'));
    const report = collectValidateReport(dir);
    expect(report.ok).toBe(false);
    const wear = report.checks.find((c) => c.id === 'consumer-wear');
    expect(wear?.ok).toBe(false);
    expect(wear?.detail).toContain('.cursor/hooks.json');
    expect(wear?.detail).not.toContain(HOOKS_SKIPPED_DETAIL);
  });

  it('checks the fastened plant instead of mill and inspect', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), '0xray-validate-sound-'));
    const pkg = path.join(dir, 'node_modules', '0xray');
    writeFileSync(path.join(dir, 'package.json'), '{"name":"consumer"}\n');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, 'package.json'), '{"name":"0xray","version":"4.1.1"}\n');
    for (const rel of VALIDATE_PACK_PATHS) touch(path.join(pkg, rel));
    for (const rel of CONSUMER_WEAR_PATHS) touch(path.join(dir, rel));
    writeFileSync(
      path.join(dir, 'foundry.json'),
      `${JSON.stringify({ plant: 'sound' })}\n`,
    );
    for (const name of ['sound', 'sound-inspect', 'sound-mixer']) {
      touch(path.join(dir, '.opencode', 'skills', name, 'SKILL.md'));
    }
    touch(path.join(pkg, 'vendor', '@0xray', 'repertoire', 'package.json'));
    const report = collectValidateReport(dir);
    const plant = report.checks.find((c) => c.id === 'plant');
    expect(plant?.ok).toBe(true);
    expect(plant?.detail).toContain('sound');
    expect(plant?.detail).not.toContain('missing plant');
  });
});
