import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateConstitutionGate } from '../../nucleus/delegation-gate.js';
import { compareVersions, decideFreshness, describeFreshness, freshnessNeedsRefresh } from '../../nucleus/work-freshness.mjs';

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
