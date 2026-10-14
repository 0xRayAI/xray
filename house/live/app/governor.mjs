// Governor (tripwire), ported from house/live-mesh/tripwire_push.py (#227) into the server: one tick hashes what
// matters and acts only on a real change. The fingerprint is the real events (a feed_push record never trips it, so
// no self-loop; a generated_at bump never trips it) plus the watchdog state (stalled lines, routing, quiet seats).
import crypto from 'node:crypto';

export function realEvents(events) {
  return (Array.isArray(events) ? events : []).filter(e => !(e && typeof e === 'object' && e.kind === 'feed_push'));
}

export function fingerprint(events, watch = {}) {
  const ev = realEvents(events).map(e => [e.id, e.kind, e.t_ct, e.state ?? null, e.sha ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return crypto.createHash('sha256').update(JSON.stringify({ ev, watch })).digest('hex');
}

/** tripwire(): call once per tick with the current fingerprint; true only when it changed since the last call. */
export function tripwire() {
  let last = null;
  return fp => { if (fp === last) return false; last = fp; return true; };
}
