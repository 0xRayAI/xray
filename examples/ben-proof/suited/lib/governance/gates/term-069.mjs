export const CODEX_TERM = 69;

/** No new MCP/skill/handler surface. */
export function evaluateTask(task, ctx = {}) {
  const text = String(task ?? '').toLowerCase();
  const hit =
    text.includes('.server.ts') || text.includes('skill.md') || text.includes('new mcp server');
  return {
    term: CODEX_TERM,
    title: 'No new surface',
    pass: !hit,
    hit,
    enforcement: 'blocking',
    sessionLen: String(ctx.sessionId ?? '').length,
    rationale: hit ? 'codex-69-surface-expansion-hint' : 'clean',
  };
}

export function gateSnapshot() {
  return { term: CODEX_TERM, enforced: true };
}
