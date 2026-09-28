import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { runPostinstall } = require(path.join(repoRoot, 'scripts/node/postinstall.cjs')) as {
  runPostinstall: (packageRoot: string, targetDir: string, log?: () => void) => void;
};

const GITIGNORE = `node_modules/
dist/
logs/
.strray/
.grok/
.opencode/
opencode.json
*.log

# Core config tracked; runtime state only
.xray/state/

# Generated suit artifacts (postinstall) — not core SSOT
.mcp.json
AGENTS.md
SKILLS.md
.hermes/
.opencode/agents/
.opencode/commands/
.opencode/workflows/
.opencode/codex.codex
.opencode/enforcer-config.json
.opencode/skills/
.opencode/scripts/
.opencode/logs/
.opencode/validation/
.opencode/triage/
logs/framework/
`;

const TRACKED = [
  '.gitignore',
  '.mcp.json',
  'AGENTS.md',
  'package.json',
  '.xray/codex.json',
  '.xray/features.json',
  '.xray/features.schema.json',
  '.xray/config.json',
  '.xray/config/openclaw.json',
  '.cursor/hooks.json',
  '.cursor/hooks/pre-compact.sh',
];

function writeRel(root: string, rel: string, body: string) {
  const dest = path.join(root, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, body);
}

describe('host install leaves tracked files alone', () => {
  it('git status --porcelain is empty after postinstall on a committed consumer tree', () => {
    const project = mkdtempSync(path.join(homedir(), 'xray-host-install-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      writeRel(project, '.gitignore', GITIGNORE);
      writeRel(
        project,
        '.mcp.json',
        `${JSON.stringify({ mcpServers: { repertoire: { command: 'node', args: ['dist/mcp/server.js'] } } }, null, 2)}\n`,
      );
      writeRel(project, 'AGENTS.md', '# Consumer agents\n\nHand edited.\n');
      writeRel(project, 'package.json', `${JSON.stringify({ name: 'repertoire', version: '0.0.0' })}\n`);
      writeRel(project, '.xray/codex.json', `${JSON.stringify({ note: 'consumer-codex' }, null, 2)}\n`);
      writeRel(project, '.xray/features.json', `${JSON.stringify({ version: '0.0.0', note: 'consumer' }, null, 2)}\n`);
      writeRel(project, '.xray/features.schema.json', `${JSON.stringify({ note: 'consumer-schema' }, null, 2)}\n`);
      writeRel(project, '.xray/config.json', `${JSON.stringify({ note: 'consumer-config' }, null, 2)}\n`);
      writeRel(
        project,
        '.xray/config/openclaw.json',
        `${JSON.stringify({ enabled: true, xrayRoot: '/Users/blaze/dev/repertoire' }, null, 2)}\n`,
      );
      writeRel(
        project,
        '.cursor/hooks.json',
        `${JSON.stringify({ version: 1, hooks: { preCompact: [{ command: '.cursor/hooks/pre-compact.sh' }] } }, null, 2)}\n`,
      );
      writeRel(project, '.cursor/hooks/pre-compact.sh', '#!/bin/sh\necho user-pre-compact\n');
      execFileSync('git', ['add', '-f', '--', ...TRACKED], { cwd: project, stdio: 'ignore' });
      execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', 'consumer files'], {
        cwd: project,
        stdio: 'ignore',
      });
      const before = new Map(TRACKED.map((rel) => [rel, readFileSync(path.join(project, rel))]));
      const statusBefore = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      runPostinstall(repoRoot, project, () => {});
      const porcelain = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      expect(porcelain).toBe(statusBefore);
      expect(porcelain).toBe('');
      for (const [rel, bytes] of before) {
        expect(readFileSync(path.join(project, rel))).toEqual(bytes);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('a bad hooks.json does not fail postinstall and changes nothing', () => {
    const project = mkdtempSync(path.join(homedir(), 'xray-host-install-bad-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      writeRel(project, 'package.json', `${JSON.stringify({ name: 'acme' })}\n`);
      writeRel(project, '.cursor/hooks.json', '{ "hooks": { "hooks": \n');
      execFileSync('git', ['add', '-f', '--', 'package.json', '.cursor/hooks.json'], {
        cwd: project,
        stdio: 'ignore',
      });
      execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', 'bad hooks'], {
        cwd: project,
        stdio: 'ignore',
      });
      const before = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      const hooks = readFileSync(path.join(project, '.cursor', 'hooks.json'));
      const ran = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/node/postinstall.cjs')], {
        cwd: project,
        encoding: 'utf8',
        env: { ...process.env, INIT_CWD: project },
      });
      expect(ran.trim().split('\n')).toEqual(['Run `npx 0xray wear`']);
      expect(
        execFileSync('git', ['status', '--porcelain', '--ignored'], { cwd: project, encoding: 'utf8' }),
      ).toBe(before);
      expect(readFileSync(path.join(project, '.cursor', 'hooks.json'))).toEqual(hooks);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('postinstall in a fresh repo changes zero tracked or untracked files', () => {
    const project = mkdtempSync(path.join(homedir(), 'xray-host-install-fresh-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      writeRel(project, 'package.json', `${JSON.stringify({ name: 'acme' })}\n`);
      execFileSync('git', ['add', '--', 'package.json'], { cwd: project, stdio: 'ignore' });
      execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', 'init'], {
        cwd: project,
        stdio: 'ignore',
      });
      const before = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      runPostinstall(repoRoot, project, () => {});
      expect(
        execFileSync('git', ['status', '--porcelain', '--ignored'], { cwd: project, encoding: 'utf8' }),
      ).toBe(before);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
