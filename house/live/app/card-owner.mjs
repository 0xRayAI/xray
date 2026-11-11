// Card owner is a seat. A person never owns the card.

export const SEATS = new Set([
  'builder', 'builder-cloud', 'arch1', 'forge', 'critic', 'blinky',
  'herald', 'nibbler', 'sound', 'magnet', 'operator',
]);

const BOARD_OWNER_RE = /^[ \t]*Board-Owner:[ \t]*([A-Za-z][A-Za-z0-9_-]{0,31})[ \t]*$/im;

export function boardOwnerLine(body) {
  const match = BOARD_OWNER_RE.exec(String(body || ''));
  return match ? match[1].toLowerCase() : '';
}

export function cardOwner({ boardOwner, assignee, opener, cloud = false, operator = false, operatorSeat = 'operator' } = {}) {
  const named = String(boardOwner || '').trim().toLowerCase();
  if (SEATS.has(named)) return named;
  const who = String(assignee || '').trim().toLowerCase();
  if (SEATS.has(who)) return who;
  if (cloud || operator) {
    const op = String(operatorSeat || 'operator').trim().toLowerCase();
    if (SEATS.has(op)) return op;
  }
  const raw = String(opener || '').trim();
  if (SEATS.has(raw.toLowerCase())) return raw;
  return 'builder-cloud';
}

/** A stored owner that is not a seat becomes the default builder. An empty owner stays empty. */
export function seatOwnerOrBuilder(owner) {
  const raw = String(owner || '').trim();
  if (!raw) return '';
  if (SEATS.has(raw.toLowerCase())) return raw;
  return 'builder-cloud';
}
