import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const cli = path.join(root, 'dist/cli/index.js');
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  version: string;
};

function runCli(flag: string) {
  if (!existsSync(cli)) {
    throw new Error('dist/cli/index.js missing — run npm run build');
  }
  return spawnSync(process.execPath, [cli, flag], {
    encoding: 'utf8',
    timeout: 15000,
  });
}

describe('0xray version', () => {
  for (const flag of ['-V', '--version'] as const) {
    it(`${flag} prints the package version without a CommanderError stack`, () => {
      const result = runCli(flag);
      const combined = `${result.stdout}${result.stderr}`;
      expect(result.status, combined).toBe(0);
      expect(result.stdout.trim()).toBe(version);
      expect(combined).not.toContain('CommanderError');
      expect(combined).not.toContain('_exitCallback');
    });
  }
});
