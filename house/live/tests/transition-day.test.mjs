import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendTransition, initArchive, queryTransitions } from '../app/archive.mjs';

test('a day filter returns that Chicago day, not the oldest page', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-day-'));
  initArchive(data);
  const actor = { seat: 'sound', login: 'sound', bc: '' };
  assert.equal(appendTransition({
    card: '0xrayai/xray#1', transition: 'opened', source_id: 'old',
    t_ct: '2026-09-02T15:00:00-05:00', to_state: 'open', to_stage: 'open', actor, packet: '',
  }), true);
  assert.equal(appendTransition({
    card: '0xrayai/xray#2', transition: 'opened', source_id: 'today',
    t_ct: '2026-10-29T13:30:00-05:00', to_state: 'open', to_stage: 'open', actor, packet: '',
  }), true);
  const listed = queryTransitions({ day: '2026-10-29' });
  assert.deepEqual(listed.transitions.map(row => row.card), ['0xrayai/xray#2']);
  const all = queryTransitions({});
  assert.equal(all.transitions.length, 2);
});
