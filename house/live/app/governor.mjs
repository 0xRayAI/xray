// Governor (tripwire), ported from house/live-mesh/tripwire_push.py (#227) into the server: one tick hashes what
// matters and acts only on a real change. The fingerprint is the real events (a feed_push record never trips it, so
// no self-loop; a generated_at bump never trips it) plus the open nudges (evalNudges) and routing state.
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

// Timed run (the clock). The tripwire is the trigger, on EITHER of two conditions once nothing has moved for tripMs:
//   stall: open cards on the board -> each seat with open work is woken with its own deadline (perSeatMs apart);
//   empty: no open cards -> the CoS (coord role) seat is woken to pull the next work.
// The CoS can start a run by hand (POST /clock). Blockers come back as one line; the countdown shows on the board until a
// seat moves something, which clears the clock. Each trigger fires at most once per window: it re-arms only after the
// board moves or another full window passes, never on every tick.
/** Seats marked parked or dark. A roster without those arrays uses fallback. */
export function mutedSeats(roster, fallback = []) {
  const data = roster && typeof roster === 'object' ? roster : {};
  const parked = Array.isArray(data.parked) ? data.parked : fallback;
  const dark = Array.isArray(data.dark) ? data.dark : [];
  return new Set([...parked, ...dark].map((seat) => String(seat).toLowerCase()).filter(Boolean));
}

export function createClock({ tripMs, perSeatMs, now = Date.now() }) {
  let lastFp = null, lastMove = now, lastTrip = null, run = null;
  const start = (t, seats, reason, by) => {
    const order = [...new Set(seats)].filter(Boolean);
    const deadlines = Object.fromEntries(order.map((s, i) => [s, new Date(t + (i + 1) * perSeatMs).toISOString()]));
    run = { started_at: new Date(t).toISOString(), reason, by: by || null, deadlines,
      ends_at: order.length ? deadlines[order.at(-1)] : new Date(t).toISOString() };
    lastTrip = t;
    return run;
  };
  return {
    get run() { return run; },
    /** -> 'stall' | 'empty' | 'cleared' | null.
     *  moveFp: fingerprint of seat moves (events, acks); board: { openCards, openSeats, coord }. */
    observe(moveFp, t, board) {
      if (moveFp !== lastFp) {
        const first = lastFp === null; lastFp = moveFp; lastMove = t; lastTrip = null;
        if (!first && run) { run = null; return 'cleared'; }
        return null;
      }
      const armed = lastTrip === null || t - lastTrip >= tripMs;
      if (!armed || t - lastMove < tripMs) return null;
      const { openCards = 0, openSeats = [], heldSeats = [], coord = null, scheduled = 0 } = board || {};
      if (openCards > 0) {
        if (!openSeats.length && heldSeats.length) return null;
        const seats = openSeats.length ? openSeats : [coord];
        if (!seats.filter(Boolean).length) return null;
        start(t, seats, 'stall'); return 'stall';
      }
      if (scheduled > 0) return null;   // a card waiting on start_after is not an empty board
      if (!coord) return null;
      start(t, [coord], 'empty'); return 'empty';
    },
    startByHand(t, seats, by) { return start(t, seats, 'cos', by); },
  };
}
