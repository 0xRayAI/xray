// A new card body always carries R and A. An existing raci line is left as written.

const SEAT = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function seatName(value, fallback) {
  const name = String(value || '').trim();
  if (SEAT.test(name)) return name;
  return fallback;
}

export function hasRaci(body) {
  const text = String(body || '');
  return /\bR=[A-Za-z]/.test(text) && /\bA=[A-Za-z]/.test(text) && /\braci\s*:/i.test(text);
}

export function ensurePacket(body, opts = {}) {
  const r = seatName(opts.r, 'forge');
  const a = seatName(opts.a, 'forge');
  const line = `raci: R=${r} A=${a}`;
  const text = String(body || '');
  if (hasRaci(text)) return text.endsWith('\n') ? text : `${text}\n`;
  const found = text.match(/^(#{1,6}[ \t]*packet[ \t]*)$/im);
  if (!found) {
    const trimmed = text.replace(/\s*$/, '');
    return `${trimmed ? `${trimmed}\n\n` : ''}## Packet\n${line}\n`;
  }
  const at = found.index + found[0].length;
  const next = `${text.slice(0, at)}\n${line}${text.slice(at)}`;
  return next.endsWith('\n') ? next : `${next}\n`;
}

/** Live and stalled cards. Closed, parked, and pinned cards stay quiet. */
export function openCardsMissingRaci(data) {
  const cards = Array.isArray(data) ? data : data && Array.isArray(data.cards) ? data.cards : null;
  if (!cards) return [];
  const bad = [];
  for (const card of cards) {
    if (!card || typeof card !== 'object' || card.pinned) continue;
    const state = String(card.state || 'live').toLowerCase();
    if (state === 'closed' || state === 'parked') continue;
    const raci = String((card.packet && card.packet.raci) || '');
    if (!/\bR=[A-Za-z]/.test(raci) || !/\bA=[A-Za-z]/.test(raci)) {
      bad.push(String(card.key || card.url || 'card'));
    }
  }
  return bad;
}
