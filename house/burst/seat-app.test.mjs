import test from 'node:test';
import assert from 'node:assert/strict';
import { mintPlan, permissionDrift } from './seat-app.mjs';

const seat = {
  id: 'seat-a',
  appId: 100,
  installationId: 200,
  permissions: { metadata: 'read', contents: 'read' },
  repositories: ['example'],
};

test('a seat plan names only that installation and the requested permissions', () => {
  const plan = mintPlan(seat);
  assert.equal(plan.ok, true);
  assert.equal(plan.iss, '100');
  assert.match(plan.url, /installations\/200\/access_tokens$/);
  assert.deepEqual(plan.body.permissions, seat.permissions);
  assert.deepEqual(plan.body.repositories, ['example']);
});

test('a broader returned permission is drift', () => {
  const bad = permissionDrift({ metadata: 'read', contents: 'write' }, seat.permissions);
  assert.deepEqual(bad, [['contents', 'write']]);
  assert.deepEqual(permissionDrift({ metadata: 'read', contents: 'read' }, seat.permissions), []);
});

test('a seat without permissions is refused', () => {
  const plan = mintPlan({ id: 'seat-a', appId: 1, installationId: 2 });
  assert.equal(plan.ok, false);
});
