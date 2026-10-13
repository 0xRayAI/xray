import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gateCRefusal, provePublishedRelease } from '../../../scripts/foundry/release-gate.mjs';

describe('release gate C and D', () => {
  it('refuses to skip the docs check', () => {
    expect(gateCRefusal(['node', 'release-gate.mjs', '--skip-docs'])).toMatch(/Gate C cannot be skipped/);
    expect(gateCRefusal(['node', 'release-gate.mjs'])).toBeNull();
  });

  it('requires npm, an annotated tag at HEAD, and a GitHub Release', () => {
    const complete = {
      version: '9.9.9',
      listed: true,
      tagAnnotated: true,
      tagMatchesHead: true,
      releaseUrl: 'https://github.com/0xRayAI/xray/releases/tag/v9.9.9',
    };
    expect(provePublishedRelease(complete)).toEqual([]);
    const missing = provePublishedRelease({
      ...complete,
      listed: false,
      tagAnnotated: false,
      tagMatchesHead: false,
      releaseUrl: '',
    });
    expect(missing).toHaveLength(4);
  });

  it('exits non-zero when the docs check is skipped', () => {
    const script = path.join(process.cwd(), 'scripts/foundry/release-gate.mjs');
    const result = spawnSync(process.execPath, [script, '--skip-docs'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toMatch(/Gate C cannot be skipped/);
  });
});
