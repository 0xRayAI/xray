import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { runPostinstall } = require(path.join(repoRoot, 'scripts/node/postinstall.cjs')) as {
  runPostinstall: (packageRoot: string, targetDir: string, log?: () => void) => void;
};
const { setupProjectBridges } = require(path.join(repoRoot, 'scripts/node/install-bridges.cjs')) as {
  setupProjectBridges: (opts: {
    packageRoot: string;
    targetDir: string;
    gitHooks?: boolean;
    log?: () => void;
  }) => void;
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

function fileLeaves(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs);
      const st = lstatSync(abs);
      if (st.isSymbolicLink() || !st.isDirectory()) out.push(rel.split(path.sep).join('/'));
      else walk(abs);
    }
  };
  walk(root);
  return out.sort();
}

function assertOnlyRepertoireLinkAdded(project: string, before: string[]) {
  const added = fileLeaves(project).filter((rel) => !before.includes(rel));
  expect(added).toEqual(['node_modules/@0xray/repertoire']);
  const dest = path.join(project, 'node_modules', '@0xray', 'repertoire');
  const link = readlinkSync(dest);
  expect(path.isAbsolute(link)).toBe(false);
  expect(link).toBe(
    path.relative(path.dirname(dest), path.join(repoRoot, 'vendor', '@0xray', 'repertoire')),
  );
}

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
      const leavesBefore = fileLeaves(project);
      runPostinstall(repoRoot, project, () => {});
      assertOnlyRepertoireLinkAdded(project, leavesBefore);
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
      const leavesBefore = fileLeaves(project);
      const hooks = readFileSync(path.join(project, '.cursor', 'hooks.json'));
      const ran = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/node/postinstall.cjs')], {
        cwd: project,
        encoding: 'utf8',
        env: { ...process.env, INIT_CWD: project },
      });
      expect(ran.trim().split('\n')).toEqual(['Run `npx 0xray wear`']);
      assertOnlyRepertoireLinkAdded(project, leavesBefore);
      expect(readFileSync(path.join(project, '.cursor', 'hooks.json'))).toEqual(hooks);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('postinstall in a fresh repo adds only the vendored repertoire link', () => {
    const project = mkdtempSync(path.join(homedir(), 'xray-host-install-fresh-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      writeRel(project, 'package.json', `${JSON.stringify({ name: 'acme' })}\n`);
      execFileSync('git', ['add', '--', 'package.json'], { cwd: project, stdio: 'ignore' });
      execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '-m', 'init'], {
        cwd: project,
        stdio: 'ignore',
      });
      const leavesBefore = fileLeaves(project);
      const statusBefore = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      runPostinstall(repoRoot, project, () => {});
      assertOnlyRepertoireLinkAdded(project, leavesBefore);
      const porcelain = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: project,
        encoding: 'utf8',
      });
      const extra = porcelain
        .split('\n')
        .filter((line) => line.trim() !== '' && !statusBefore.split('\n').includes(line));
      expect(extra).toEqual(['?? node_modules/']);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

function gitHookBytes(root: string): Map<string, Buffer> {
  const dir = path.join(root, '.git', 'hooks');
  const out = new Map<string, Buffer>();
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isFile()) out.set(name, readFileSync(file));
  }
  return out;
}

describe('setup installs bridges without git hooks unless asked', () => {
  it('setup without the flag leaves .git/hooks unchanged and writes .mcp.json', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-setup-bridges-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      const before = gitHookBytes(project);
      setupProjectBridges({ packageRoot: repoRoot, targetDir: project, log: () => {} });
      const after = gitHookBytes(project);
      expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [name, bytes] of before) {
        expect(after.get(name)).toEqual(bytes);
      }
      expect(existsSync(path.join(project, '.git', 'hooks', 'pre-commit'))).toBe(false);
      const mcp = JSON.parse(readFileSync(path.join(project, '.mcp.json'), 'utf8')) as {
        mcpServers?: Record<string, unknown>;
      };
      expect(Object.keys(mcp.mcpServers || {}).length).toBeGreaterThan(0);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('setup with --git-hooks installs the hooks', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-setup-githooks-'));
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      expect(existsSync(path.join(project, '.git', 'hooks', 'pre-commit'))).toBe(false);
      setupProjectBridges({ packageRoot: repoRoot, targetDir: project, gitHooks: true, log: () => {} });
      const hook = readFileSync(path.join(project, '.git', 'hooks', 'pre-commit'), 'utf8');
      expect(hook).toContain('0xRay');
      expect(existsSync(path.join(project, '.mcp.json'))).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('setup in a directory with no git exits non-zero and changes nothing', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-setup-nogit-'));
    const script = path.join(repoRoot, 'scripts/node/install-bridges.cjs');
    try {
      writeFileSync(path.join(project, 'keep.txt'), 'stay\n');
      const ran = spawnSync(process.execPath, [script, 'setup'], { cwd: project, encoding: 'utf8' });
      expect(ran.status).not.toBe(0);
      expect(readdirSync(project)).toEqual(['keep.txt']);
      expect(readFileSync(path.join(project, 'keep.txt'), 'utf8')).toBe('stay\n');
      expect(existsSync(path.join(project, '.mcp.json'))).toBe(false);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it('setup refuses a work tree that points elsewhere and writes nothing', () => {
    const parent = mkdtempSync(path.join(tmpdir(), 'xray-setup-parent-'));
    const child = path.join(parent, 'nested');
    const script = path.join(repoRoot, 'scripts/node/install-bridges.cjs');
    try {
      execFileSync('git', ['init'], { cwd: parent, stdio: 'ignore' });
      mkdirSync(child);
      writeFileSync(path.join(child, 'keep.txt'), 'stay\n');
      const ran = spawnSync(process.execPath, [script, 'setup'], { cwd: child, encoding: 'utf8' });
      expect(ran.status).not.toBe(0);
      expect(ran.stderr).toContain('work tree points elsewhere');
      expect(readdirSync(child)).toEqual(['keep.txt']);
      expect(existsSync(path.join(child, '.mcp.json'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});
