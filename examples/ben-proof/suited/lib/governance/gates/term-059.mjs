export const CODEX_TERM = 59;

/** Complex work → orchestrator intake (spawn_subagent without plan). */
export function evaluateTask(task, ctx = {}) {
  const text = String(task ?? '').toLowerCase();
  const hit = text.includes('spawn_subagent') && !text.includes('analyze-complexity');
  return {
    term: CODEX_TERM,
    title: 'Complex work orchestrator intake',
    pass: !hit,
    hit,
    enforcement: 'blocking',
    sessionLen: String(ctx.sessionId ?? '').length,
    rationale: hit ? 'codex-59-spawn-without-plan-hint' : 'clean',
  };
}

export function gateSnapshot() {
  return { term: CODEX_TERM, enforced: true };
}
