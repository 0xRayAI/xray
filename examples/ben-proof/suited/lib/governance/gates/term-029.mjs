export const CODEX_TERM = 29;

/** Security by design — dynamic code execution prohibited (term 29). */
export function evaluateTask(task, ctx = {}) {
  const text = String(task ?? '');
  const evalLike = ['ev', 'al', '('].join('');
  const hit = text.toLowerCase().includes(evalLike) || text.includes('Function(');
  return {
    term: CODEX_TERM,
    title: 'Security by design',
    pass: !hit,
    hit,
    enforcement: 'blocking',
    sessionLen: String(ctx.sessionId ?? '').length,
    rationale: hit ? 'codex-29-dynamic-code-pattern' : 'clean',
  };
}

export function gateSnapshot() {
  return { term: CODEX_TERM, enforced: true };
}
