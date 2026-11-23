import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateConstitutionGate, evaluatePreToolGate, rememberCiteRead, shellWritePaths } from '../../nucleus/delegation-gate.js';
import { compareVersions, decideFreshness, describeFreshness, freshnessNeedsRefresh, localResidue } from '../../nucleus/work-freshness.mjs';

describe('Codex 70 freshness', () => {
  it('orders versions', () => {
    expect(compareVersions('4.0.9', '4.0.34')).toBe(-1);
    expect(compareVersions('4.0.34', '4.0.34')).toBe(0);
    expect(compareVersions('4.0.35', '4.0.34')).toBe(1);
  });

  it('blocks edits while the checkout is behind', () => {
    const decision = decideFreshness({ behind: 471, wornSuit: '4.0.34', publishedSuit: '4.0.34' });
    expect(decision.stale).toBe(true);
    expect(decision.reason).toMatch(/Codex 70/);
    expect(decision.reason).toMatch(/471/);
  });

  it('blocks edits when the worn package is older than npm', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: '4.0.9',
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(true);
    expect(decision.reason).toMatch(/4\.0\.9/);
  });

  it('treats this 0xray repo as the package when no install is recorded', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: null,
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(false);
  });

  it('blocks this repo when its version is older than npm', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: null,
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.9',
    });
    expect(decision.stale).toBe(true);
    expect(decision.reason).toMatch(/4\.0\.9/);
  });

  it('allows a current checkout and package', () => {
    const decision = decideFreshness({
      behind: 0,
      wornSuit: '4.0.34',
      publishedSuit: '4.0.34',
      repoName: '0xray',
      repoVersion: '4.0.34',
    });
    expect(decision.stale).toBe(false);
  });

  it('refreshes a missing or hour-old freshness stamp', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-fresh-due-'));
    try {
      expect(freshnessNeedsRefresh(root, 1_700_000_000_000)).toBe(true);
      mkdirSync(join(root, '.xray', 'state'), { recursive: true });
      writeFileSync(join(root, '.xray', 'state', 'freshness.json'), `${JSON.stringify({
        checkedAt: '2026-10-13T17:38:44.449Z',
      })}\n`);
      const checked = Date.parse('2026-10-13T17:38:44.449Z');
      expect(freshnessNeedsRefresh(root, checked + 60 * 60 * 1000 - 1)).toBe(false);
      expect(freshnessNeedsRefresh(root, checked + 60 * 60 * 1000)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a stash so it is compared before a drop', () => {
    const line = describeFreshness({ behind: 0, wornSuit: '4.0.34', publishedSuit: '4.0.34', stashCount: 5 });
    expect(line).toMatch(/5 set aside/);
    expect(line).toMatch(/compare before drop/);
  });
});

function git(cwd: string, args: string[]) {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_TERMINAL_PROMPT: '0',
    },
  });
}

