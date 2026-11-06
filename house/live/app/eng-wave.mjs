/**
 * Eng-wave cut. A closed beat tips the next open beat in the same turn.
 * Quiet does not skip it. The cut never says the work waits for forge chat.
 */

const WAIT = /waits for forge chat/i;

function cardOf(row) {
  if (!row || typeof row !== 'object') return null;
  const repo = String(row.repo || '');
  const number = Number(row.number);
  if (!repo || !Number.isInteger(number) || number < 1) return null;
  return { repo, number, title: String(row.title || ''), sha: String(row.sha || ''), url: String(row.url || '') };
}

function sameCard(a, b) {
  return a && b && a.repo.toLowerCase() === b.repo.toLowerCase() && a.number === b.number;
}

export function cutAfterClose(close, opts = {}) {
  const card = cardOf(close);
  if (!card || close.closed !== true) return { op: 'skip', reason: 'not-closed' };
  const head = cardOf(opts.openHead);
  if (head && !sameCard(head, card)) return { op: 'hold', reason: 'head-open', card: head };
  const next = (Array.isArray(opts.candidates) ? opts.candidates : []).map(cardOf).find((row) => row && !sameCard(row, card));
  if (!next) return { op: 'block', reason: 'no-cut', note: 'NOTES no-cut: no next eng beat' };
  const name = `${next.repo}#${next.number}`;
  const comment = `@arch10x\n\nNext beat ${name}. ${next.title || 'Open eng beat.'}\n\n— forge\n`;
  const handoff = {
    seat: 'arch1',
    from: 'forge',
    to: 'arch1',
    type: 'packet',
    kind: 'ready',
    repo: next.repo,
    number: next.number,
    sha: next.sha,
    title: 'handoff ready',
    url: next.url || `https://github.com/${next.repo}/issues/${next.number}`,
    reason: 'eng-wave cut',
  };
  if (WAIT.test(comment) || WAIT.test(handoff.reason) || WAIT.test(String(opts.quiet || ''))) {
    return { op: 'block', reason: 'no-cut', note: 'NOTES no-cut: refused a chat wait' };
  }
  return { op: 'tip', card: next, comment, handoff };
}
