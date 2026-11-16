// Playback math for a board replay. Wall time is America/Chicago when the stamp has no offset.

export function chicagoOffset(ms) {
  const part = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    timeZoneName: 'shortOffset',
    hour: '2-digit',
  }).formatToParts(new Date(ms)).find((item) => item.type === 'timeZoneName');
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part ? part.value : '');
  if (!match) return '-06:00';
  return `${match[1]}${match[2].padStart(2, '0')}:${match[3] || '00'}`;
}

export function parseWhen(text, now = Date.now()) {
  const raw = String(text || '').trim();
  if (!raw || /^now$/i.test(raw)) return now;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) {
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) throw new Error('bad time');
    return parsed;
  }
  const stamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  const guess = Date.parse(`${stamp}-06:00`);
  if (Number.isNaN(guess)) throw new Error('bad time');
  const parsed = Date.parse(stamp + chicagoOffset(guess));
  if (Number.isNaN(parsed)) throw new Error('bad time');
  return parsed;
}

// The page advances state.t by frame dt times this speed. secs is the wall-clock length.
export function replaySpeed(fromMs, toMs, secs) {
  const span = Number(toMs) - Number(fromMs);
  if (!(span > 0)) throw new Error('from must be before to');
  const target = Number(secs);
  if (!Number.isFinite(target) || target < 15 || target > 30) throw new Error('secs must be 15 to 30');
  return { secs: target, spanMs: span, speed: span / (target * 1000) };
}
