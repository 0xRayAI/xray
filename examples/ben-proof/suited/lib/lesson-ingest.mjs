/**
 * Names a later `buildRoutingContext(task)` will hit.
 * Matched laws win. When the task names none, coin a hyphenated phrase that
 * still sits inside the task so recall does not need the bench token.
 * @param {{ buildRoutingContext: (operation: string) => { matchedSignals?: string[] } }} organ
 * @param {string} task
 * @returns {string[]}
 */
export function signalsForTaskLesson(organ, task) {
  const text = String(task ?? '');
  const context = organ.buildRoutingContext(text);
  const matched = [...new Set((context.matchedSignals ?? []).filter((name) => name.length > 0))];
  if (matched.length > 0) return matched;
  const coined = coinedSignalName(text);
  return coined ? [coined] : [];
}

/**
 * Hyphenated phrase whose spaced form is still inside the task.
 * @param {string} task
 * @returns {string | null}
 */
function coinedSignalName(task) {
  const words = task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  const normalized = task.toLowerCase();
  const kept = [];
  for (const word of words) {
    const next = [...kept, word];
    const phrase = next.join(' ');
    const hyphen = next.join('-');
    if (!normalized.includes(phrase) || hyphen.length > 120) break;
    kept.push(word);
  }
  if (kept.length === 0) return null;
  return kept.join('-');
}

/** Validates lesson payload shape before recordLesson (wear path). */
export function ingestLessonShape(task, ctx = {}) {
  const text = String(task ?? '');
  const sessionId = ctx.sessionId ?? '';
  return {
    operation: text.slice(0, 512),
    success: true,
    taskIdPrefix: sessionId ? `wear:${sessionId}` : 'wear:anonymous',
    hasSession: sessionId.length > 0,
    signalHints: ['attestation-as-map', 'consumer-boundary', 'revalidation-required'].filter((s) =>
      text.toLowerCase().includes(s.split('-')[0]),
    ),
  };
}

export function assertIngestReady(shape) {
  if (!shape.hasSession) return { ok: false, reason: 'missing-session' };
  if (!shape.operation) return { ok: false, reason: 'missing-operation' };
  return { ok: true };
}
