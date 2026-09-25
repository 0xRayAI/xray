/**
 * Intake ranker suite 001 — attestation + consumer boundary signals (xray wear pipeline).
 * Source slice: suited intake-000 + complexity-core scoreWearTaskText patterns.
 */
export const SUITE_ID = 'intake-ranker-001';
export const SHARD_ID = 'intake-rank-001';
const SEED = 101;
const KEYWORDS = ['attestation', 'consumer', 'boundary', 'map', 'revalidation', 'trap', 'ontological'];

function fold(text) {
  let h = SEED;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 33 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function normalizeShard(task, ctx = {}) {
  const text = String(task ?? '');
  const lower = text.toLowerCase();
  const hits = KEYWORDS.filter((k) => lower.includes(k));
  const complexity = fold(text) % 100;
  const sessionOk = typeof ctx.sessionId === 'string' && ctx.sessionId.length > 0;
  const score = hits.length * 12 + (complexity % 40);
  return {
    shard: SHARD_ID,
    suite: SUITE_ID,
    hits,
    hit: hits.length > 0,
    score,
    sessionOk,
    length: text.length,
    tokenEstimate: Math.ceil(text.length / 4) + hits.length * 2,
    flags: {
      ontological: lower.includes('ontological'),
      trap: lower.includes('trap'),
      attestation: lower.includes('attestation'),
      consumer: lower.includes('consumer'),
      revalidation: lower.includes('revalidation'),
    },
    meta: { seed: SEED, index: 1 },
  };
}

export function rankRecallAlignment(shard, organContext) {
  const matched = organContext?.matchedSignals ?? [];
  let alignment = 0;
  for (const h of shard.hits ?? []) {
    if (matched.includes('attestation-as-map') && h === 'attestation') alignment += 25;
    if (matched.includes('consumer-boundary') && h === 'consumer') alignment += 20;
    if (matched.includes('revalidation-required') && h === 'revalidation') alignment += 15;
  }
  return { alignment, capped: Math.min(alignment, 100) };
}

export function buildIntakeReport(task, ctx) {
  const shard = normalizeShard(task, ctx);
  return {
    suite: SUITE_ID,
    shard,
    ready: shard.sessionOk && shard.hit,
    lessonHint: shard.flags.attestation ? 'attestation-as-map' : null,
  };
}

export function mergeShards(left, right) {
  return {
    shard: SHARD_ID,
    score: (left?.score ?? 0) + (right?.score ?? 0),
    hit: Boolean(left?.hit || right?.hit),
    hits: [...new Set([...(left?.hits ?? []), ...(right?.hits ?? [])])],
  };
}

export function diffShards(before, after) {
  return {
    shard: SHARD_ID,
    delta: (after?.score ?? 0) - (before?.score ?? 0),
    improved: (after?.score ?? 0) >= (before?.score ?? 0),
  };
}

export function validateIntakeSession(ctx) {
  if (!ctx?.sessionId) return { ok: false, reason: 'missing-session' };
  if (String(ctx.sessionId).length < 4) return { ok: false, reason: 'session-too-short' };
  return { ok: true };
}

export function plateHintFromShard(shard) {
  if (shard.flags?.trap) return 'plate-trap';
  if (shard.flags?.attestation) return 'plate-attestation';
  return 'plate-tag-1';
}

export function governancePrecheck(task) {
  const lower = String(task ?? '').toLowerCase();
  const blocked = ['spawn_subagent', '.server.ts', 'skill.md'];
  const hit = blocked.some((b) => lower.includes(b));
  return { pass: !hit, term: hit ? 69 : null };
}

export function describeSuite() {
  return {
    id: SUITE_ID,
    shard: SHARD_ID,
    keywords: KEYWORDS,
    seed: SEED,
    source: 'recall-bench-100k intake ranker',
  };
}

// Extended ranking steps for pipeline-suite aggregation (wear path)
export function rankStep01(task) {
  return normalizeShard(task, {}).score;
}
export function rankStep02(task, ctx) {
  return normalizeShard(task, ctx).tokenEstimate;
}
export function rankStep03(task) {
  const s = normalizeShard(task, {});
  return s.flags.ontological ? s.score + 10 : s.score;
}
export function rankStep04(task) {
  const s = normalizeShard(task, {});
  return s.flags.trap ? s.score + 15 : s.score;
}
export function rankStep05(task, ctx) {
  const v = validateIntakeSession(ctx);
  return v.ok ? normalizeShard(task, ctx).score : 0;
}
export function rankStep06(task) {
  return governancePrecheck(task).pass ? 1 : 0;
}
export function rankStep07(task) {
  return String(task ?? '').includes('TYPE') ? 5 : 0;
}
export function rankStep08(task) {
  return Math.min(String(task ?? '').length, 200);
}
export function rankStep09(task, ctx) {
  return buildIntakeReport(task, ctx).ready ? 100 : 50;
}
export function rankStep10(task, ctx) {
  const shard = normalizeShard(task, ctx);
  return rankRecallAlignment(shard, ctx.organ).capped;
}

export function aggregateRankSteps(task, ctx) {
  const steps = [
    rankStep01(task),
    rankStep02(task, ctx),
    rankStep03(task),
    rankStep04(task),
    rankStep05(task, ctx),
    rankStep06(task),
    rankStep07(task),
    rankStep08(task),
    rankStep09(task, ctx),
    rankStep10(task, ctx),
  ];
  const total = steps.reduce((a, b) => a + b, 0);
  return { steps, total, average: total / steps.length };
}
