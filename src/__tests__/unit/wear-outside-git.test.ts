import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const wearScript = path.join(repoRoot, 'scripts/node/wear-cursor-hooks.cjs');
const setupScript = path.join(repoRoot, 'scripts/node/install-bridges.cjs');
const postinstallScript = path.join(repoRoot, 'scripts/node/postinstall.cjs');
const SKIPPED = 'cursor-wear: hooks skipped because this folder is not a git checkout';

/** 4.0.28 non-git `npm i` project files, minus Cursor hooks. */
const SUIT_WITHOUT_CURSOR_HOOKS = [
  '.gitignore',
  '.grok/hooks/0xray.json',
  '.grok/plugins/0xray/.mcp.json',
  '.grok/plugins/0xray/hooks/hooks.json',
  '.grok/plugins/0xray/skills/inspect/SKILL.md',
  '.grok/plugins/0xray/skills/mill/SKILL.md',
  '.hermes/plugins/xray-hermes/.mcp.json',
  '.hermes/plugins/xray-hermes/__init__.py',
  '.hermes/plugins/xray-hermes/__pycache__/__init__.cpython-313.pyc',
  '.hermes/plugins/xray-hermes/__pycache__/schemas.cpython-313.pyc',
  '.hermes/plugins/xray-hermes/__pycache__/tools.cpython-313.pyc',
  '.hermes/plugins/xray-hermes/after-install.md',
  '.hermes/plugins/xray-hermes/bridge.mjs',
  '.hermes/plugins/xray-hermes/conftest.py',
  '.hermes/plugins/xray-hermes/logs/framework/routing-outcomes.json',
  '.hermes/plugins/xray-hermes/plugin.yaml',
  '.hermes/plugins/xray-hermes/schemas.py',
  '.hermes/plugins/xray-hermes/scripts/helpers/find-project-root.mjs',
  '.hermes/plugins/xray-hermes/skills/inspect/SKILL.md',
  '.hermes/plugins/xray-hermes/skills/mill/SKILL.md',
  '.hermes/plugins/xray-hermes/test_plugin.py',
  '.hermes/plugins/xray-hermes/tools.py',
  '.mcp.json',
  '.openclaw/skills/inspect/SKILL.md',
  '.openclaw/skills/mill/SKILL.md',
  '.opencode/agents/inspect.yml',
  '.opencode/agents/mill.yml',
  '.opencode/package.json',
  '.opencode/plugin/xray-codex-injection.js',
  '.opencode/skills/inspect/SKILL.md',
  '.opencode/skills/mill/SKILL.md',
  '.xray/codex.json',
  '.xray/config.json',
  '.xray/config/openclaw.json',
  '.xray/features.json',
  '.xray/features.schema.json',
  '.xray/foundry-inventory.json',
  'AGENTS.md',
  'opencode.json',
];

