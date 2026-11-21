import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openCardsMissingRaci, unbackedDefects, unclosedAfterMerge } from '../tools/exit-gate.mjs';

test('a missing sole file fails the exit gate', () => {
  const script = fileURLToPath(new URL('../tools/exit-gate.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, '/tmp/xray-exit-gate-does-not-exist.md'], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /missing file/);
});

test('a prose-only bug fails the exit gate', () => {
  const bad = unbackedDefects('- bug: the wake token is never stamped\n');
  assert.equal(bad.length, 1);
});

test('an issue opened the same turn passes the exit gate', () => {
  const bad = unbackedDefects('- bug: wake token. 0xRayAI/xray#812\nFell out: nothing\n');
  assert.deepEqual(bad, []);
});

test('a follow-up with a pull comment URL passes', () => {
  const bad = unbackedDefects('follow-up https://github.com/0xRayAI/xray/pull/811#issuecomment-1\n');
  assert.deepEqual(bad, []);
});

test('a short repo number passes', () => {
  assert.deepEqual(unbackedDefects('xray#808 Soft FU: the stamp\n'), []);
  assert.deepEqual(unbackedDefects('gap on bifrost#29\n'), []);
});

test('an older notes section does not fail the current turn', () => {
  const notes = '## 2026-11-02\n- bug: stamped. xray#809\n## 2026-10-01\n- bug: old and unlinked\n';
  assert.deepEqual(unbackedDefects(notes), []);
});

test('a wake line that merged nothing does not fail', () => {
  const line = '0xRayAI/xray#820@278a29e ("fix(live): fail a merged turn that leaves the fixed issues open", refs 0xRayAI/xray#819)';
  assert.deepEqual(unclosedAfterMerge(line), []);
});

test('the merged pull itself is not a fixed issue', () => {
  const turn = 'merged xray#817 fix(live): the newest tip\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('a same-line pull ref is not a fixed issue', () => {
  const turn = 'merged xray#820, fixes xray#819\nclosed xray#819\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('a ref is not a fix', () => {
  const turn = 'merged xray#820\nrefs xray#819 (Soft FU later)\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('not closed does not count as closed', () => {
  const turn = 'merged xray#820\nfixes xray#819 — not closed xray#819 yet\n';
  assert.deepEqual(unclosedAfterMerge(turn), ['xray#819']);
});

test('a merged turn that leaves the fixed issue open fails', () => {
  const turn = '## now\nmerged xray#817\nfixes xray#813\nfixes xray#814\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), ['xray#814']);
});

test('closing the fixed issues in the same turn passes', () => {
  const turn = '## now\nmerged xray#817\nfixes xray#813\nclosed xray#813\n';
  assert.deepEqual(unclosedAfterMerge(turn), []);
});

test('the top notes section still fails a prose bug', () => {
  const notes = '## now\n- bug: still prose\n## old\n- fine\n';
  assert.equal(unbackedDefects(notes).length, 1);
  assert.equal(unbackedDefects('## new\nFU: gap unref\n## old\nok').length, 1);
});

test('an open card without raci is flagged; a closed card is quiet', () => {
  const cards = {
    cards: [
      { key: 'xray#1104', state: 'live', packet: {} },
      { key: 'xray#1100', state: 'closed', packet: {} },
      { key: 'xray#9', state: 'live', packet: { raci: 'R=forge A=forge' } },
      { key: 'pin', pinned: true, state: 'live' },
    ],
  };
  assert.deepEqual(openCardsMissingRaci(cards), ['xray#1104']);
});

function git(cwd, args) {
  execFileSync('git', args, {
    cwd,
    stdio: 'ignore',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
}

test('--git fails a dirty checkout and a notes-only run stays on the file', () => {
  const root = mkdtempSync(join(tmpdir(), 'xray-exit-git-'));
  const repo = join(root, 'repo');
  const notes = join(root, 'NOTES.md');
  const script = fileURLToPath(new URL('../tools/exit-gate.mjs', import.meta.url));
  try {
    git(root, ['init', '-b', 'main', repo]);
    writeFileSync(join(repo, 'keep.ts'), 'export const keep = 1;\n');
    git(repo, ['add', 'keep.ts']);
    git(repo, ['commit', '-m', 'init']);
    writeFileSync(notes, '## turn\n- shipped org/app#12\n');
    mkdirSync(join(repo, '.xray', 'state'), { recursive: true });
    writeFileSync(join(repo, '.xray', 'state', 'NOTES.md'), 'seat\n');
    const suitOnly = spawnSync(process.execPath, [script, notes, '--git', repo], { encoding: 'utf8' });
    assert.equal(suitOnly.status, 0);
    writeFileSync(join(repo, 'keep.ts'), 'export const keep = 2;\n');
    const dirty = spawnSync(process.execPath, [script, notes, '--git', repo], { encoding: 'utf8' });
    assert.equal(dirty.status, 1);
    assert.match(dirty.stderr, /Clean tree: dirty tree/);
    const notesOnly = spawnSync(process.execPath, [script, notes], { encoding: 'utf8', cwd: repo });
    assert.equal(notesOnly.status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a still-waiting wake that cites the existing issue URL passes without a new comment (xray#976)', () => {
  const notes = '## 2026-11-10 07:00\n- still waiting on Arch1: the Closes lines in #904, ask: change them to Refs. https://github.com/0xRayAI/xray/issues/976\nFell out: nothing\n';
  assert.deepEqual(unbackedDefects(notes), []);
  const short = '## 2026-11-10 07:05\n- nothing changed. gap tracked on xray#976, board only, no comment posted\n';
  assert.deepEqual(unbackedDefects(short), []);
});
