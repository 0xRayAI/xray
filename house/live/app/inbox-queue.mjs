// The default seat read is a queue head. Stored lines stay until close, merge, or an ack.
// Ready handoffs, a hotfix, and P0/P1 are the head. While that head is open, nudges and
// station lines stay in the backlog. A read does not pop.

const P_MARK = /\bP[01]\b/;
const HEAD_KINDS = new Set(['ready', 'merge', 'critic_fail', 'ci_fail', 'live_pass']);

export function lineRank(line) {
  const type = String(line && line.type || '').toLowerCase();
  const kind = String(line && line.kind || '').toLowerCase();
  const title = String(line && line.title || '');
  const reason = String(line && line.reason || '');
  const labels = Array.isArray(line && line.labels) ? line.labels.join(' ') : '';
  const text = `${title}\n${reason}\n${labels}`;
  if (type === 'packet' && HEAD_KINDS.has(kind)) return 0;
  if (/^hotfix:/i.test(title) || P_MARK.test(text)) return 1;
  if (kind === 'station') return 4;
  if (type === 'nudge') return 3;
  return 2;
}

function byAge(a, b) {
  const ta = String(a.line.t_ct || '');
  const tb = String(b.line.t_ct || '');
  if (ta < tb) return -1;
  if (ta > tb) return 1;
  return a.index - b.index;
}

function ranked(lines) {
  return (Array.isArray(lines) ? lines : []).filter(Boolean).map((line, index) => ({ line, index, rank: lineRank(line) }));
}

function pick(rows, rank) {
  return rows.filter((row) => row.rank === rank).sort(byAge).map((row) => row.line);
}

export function queueView(lines) {
  const rows = ranked(lines);
  const head = [...pick(rows, 0), ...pick(rows, 1)];
  if (head.length) return head;
  const real = pick(rows, 2);
  if (real.length) return real;
  const nudge = pick(rows, 3);
  if (nudge.length) return [nudge[0]];
  const station = pick(rows, 4);
  if (station.length) return [station[station.length - 1]];
  return [];
}

export function backlogOf(lines) {
  const head = new Set(queueView(lines).map((line) => line && line.id));
  return (Array.isArray(lines) ? lines : []).filter((line) => line && !head.has(line.id));
}

export function keepStation(lines) {
  return !(Array.isArray(lines) ? lines : []).some(Boolean);
}