/** 4.0.28 isolated-HOME delta, excluding npm's own cache. */
const HOME_FROM_428 = [
  '.grok/plugins/0xray/.mcp.json',
  '.grok/plugins/0xray/hooks/hooks.json',
];

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules') continue;
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) {
        out.push(rel);
        continue;
      }
      if (st.isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

function suitWithSkillsAndLinks(): string[] {
  const skills = readdirSync(path.join(repoRoot, 'src/skills'))
    .filter((name) => existsSync(path.join(repoRoot, 'src/skills', name, 'SKILL.md')))
    .map((name) => `.opencode/skills/${name}/SKILL.md`);
  return [...new Set([...SUIT_WITHOUT_CURSOR_HOOKS, ...skills, 'dist', 'scripts'])].sort();
}

function skillLinkStdout(): string {
  const copied = readdirSync(path.join(repoRoot, 'src/skills')).filter((name) =>
    existsSync(path.join(repoRoot, 'src/skills', name, 'SKILL.md')),
  ).length;
  return [
    `✅ Skills: ${copied} updated, 0 community skills preserved`,
    '✅ Scripts symlink: created',
    '✅ Dist symlink: created',
    '',
  ].join('\n');
}

function freshHome(): string {
  return mkdtempSync(path.join(tmpdir(), 'xray-wear-home-'));
}

function runNode(script: string, args: string[], cwd: string, home: string) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

describe('wear and setup outside a git checkout', () => {
  it('wears the 4.0.28 suit minus cursor hooks and warns once', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-wear-nogit-'));
    const home = freshHome();
    const homeBefore = listFiles(home);
    try {
      writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      writeFileSync(path.join(project, 'keep.txt'), 'stay\n');
      const ran = runNode(wearScript, [project], project, home);
      expect(ran.status).toBe(0);
      expect(ran.stderr).toBe(`${SKIPPED}\n`);
      expect(ran.stdout).toBe(skillLinkStdout());
      const wrote = listFiles(project).filter((rel) => rel !== 'package.json' && rel !== 'keep.txt');
      expect(wrote).toEqual(suitWithSkillsAndLinks());
      expect(wrote.some((rel) => rel === '.cursor' || rel.startsWith('.cursor/'))).toBe(false);
      expect(existsSync(path.join(project, '.cursor'))).toBe(false);
      expect(readFileSync(path.join(project, 'keep.txt'), 'utf8')).toBe('stay\n');
      const homeAfter = listFiles(home);
      expect(homeBefore).toEqual([]);
      expect(homeAfter.filter((rel) => !homeBefore.includes(rel))).toEqual(HOME_FROM_428);
    } finally {
      rmSync(project, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('setup outside git writes the same suit and the same warning', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-setup-nogit-suit-'));
    const home = freshHome();
    const homeBefore = listFiles(home);
    try {
      writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      const ran = runNode(setupScript, ['setup'], project, home);
      expect(ran.status).toBe(0);
      expect(ran.stderr).toBe(`${SKIPPED}\n`);
      expect(ran.stdout).toBe(`${skillLinkStdout()}setup: wrote .mcp.json and chat bridges\n`);
      const wrote = listFiles(project).filter((rel) => rel !== 'package.json');
      expect(wrote).toEqual(suitWithSkillsAndLinks());
      expect(existsSync(path.join(project, '.cursor'))).toBe(false);
      expect(listFiles(home).filter((rel) => !homeBefore.includes(rel))).toEqual(HOME_FROM_428);
      const again = runNode(wearScript, [project], project, home);
      expect(again.status).toBe(0);
      expect(again.stderr).toBe(`${SKIPPED}\n`);
      expect(listFiles(project).filter((rel) => rel !== 'package.json')).toEqual(suitWithSkillsAndLinks());
    } finally {
      rmSync(project, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('inside a git checkout installs cursor hooks, skill copies, and root links', () => {
    const project = mkdtempSync(path.join(tmpdir(), 'xray-wear-git-'));
    const home = freshHome();
    const homeBefore = listFiles(home);
    try {
      execFileSync('git', ['init'], { cwd: project, stdio: 'ignore' });
      writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      const ran = runNode(wearScript, [project], project, home);
      expect(ran.status).toBe(0);
      expect(ran.stderr).toBe('');
      expect(ran.stdout).toBe(skillLinkStdout());
      expect(existsSync(path.join(project, '.cursor', 'hooks.json'))).toBe(true);
      expect(existsSync(path.join(project, '.opencode', 'skills', 'orchestrator', 'SKILL.md'))).toBe(true);
      expect(lstatSync(path.join(project, 'dist')).isSymbolicLink()).toBe(true);
      expect(lstatSync(path.join(project, 'scripts')).isSymbolicLink()).toBe(true);
      expect(existsSync(path.join(project, 'AGENTS.md'))).toBe(false);
      expect(existsSync(path.join(project, '.mcp.json'))).toBe(false);
      expect(existsSync(path.join(project, '.grok'))).toBe(false);
      expect(listFiles(home)).toEqual(homeBefore);
    } finally {
      rmSync(project, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('postinstall tells both git and non-git projects to run wear', () => {
    const gitProject = mkdtempSync(path.join(tmpdir(), 'xray-post-git-'));
    const plainProject = mkdtempSync(path.join(tmpdir(), 'xray-post-plain-'));
    const home = freshHome();
    try {
      execFileSync('git', ['init'], { cwd: gitProject, stdio: 'ignore' });
      writeFileSync(path.join(gitProject, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      writeFileSync(path.join(plainProject, 'package.json'), `${JSON.stringify({ name: 'acme' })}\n`);
      for (const project of [gitProject, plainProject]) {
        const ran = spawnSync(process.execPath, [postinstallScript], {
          cwd: project,
          encoding: 'utf8',
          env: { ...process.env, HOME: home, USERPROFILE: home, INIT_CWD: project },
        });
        expect(ran.status).toBe(0);
        expect(ran.stdout.trim().split('\n')).toEqual(['Run `npx 0xray wear`']);
      }
      const worn = runNode(wearScript, [plainProject], plainProject, home);
      expect(worn.status).toBe(0);
      expect(worn.stderr).toBe(`${SKIPPED}\n`);
      const gitWorn = runNode(wearScript, [gitProject], gitProject, home);
      expect(gitWorn.status).toBe(0);
      expect(gitWorn.stderr).toBe('');
      expect(existsSync(path.join(gitProject, '.cursor', 'hooks.json'))).toBe(true);
    } finally {
      rmSync(gitProject, { recursive: true, force: true });
      rmSync(plainProject, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });
});
