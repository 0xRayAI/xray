import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimTitle, defectDraft, defectIssue, openGithubIssue } from '../app/defect-issue.mjs';

test('a bug with no number becomes one issue packet', () => {
  assert.equal(defectDraft('bug'), null);
  assert.equal(defectDraft('bug: see 0xRayAI/xray#1043 today'), null);
  assert.equal(defectDraft(Array.from({ length: 9 }, (_, i) => `bug line ${i}`).join('\n')), null);
  const draft = defectDraft('bug: the queue row drops the reason and the card number');
  assert.equal(draft.title.startsWith('bug:'), true);
  const issue = defectIssue(draft, 'arch1', '0xRayAI/xray');
  assert.equal(issue.repo, '0xRayAI/xray');
  assert.match(issue.body, /R: arch1/);
  assert.match(issue.body, /A: Blaze/);
  assert.equal(defectIssue(draft, 'arch1', 'not a repo'), null);
  assert.equal(defectIssue(draft, 'Blaze', '0xRayAI/xray'), null);
});

test('a title claim holds until it expires, and a refused write is not an exception', async () => {
  const store = {};
  assert.equal(claimTitle(store, 'defect:one', 10, 50), true);
  assert.equal(claimTitle(store, 'defect:one', 20, 50), false);
  assert.equal(claimTitle(store, 'defect:one', 70, 50), true);
  const calls = [];
  const refused = await openGithubIssue('https://example.test', {
    repo: '0xRayAI/xray', title: 'bug: one', body: '## Packet\n',
  }, 'token', async (url, init) => {
    calls.push(url);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer token');
    return { status: 403, text: async () => 'read only', json: async () => ({}) };
  });
  assert.deepEqual(refused, { ok: false, reason: 'github-403' });
  assert.equal(calls.length, 1);
  const missing = await openGithubIssue('https://example.test', {
    repo: '0xRayAI/xray', title: 'bug: one', body: 'body',
  }, '', async () => { throw new Error('should not fetch'); });
  assert.deepEqual(missing, { ok: false, reason: 'no-token' });
});
