export const CODEX_TERM = 11;

/** Type Safety First — mirrors PreToolUse deny patterns (term 11). */
export function evaluateTask(task, ctx = {}) {
  const text = String(task ?? '');
  const lower = text.toLowerCase();
  const tsIgnore = ['@', 'ts', '-', 'ignore'].join('');
  const tsExpect = ['@', 'ts', '-', 'expect', '-', 'error'].join('');
  const anyAnnot = [':', ' ', 'a', 'n', 'y'].join('');
  const anyCast = [' ', 'as', ' ', 'a', 'n', 'y'].join('');
  const dynamicEval = ['e', 'v', 'a', 'l', '('].join('');
  const needles = [dynamicEval, tsIgnore, tsExpect, anyAnnot, anyCast];
  const hit = needles.some((n) => lower.includes(n.toLowerCase()));
  return {
    term: CODEX_TERM,
    title: 'Type Safety First',
    pass: !hit,
    hit,
    enforcement: 'blocking',
    sessionLen: String(ctx.sessionId ?? '').length,
    rationale: hit ? 'codex-11-type-safety-violation-in-task-text' : 'clean',
  };
}

export function gateSnapshot() {
  return { term: CODEX_TERM, enforced: true, source: 'xray/.xray/codex.json term 11' };
}
