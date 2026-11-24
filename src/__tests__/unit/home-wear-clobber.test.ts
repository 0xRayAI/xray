import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');

function seedHome(home: string, withAgent: boolean) {
  mkdirSync(path.join(home, '.grok', 'plugins', '0xray'), { recursive: true });
  writeFileSync(path.join(home, '.grok', 'plugins', '0xray', 'SENTINEL'), 'keep-this-plugin\n');
  mkdirSync(path.join(home, '.grok', 'hooks'), { recursive: true });
  writeFileSync(
    path.join(home, '.grok', 'hooks', '0xray.json'),
    `${JSON.stringify({
      hooks: {
        PreToolUse: [{
          hooks: [{
            type: 'command',
            command: 'echo old-hook',
            env: { LIVE_URL: 'https://board.example', XRAY_SEAT: 'arch1-cloud' },
          }],
        }],
      },
    }, null, 2)}\n`,
  );
  writeFileSync(path.join(home, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
  if (!withAgent) return;
  mkdirSync(path.join(home, '.opencode', 'agents'), { recursive: true });
  writeFileSync(
    path.join(home, '.opencode', 'agents', 'analyzer.yml'),
    'description: seat-local-analyzer-not-a-shipped-mirror\n',
  );
}

function wear(home: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home, FOUNDRY_MACHINE_HOME: home };
  delete env.XRAY_MACHINE_BRIDGES;
  return spawnSync(process.execPath, [wearScript, home], { cwd: home, encoding: 'utf8', env });
}

function hookEnv(home: string): { LIVE_URL?: string; XRAY_SEAT?: string; command?: string } {
  const raw = JSON.parse(readFileSync(path.join(home, '.grok', 'hooks', '0xray.json'), 'utf8')) as {
    hooks?: { PreToolUse?: Array<{ hooks?: Array<{ command?: string; env?: { LIVE_URL?: string; XRAY_SEAT?: string } }> }> };
  };
  const hook = raw.hooks?.PreToolUse?.[0]?.hooks?.[0] || {};
  return { LIVE_URL: hook.env?.LIVE_URL, XRAY_SEAT: hook.env?.XRAY_SEAT, command: hook.command };
}

describe('wear at the machine home', () => {
  it('throws the costume check before writing when a seat agent is not a shipped mirror', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'xray-home-wear-'));
    try {
      seedHome(home, true);
      const sentinel = readFileSync(path.join(home, '.grok', 'plugins', '0xray', 'SENTINEL'));
      const hooks = readFileSync(path.join(home, '.grok', 'hooks', '0xray.json'));
      const ran = wear(home);
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(1);
      expect(ran.stderr).toContain('foundry-inspect: costume dump without foundry.json "costume": true');
      expect(ran.stderr).toContain('analyzer.yml');
      expect(readFileSync(path.join(home, '.grok', 'plugins', '0xray', 'SENTINEL'))).toEqual(sentinel);
      expect(readdirSync(path.join(home, '.grok', 'plugins', '0xray'))).toEqual(['SENTINEL']);
      expect(readFileSync(path.join(home, '.grok', 'hooks', '0xray.json'))).toEqual(hooks);
      expect(existsSync(path.join(home, '.mcp.json'))).toBe(false);
      expect(existsSync(path.join(home, '.xray'))).toBe(false);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('keeps LIVE_URL and XRAY_SEAT and does not replace the machine plugin', () => {
    const home = mkdtempSync(path.join(tmpdir(), 'xray-home-wear-'));
    try {
      seedHome(home, false);
      const sentinel = readFileSync(path.join(home, '.grok', 'plugins', '0xray', 'SENTINEL'));
      const ran = wear(home);
      expect(ran.status, `${ran.stdout}\n${ran.stderr}`).toBe(0);
      expect(readFileSync(path.join(home, '.grok', 'plugins', '0xray', 'SENTINEL'))).toEqual(sentinel);
      expect(readdirSync(path.join(home, '.grok', 'plugins', '0xray'))).toEqual(['SENTINEL']);
      const env = hookEnv(home);
      expect(env.LIVE_URL).toBe('https://board.example');
      expect(env.XRAY_SEAT).toBe('arch1-cloud');
      expect(env.command).toContain('run-grok-hook.mjs');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