describe('Codex 70 write scope', () => {
  it('denies a write in the stale copy and allows one outside it', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-fresh-scope-'));
    const remote = join(root, 'remote.git');
    const factory = join(root, 'factory');
    const current = join(root, 'current');
    const outside = join(root, 'outside.md');
    const features = { lead_dev_mode: false, auto_chain_delegations: false, no_new_surface: false };
    const ctx = { projectRoot: factory, sessionId: null, features, host: 'grok' as const };
    try {
      git(root, ['init', '--bare', remote]);
      git(root, ['init', '-b', 'main', factory]);
      writeFileSync(join(factory, 'package.json'), `${JSON.stringify({ name: '0xray', version: '4.1.4' })}\n`);
      git(factory, ['add', 'package.json']);
      git(factory, ['commit', '-m', 'init']);
      git(factory, ['remote', 'add', 'origin', remote]);
      git(factory, ['push', 'origin', 'main']);
      git(factory, ['commit', '--allow-empty', '-m', 'ahead']);
      git(factory, ['push', 'origin', 'main']);
      git(factory, ['reset', '--hard', 'HEAD~1']);
      git(factory, ['worktree', 'add', current, 'origin/main']);
      writeFileSync(outside, 'note\n');

      const inside = evaluateConstitutionGate('search_replace', { file_path: join(factory, 'package.json'), new_string: '{}' }, ctx);
      expect(inside.allow).toBe(false);
      if (!inside.allow) {
        expect(inside.reason).toMatch(/1 commit/);
        expect(inside.gate).toBe('codex-70');
      }

      const memory = evaluateConstitutionGate('search_replace', { file_path: outside, new_string: 'note' }, ctx);
      expect(memory.allow).toBe(true);

      const named = evaluateConstitutionGate('search_replace', { target_file: outside, new_string: 'note' }, ctx);
      expect(named.allow).toBe(true);

      rememberCiteRead(factory, null, [join(current, 'package.json')]);
      const live = evaluateConstitutionGate('search_replace', { file_path: join(current, 'package.json'), new_string: '{}' }, ctx);
      expect(live.allow).toBe(true);

      const relative = evaluateConstitutionGate('search_replace', { file_path: 'package.json', new_string: '{}' }, ctx);
      expect(relative.allow).toBe(false);

      const unnamed = evaluateConstitutionGate('search_replace', { new_string: 'x' }, ctx);
      expect(unnamed.allow).toBe(false);

      const mixed = evaluateConstitutionGate('search_replace', { file_path: outside, paths: [join(factory, 'package.json')], new_string: 'x' }, ctx);
      expect(mixed.allow).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('clean tree and pattern gates', () => {
  it('allows a clean checkout that is only behind main', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-clean-behind-'));
    const remote = join(root, 'remote.git');
    const factory = join(root, 'factory');
    try {
      git(root, ['init', '--bare', remote]);
      git(root, ['init', '-b', 'main', factory]);
      writeFileSync(join(factory, 'package.json'), '{}\n');
      git(factory, ['add', 'package.json']);
      git(factory, ['commit', '-m', 'init']);
      git(factory, ['remote', 'add', 'origin', remote]);
      git(factory, ['push', '-u', 'origin', 'main']);
      git(factory, ['commit', '--allow-empty', '-m', 'ahead']);
      git(factory, ['push', 'origin', 'main']);
      git(factory, ['reset', '--hard', 'HEAD~1']);
      expect(localResidue(factory)).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags a dirty source path and ignores suit state', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-clean-dirty-'));
    const repo = join(root, 'repo');
    try {
      git(root, ['init', '-b', 'main', repo]);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 1;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'init']);
      mkdirSync(join(repo, '.xray', 'state'), { recursive: true });
      writeFileSync(join(repo, '.xray', 'state', 'NOTES.md'), 'notes\n');
      expect(localResidue(repo)).toBe('');
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 2;\n');
      expect(localResidue(repo)).toMatch(/dirty tree \(1 path\)/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags a branch with no upstream and an unpushed commit', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-clean-branch-'));
    const remote = join(root, 'remote.git');
    const repo = join(root, 'repo');
    try {
      git(root, ['init', '--bare', remote]);
      git(root, ['init', '-b', 'main', repo]);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 1;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'init']);
      git(repo, ['remote', 'add', 'origin', remote]);
      git(repo, ['push', '-u', 'origin', 'main']);
      git(repo, ['checkout', '-b', 'feature/one']);
      expect(localResidue(repo)).toMatch(/branch feature\/one has no upstream/);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 2;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'local']);
      git(repo, ['push', '-u', 'origin', 'feature/one']);
      expect(localResidue(repo)).toBe('');
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 3;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'again']);
      expect(localResidue(repo)).toMatch(/1 unpushed commit/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names a stash and still passes a clean tree', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-clean-stash-'));
    const repo = join(root, 'repo');
    try {
      git(root, ['init', '-b', 'main', repo]);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 1;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'init']);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 2;\n');
      git(repo, ['stash', 'push', '-m', 'later']);
      expect(localResidue(repo)).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('stops the turn when git HEAD cannot be read', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-head-'));
    const repo = join(root, 'repo');
    const bin = join(root, 'bin');
    const prev = process.env.PATH;
    try {
      git(root, ['init', '-b', 'main', repo]);
      writeFileSync(join(repo, 'keep.ts'), 'export const keep = 1;\n');
      git(repo, ['add', 'keep.ts']);
      git(repo, ['commit', '-m', 'init']);
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'git'),
        '#!/bin/sh\nif [ "$1" = rev-parse ] && [ "$2" = --show-toplevel ]; then pwd; exit 0; fi\nif [ "$1" = rev-parse ] && [ "$3" = HEAD ]; then exit 1; fi\nPATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"\nexport PATH\nexec git "$@"\n',
      );
      execFileSync('chmod', ['+x', join(bin, 'git')]);
      process.env.PATH = `${bin}:${prev}`;
      execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: repo,
        encoding: 'utf8',
        timeout: 15000,
      });
      expect(localResidue(repo)).toMatch(/git HEAD could not be read/);
    } finally {
      process.env.PATH = prev;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('denies a one-off file and allows a call beside the pattern', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-pattern-'));
    const repo = join(root, 'repo');
    const features = { lead_dev_mode: false, auto_chain_delegations: false, no_new_surface: false };
    const ctx = { projectRoot: repo, sessionId: null, features, host: 'grok' as const };
    try {
      git(root, ['init', '-b', 'main', repo]);
      mkdirSync(join(repo, 'src', 'models'), { recursive: true });
      writeFileSync(join(repo, 'src', 'models', 'user.ts'), 'export const user = 1;\n');
      git(repo, ['add', 'src']);
      git(repo, ['commit', '-m', 'init']);
      const oneOff = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'one-off', 'helper.ts'),
        new_string: 'export function helper() { return 1; }\n',
      }, ctx);
      expect(oneOff.allow).toBe(false);
      if (!oneOff.allow) expect(oneOff.gate).toBe('pattern');
      rememberCiteRead(repo, null, [join(repo, 'src', 'models', 'user.ts')]);
      const beside = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'order.ts'),
        new_string: 'export const order = 1;\n',
      }, ctx);
      expect(beside.allow).toBe(true);
      const testFile = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'one-off', 'helper.test.ts'),
        new_string: 'export const t = 1;\n',
      }, ctx);
      expect(testFile.allow).toBe(false);
      if (!testFile.allow) expect(testFile.gate).toBe('cite');
      rememberCiteRead(repo, null, [join(repo, 'src', 'one-off', 'helper.test.ts')]);
      const testRead = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'one-off', 'helper.test.ts'),
        new_string: 'export const t = 1;\n',
      }, ctx);
      expect(testRead.allow).toBe(true);
      const lone = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(lone.allow).toBe(false);
      if (!lone.allow) expect(lone.gate).toBe('pattern');
      const shell = evaluateConstitutionGate('run_terminal_command', {
        command: `printf 'x\\n' > ${join(repo, 'src', 'one-off', 'helper.ts')}`,
      }, ctx);
      expect(shell.allow).toBe(false);
      if (!shell.allow) expect(shell.gate).toBe('pattern');
      expect(shellWritePaths('echo x >&2')).toEqual([]);
      expect(shellWritePaths('echo x 2>&1')).toEqual([]);
      expect(shellWritePaths('x >| notes.md')).toEqual(['notes.md']);
      const stderr = evaluateConstitutionGate('run_terminal_command', {
        command: 'echo x >&2',
      }, ctx);
      expect(stderr.allow).toBe(true);
      writeFileSync(join(repo, 'PACKET.md'), 'pattern: controller calls a model\n');
      const prose = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'billing', 'invoice.ts'),
        new_string: 'export const invoice = 1;\n',
      }, ctx);
      expect(prose.allow).toBe(false);
      if (!prose.allow) expect(prose.gate).toBe('pattern');
      writeFileSync(join(repo, 'PACKET.md'), 'pattern: src/billing\n');
      const named = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'billing', 'invoice.ts'),
        new_string: 'export const invoice = 1;\n',
      }, ctx);
      expect(named.allow).toBe(false);
      if (!named.allow) expect(named.gate).toBe('cite');
      rememberCiteRead(repo, null, [join(repo, 'PACKET.md')]);
      const namedRead = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'billing', 'invoice.ts'),
        new_string: 'export const invoice = 1;\n',
      }, ctx);
      expect(namedRead.allow).toBe(true);
      const other = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'payroll', 'slip.ts'),
        new_string: 'export const slip = 1;\n',
      }, ctx);
      expect(other.allow).toBe(false);
      if (!other.allow) expect(other.gate).toBe('pattern');
      const shellNamed = evaluateConstitutionGate('run_terminal_command', {
        command: `printf 'x\\n' > ${join(repo, 'src', 'one-off', 'helper.ts')}`,
      }, ctx);
      expect(shellNamed.allow).toBe(false);
      if (!shellNamed.allow) expect(shellNamed.gate).toBe('pattern');
      mkdirSync(join(repo, 'src', 'orders'), { recursive: true });
      writeFileSync(join(repo, 'src', 'orders', 'order.test.ts'), 'export const t = 1;\n');
      rememberCiteRead(repo, null, [join(repo, 'src', 'orders', 'order.test.ts')]);
      const besideTest = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'orders', 'order.ts'),
        new_string: 'export const order = 1;\n',
      }, ctx);
      expect(besideTest.allow).toBe(true);
      const edit = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(edit.allow).toBe(false);
      if (!edit.allow) expect(edit.gate).toBe('pattern');
      writeFileSync(join(repo, 'PACKET.md'), 'pattern: src/billing\npattern: src/models\n');
      const editNamed = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(editNamed.allow).toBe(true);
      const outside = join(root, 'note.ts');
      const memory = evaluateConstitutionGate('search_replace', {
        file_path: outside,
        new_string: 'export const n = 1;\n',
      }, ctx);
      expect(memory.allow).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('stops an unread edit and allows it after the file is read', () => {
    const root = mkdtempSync(join(tmpdir(), 'xray-cite-'));
    const repo = join(root, 'repo');
    const features = { lead_dev_mode: false, auto_chain_delegations: false, no_new_surface: false };
    const ctx = { projectRoot: repo, sessionId: null, features, host: 'grok' as const };
    try {
      git(root, ['init', '-b', 'main', repo]);
      mkdirSync(join(repo, 'src', 'models'), { recursive: true });
      writeFileSync(join(repo, 'src', 'models', 'user.ts'), 'export const user = 1;\n');
      git(repo, ['add', 'src']);
      git(repo, ['commit', '-m', 'init']);
      const unread = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(unread.allow).toBe(false);
      if (!unread.allow) expect(unread.gate).toBe('pattern');
      writeFileSync(join(repo, 'PACKET.md'), 'pattern: src/models\n');
      const named = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(named.allow).toBe(false);
      if (!named.allow) expect(named.gate).toBe('cite');
      const unreadNew = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'order.ts'),
        new_string: 'export const order = 1;\n',
      }, ctx);
      expect(unreadNew.allow).toBe(false);
      if (!unreadNew.allow) expect(unreadNew.gate).toBe('cite');
      mkdirSync(join(repo, '.xray', 'state'), { recursive: true });
      const notes = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, '.xray', 'state', 'NOTES.md'),
        new_string: 'notes\n',
      }, ctx);
      expect(notes.allow).toBe(true);
      const opened = evaluatePreToolGate('read_file', {
        target_file: join(repo, 'src', 'models', 'user.ts'),
      }, ctx);
      expect(opened.allow).toBe(true);
      const edit = evaluatePreToolGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'user.ts'),
        new_string: 'export const user = 2;\n',
      }, ctx);
      expect(edit.allow).toBe(true);
      const beside = evaluatePreToolGate('search_replace', {
        file_path: join(repo, 'src', 'models', 'order.ts'),
        new_string: 'export const order = 1;\n',
      }, ctx);
      expect(beside.allow).toBe(true);
      writeFileSync(join(repo, 'PACKET.md'), 'pattern: src/billing\npattern: src/models\n');
      const fresh = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'billing', 'invoice.ts'),
        new_string: 'export const invoice = 1;\n',
      }, ctx);
      expect(fresh.allow).toBe(false);
      if (!fresh.allow) expect(fresh.gate).toBe('cite');
      rememberCiteRead(repo, null, [join(repo, 'src', 'models')]);
      const openedDir = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'src', 'billing', 'invoice.ts'),
        new_string: 'export const invoice = 1;\n',
      }, ctx);
      expect(openedDir.allow).toBe(true);
      const rootFile = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'out.log'),
        new_string: 'x\n',
      }, ctx);
      expect(rootFile.allow).toBe(false);
      if (!rootFile.allow) expect(rootFile.gate).toBe('cite');
      rememberCiteRead(repo, null, [join(repo, 'PACKET.md')]);
      const rootRead = evaluateConstitutionGate('search_replace', {
        file_path: join(repo, 'out.log'),
        new_string: 'x\n',
      }, ctx);
      expect(rootRead.allow).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
