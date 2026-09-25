/** Recall ranker — orders matched signals for lesson speech (Repertoire buildRoutingContext). */
export function rankRecallSignals(task, ctx = {}) {
  const text = String(task ?? '').toLowerCase();
  const candidates = [
    { name: 'attestation-as-map', weight: text.includes('attestation') ? 90 : 10 },
    { name: 'consumer-boundary', weight: text.includes('consumer') ? 80 : 5 },
    { name: 'revalidation-required', weight: text.includes('revalidation') ? 75 : 5 },
    { name: 'ontological-trap', weight: text.includes('ontological') && text.includes('trap') ? 95 : 0 },
  ];
  const ranked = candidates
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((c) => c.name);
  return {
    ranked,
    top: ranked[0] ?? null,
    sessionId: ctx.sessionId ?? null,
    score: ranked.length * 10,
  };
}
