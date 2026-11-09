import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cli = fileURLToPath(new URL('../../../dist/cli/index.js', import.meta.url));

describe('--help Quick Start', () => {
  it('matches the README install path', () => {
    const ran = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
    const text = `${ran.stdout}\n${ran.stderr}`;
    expect(ran.status).toBe(0);
    expect(text).toContain('npm install 0xray');
    expect(text).toContain('npm install ./0xray-<file>.tgz');
    expect(text).toContain('git init');
    expect(text).toContain('npx 0xray wear');
    expect(text).toContain('npx 0xray setup --git-hooks');
    expect(text).toContain('npx 0xray inspect --skip-live');
    expect(text).not.toContain('Install: npx 0xray install');
  });
});
