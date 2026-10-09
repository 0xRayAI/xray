// One activity line. The seat comes from the caller, never from the object.
export const ACT_KINDS = {
  prompt: ['received', 'sent'],
  turn: ['start', 'end', 'tick'],
  subagent: ['start', 'end', 'tick'],
  watcher: ['start', 'end', 'tick'],
  cloud_agent: ['launch', 'reply', 'finished', 'cancel'],
};
const ACT_FIELDS = new Set(['t_ct', 'kind', 'action', 'to', 'agent', 'tag']);
const ACT_BANNED = /body|text|message/i;
const ACT_VALUE = /^[A-Za-z0-9 ._:@#+\/-]{1,80}$/;
const ACT_AGENT = /^[A-Za-z0-9][A-Za-z0-9_-]{2,40}$/;

export function validActivity(d, now = Date.now()) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'not an object';
  for (const k of Object.keys(d)) {
    if (ACT_BANNED.test(k)) return 'free-text fields are not accepted';
    if (!ACT_FIELDS.has(k)) return 'unknown field';
  }
  for (const k of Object.keys(d)) {
    const v = d[k];
    if (typeof v !== 'string' || !ACT_VALUE.test(v)) return 'fields must be short plain strings';
    if (ACT_BANNED.test(v)) return 'free text is not accepted';
  }
  if (!ACT_KINDS[d.kind]) return 'bad kind';
  if (!ACT_KINDS[d.kind].includes(d.action)) return 'bad action for kind';
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d{1,6})?)?([+-]\d\d:\d\d|Z)$/.test(d.t_ct || '')) return 'bad t_ct';
  const t = Date.parse(d.t_ct);
  if (Number.isNaN(t) || t > now + 5 * 60000 || t < now - 24 * 3600000) return 't_ct out of range';
  if (d.kind === 'cloud_agent' && !ACT_AGENT.test(d.agent || '')) return 'cloud_agent needs agent id';
  if (d.agent != null && !ACT_AGENT.test(d.agent)) return 'bad agent id';
  if (d.tag != null && d.tag.length > 40) return 'tag too long';
  if (d.to != null && d.to.length > 40) return 'to too long';
  return null;
}

export function acceptLine(lines, d, seat, now = Date.now()) {
  const why = validActivity(d, now);
  if (why) return { ok: false, error: why };
  const line = { ...d, by: seat, seq: lines.length + 1 };
  lines.push(line);
  return { ok: true, seq: line.seq };
}
