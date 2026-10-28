import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendArchive, appendTransition, cardHistory, initArchive, queryTransitions } from '../app/archive.mjs';
import {
  applyPlan, chooseRepos, itemFromIssue, itemFromPull, linkedAgents, parseGhPages, planBackfill, planTransitionBackfill, readArchiveIndex, runBackfill, runTransitionBackfill, seatOf,
} from '../app/history-backfill.mjs';

const seats = new Map([['forge0x1[bot]', 'forge'], ['htafolla', 'Blaze']]);

test('repo choice prefers an explicit list, then the collector, then the org', () => {
  assert.deepEqual(chooseRepos({ repos: ['0xRayAI/xray', '0xRayAI/xray', 'nope'], orgRepos: ['0xRayAI/muse-house'] }), ['0xRayAI/xray']);
  assert.deepEqual(chooseRepos({ collectorRepos: ['0xRayAI/repertoire'], orgRepos: ['0xRayAI/xray'] }), ['0xRayAI/repertoire']);
  assert.deepEqual(chooseRepos({ orgRepos: ['0xRayAI/xray', '0xRayAI/muse-house'] }), ['0xRayAI/xray', '0xRayAI/muse-house']);
});

test('paginated gh output can be one array or several', () => {
  assert.deepEqual(parseGhPages('[{"n":1},{"n":2}]'), [{ n: 1 }, { n: 2 }]);
  assert.deepEqual(parseGhPages('[{"n":1}][{"n":2}]'), [{ n: 1 }, { n: 2 }]);
  assert.deepEqual(parseGhPages(''), []);
});

test('a merged pull keeps the merge verb, labels, and linked agent, and drops the body', () => {
  const pull = itemFromPull('0xRayAI/xray', {
    number: 485, title: 'Packet handoff', html_url: 'https://github.com/0xRayAI/xray/pull/485',
    user: { login: 'forge0x1[bot]' }, created_at: '2026-10-18T12:00:00Z', closed_at: '2026-10-18T18:00:00Z',
    merged_at: '2026-10-18T18:00:00Z', merged_by: { login: 'htafolla' },
    head: { ref: 'cursor/packet-bc-abc123def' }, draft: false,
    labels: [{ name: 'ready' }],
    body: 'agent bc-abc123def did the work. secret token stays out.',
  });
  assert.deepEqual(pull.agents, ['bc-abc123def']);
  assert.equal(pull.body, undefined);
  assert.equal(seatOf('htafolla', seats), 'Blaze');
  const plan = planBackfill([pull], readArchiveIndex(os.tmpdir()), seats);
  assert.deepEqual(plan.events.map(row => row.kind), ['pr_open', 'merged']);
  assert.equal(plan.events[1].id, '0xRayAI/xray#485:merged');
  assert.equal(plan.events[1].merged_by, 'htafolla');
  assert.equal(plan.events[1].from, 'Blaze');
  const closed = plan.cards.find(row => row.state === 'closed');
  assert.equal(closed.verb, 'merged');
  assert.equal(closed.key, '0xrayai/xray#485');
  assert.deepEqual(closed.labels, ['ready']);
  assert.deepEqual(closed.agents, ['bc-abc123def']);
  assert.equal(closed.owner, 'forge');
  assert.equal(Object.hasOwn(closed, 'body'), false);
});

test('an open parked issue and a closed unmerged pull take the matching verbs', () => {
  const issue = itemFromIssue('0xRayAI/xray', {
    number: 12, title: 'later', user: { login: 'someone' }, created_at: '2026-10-01T00:00:00Z',
    labels: [{ name: 'icebox' }], state: 'open',
  });
  const pull = itemFromPull('0xRayAI/muse-house', {
    number: 3, title: 'drop', user: { login: 'someone' }, created_at: '2026-10-02T00:00:00Z',
    closed_at: '2026-10-03T00:00:00Z', merged_at: null, state: 'closed', labels: [],
  });
  const plan = planBackfill([issue, pull], readArchiveIndex(os.tmpdir()), seats);
  assert.equal(plan.cards.find(row => row.number === 12).state, 'parked');
  assert.equal(plan.events.find(row => row.number === 3 && row.kind === 'pr_close').id, '0xRayAI/muse-house#3:close');
  assert.equal(plan.cards.find(row => row.number === 3 && row.state === 'closed').verb, 'closed');
  assert.equal(plan.byRepo['0xRayAI/xray'].events, 1);
  assert.equal(plan.byRepo['0xRayAI/muse-house'].events, 2);
});

test('ids already in the archive, including a collector merge id, are not added again', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-idx-'));
  const day = path.join(data, 'archive', '2026-10-18');
  fs.mkdirSync(day, { recursive: true });
  fs.writeFileSync(path.join(day, 'events.jsonl'), [
    JSON.stringify({ id: '0xRayAI/xray#485:ev:99', t_ct: '2026-10-18T18:00:00Z', kind: 'merged', repo: '0xRayAI/xray', number: 485 }),
    JSON.stringify({ id: '0xRayAI/xray#485:open', t_ct: '2026-10-18T12:00:00Z', kind: 'pr_open', repo: '0xRayAI/xray', number: 485 }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(day, 'cards.jsonl'), JSON.stringify({
    id: '0xRayAI/xray#485|review|live|2026-10-18T12:00:00Z', key: '0xRayAI/xray#485', state: 'live', stage: 'review',
    updated_ct: '2026-10-19T00:00:00Z', t_ct: '2026-10-18T12:00:00Z', repo: '0xRayAI/xray', number: 485,
  }) + '\n');
  const pull = itemFromPull('0xRayAI/xray', {
    number: 485, title: 'Packet', user: { login: 'forge0x1[bot]' }, created_at: '2026-10-18T12:00:00Z',
    closed_at: '2026-10-18T18:00:00Z', merged_at: '2026-10-18T18:00:00Z', merged_by: { login: 'htafolla' },
  });
  const plan = planBackfill([pull], readArchiveIndex(data), seats);
  assert.equal(plan.events.length, 0);
  assert.equal(plan.skippedEvents, 2);
  assert.equal(plan.cards.length, 1);
  assert.equal(plan.cards[0].state, 'closed');
  assert.equal(plan.cards[0].verb, 'merged');
  assert.ok(Date.parse(plan.cards[0].updated_ct) > Date.parse('2026-10-19T00:00:00Z'));
  fs.rmSync(data, { recursive: true, force: true });
});

test('a dry-run writes nothing, and a second write adds nothing', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-run-'));
  const pull = itemFromPull('0xRayAI/xray', {
    number: 7, title: 'Ship', user: { login: 'forge0x1[bot]' }, created_at: '2026-10-10T00:00:00Z',
    closed_at: '2026-10-11T00:00:00Z', merged_at: '2026-10-11T00:00:00Z', merged_by: { login: 'htafolla' },
    labels: [{ name: 'ship' }], head: { ref: 'bc-deadbeef' },
  });
  const fetchItems = async () => [pull];
  const dry = await runBackfill({ repos: ['0xRayAI/xray'], dataDir: data, write: false, fetchItems, seats });
  assert.equal(dry.dry_run, true);
  assert.equal(dry.cards, 2);
  assert.equal(dry.events, 2);
  assert.equal(fs.existsSync(path.join(data, 'archive')), false);
  const wrote = await runBackfill({ repos: ['0xRayAI/xray'], dataDir: data, write: true, fetchItems, seats });
  assert.equal(wrote.wrote_cards, 2);
  assert.equal(wrote.wrote_events, 2);
  initArchive(data);
  const hist = cardHistory().cards.find(row => row.id === '0xrayai/xray#7');
  assert.equal(hist.state, 'closed');
  assert.equal(hist.verb, 'merged');
  assert.deepEqual(hist.labels, ['ship']);
  assert.deepEqual(hist.agents, ['bc-deadbeef']);
  assert.equal(hist.merged_by, 'htafolla');
  const again = await runBackfill({ repos: ['0xRayAI/xray'], dataDir: data, write: true, fetchItems, seats });
  assert.equal(again.cards, 0);
  assert.equal(again.events, 0);
  assert.equal(again.wrote_cards, 0);
  assert.equal(again.wrote_events, 0);
  const lines = fs.readFileSync(path.join(data, 'archive', 'cards.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1);
  fs.rmSync(data, { recursive: true, force: true });
});

test('transition backfill of the five merges is a no-op the second time and does not rewrite cards', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-trans-'));
  const root = path.join(data, 'archive', '2026-10-20');
  fs.mkdirSync(root, { recursive: true });
  const merges = [
    [485, '2026-10-20T13:14:17-05:00'],
    [493, '2026-10-20T16:09:18-05:00'],
    [496, '2026-10-20T16:22:51-05:00'],
    [494, '2026-10-20T16:44:48-05:00'],
    [499, '2026-10-20T18:22:24-05:00'],
  ];
  const events = [
    { id: 'open-499', t_ct: '2026-10-20T12:00:00-05:00', kind: 'pr_open', repo: '0xRayAI/xray', number: 499, title: 'Packet 499', from: 'forge', credit: 'forge', body: 'SENTINEL_BODY' },
    ...merges.map(([number, t]) => ({
      id: `merge-${number}`, t_ct: t, kind: 'merged', repo: '0xRayAI/xray', number, title: `PR ${number}`,
      from: 'forge', credit: 'forge', merged_by: 'forge0x1[bot]', body: 'SENTINEL_BODY',
    })),
  ];
  fs.writeFileSync(path.join(root, 'events.jsonl'), events.map(row => JSON.stringify(row)).join('\n') + '\n');
  fs.writeFileSync(path.join(data, 'archive', '.backfill-done'), '1\n');
  initArchive(data);
  assert.equal(appendArchive('cards', {
    key: '0xrayai/xray#499', state: 'live', stage: 'review', verb: 'live', title: 'Packet 499',
    repo: '0xRayAI/xray', number: 499, t_ct: '2026-10-21T02:00:00Z', updated_ct: '2026-10-21T02:00:00Z',
  }), true);
  assert.equal(appendArchive('cards', {
    key: '0xrayai/xray#496', state: 'closed', stage: 'done', verb: 'closed', title: 'PR 496',
    repo: '0xRayAI/xray', number: 496, t_ct: '2026-10-21T03:00:00Z', updated_ct: '2026-10-21T03:00:00Z',
  }), true);
  const cardsBefore = fs.readFileSync(path.join(data, 'archive', 'cards.jsonl'), 'utf8');
  const dry = runTransitionBackfill({ dataDir: data, write: false });
  assert.equal(dry.wrote, false);
  assert.equal(dry.rows, 6);
  assert.equal(fs.existsSync(path.join(data, 'archive', 'transitions-backfill.json')), false);
  const wrote = runTransitionBackfill({ dataDir: data, write: true });
  assert.equal(wrote.appended, 6);
  assert.deepEqual(wrote.unrestored, [
    '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-25',
    '2026-08-27', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01',
  ]);
  const hist = Object.fromEntries(cardHistory().cards.map(row => [row.id, row]));
  for (const [number, t] of merges) {
    const card = hist[`0xrayai/xray#${number}`];
    assert.equal(card.verb, 'merged', String(number));
    assert.equal(card.state, 'closed');
    assert.equal(card.closed_ct, t);
  }
  const listed = queryTransitions({ card: '0xRayAI/xray#499' }).transitions.map(row => row.transition);
  assert.deepEqual(listed, ['opened', 'merged']);
  assert.ok(!fs.readFileSync(path.join(data, 'archive', '2026-10-20', 'transitions.jsonl'), 'utf8').includes('SENTINEL_BODY'));
  assert.equal(fs.readFileSync(path.join(data, 'archive', '.backfill-done'), 'utf8'), '1\n');
  assert.equal(fs.readFileSync(path.join(data, 'archive', 'cards.jsonl'), 'utf8'), cardsBefore);
  const page = queryTransitions({ limit: 1 });
  assert.equal(page.transitions.length, 1);
  const next = queryTransitions({ limit: 1, cursor: page.transitions[0].id });
  assert.equal(next.transitions.length, 1);
  assert.notEqual(next.transitions[0].id, page.transitions[0].id);
  const again = runTransitionBackfill({ dataDir: data, write: true });
  assert.equal(again.rows, 0);
  assert.equal(again.appended, 0);
  assert.equal(appendTransition({
    card: '0xrayai/xray#499', transition: 'merged', source_id: 'merge-499', t_ct: '2026-10-20T18:22:24-05:00',
    to_state: 'closed', to_stage: 'done', actor: { seat: 'forge', login: 'forge', bc: '' }, packet: 'PR 499',
  }), false);
  fs.rmSync(path.join(data, 'archive', 'transition-index.json'));
  initArchive(data);
  assert.equal(cardHistory().cards.find(row => row.id === '0xrayai/xray#499').verb, 'merged');
  assert.equal(appendTransition({
    card: '0xrayai/xray#485', transition: 'merged', source_id: 'merge-485', t_ct: '2026-10-20T13:14:17-05:00',
    to_state: 'closed', to_stage: 'done', actor: { seat: 'forge', login: 'forge', bc: '' }, packet: 'PR 485',
  }), false);
  const receipt = JSON.parse(fs.readFileSync(path.join(data, 'archive', 'transitions-backfill.json'), 'utf8'));
  assert.equal(receipt.appended, 0);
  assert.equal(receipt.unrestored.length, 10);
  fs.rmSync(data, { recursive: true, force: true });
});

test('github fill is only a card still live, or a row on one of the ten missing days', () => {
  const events = [
    { id: 'merge-1', t_ct: '2026-10-20T13:14:17-05:00', kind: 'merged', repo: '0xRayAI/xray', number: 1, title: 'done' },
    { id: 'merge-4', t_ct: '2026-10-20T16:00:00-05:00', kind: 'merged', repo: '0xRayAI/xray', number: 4, title: 'later' },
  ];
  const items = [
    { repo: '0xRayAI/xray', number: 1, kind: 'pr', title: 'done', user: 'a', created_at: '2026-10-01T15:00:00Z', merged_at: '2026-10-20T18:00:00Z', merged_by: 'a' },
    { repo: '0xRayAI/xray', number: 2, kind: 'pr', title: 'open', user: 'a', created_at: '2026-10-19T16:00:00Z' },
    { repo: '0xRayAI/xray', number: 4, kind: 'issue', title: 'gap', user: 'a', created_at: '2026-08-21T18:00:00-05:00', closed_at: '2026-08-21T20:00:00-05:00' },
  ];
  const plan = planTransitionBackfill({ events, days: ['2026-10-20'], items });
  const ids = plan.rows.map(row => `${row.card}|${row.transition}`);
  assert.deepEqual(ids.filter(id => id.startsWith('0xrayai/xray#1|')), ['0xrayai/xray#1|merged']);
  assert.ok(ids.includes('0xrayai/xray#2|opened'));
  assert.ok(ids.includes('0xrayai/xray#4|opened'));
  assert.ok(ids.includes('0xrayai/xray#4|closed'));
  assert.equal(plan.unrestored.includes('2026-08-21'), false);
  assert.equal(plan.unrestored.includes('2026-08-20'), true);
});

test('applyPlan without write does not create the archive', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-dry-'));
  const plan = planBackfill([itemFromIssue('0xRayAI/xray', {
    number: 1, title: 'Open', user: { login: 'a' }, created_at: '2026-10-01T00:00:00Z', state: 'open',
  })], readArchiveIndex(data), seats);
  assert.deepEqual(linkedAgents('see bc-abc123 and BC-abc123'), ['bc-abc123']);
  const applied = applyPlan(data, plan, { write: false });
  assert.equal(applied.wrote, false);
  assert.equal(fs.existsSync(path.join(data, 'archive')), false);
  fs.rmSync(data, { recursive: true, force: true });
});
