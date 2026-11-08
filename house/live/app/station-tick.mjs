// Weekday station reminder for the board process. The plist template is not loaded.
// The house clock stays America/Chicago. An owner clock covers only the station nudge.
import { readFileSync } from 'node:fs';
import { chicagoStamp } from './chicago-stamp.mjs';

export const STATION_SENTENCE = 'Run station and re-read OP-PROC';
const CORE = ['forge', 'critic', 'blinky'];
const HM = /^(\d{2}):(\d{2})$/;

function wall(when, zone) {
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(d).map((part) => [part.type, part.value]));
    if (!parts.year || parts.hour == null || parts.minute == null) return null;
    return parts;
  } catch {
    return null;
  }
}

function minutes(text) {
  const match = HM.exec(String(text || ''));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseOwnerClock(text) {
  let raw;
  try {
    raw = JSON.parse(String(text || ''));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const zone = String(raw.zone || '').trim();
  if (!zone || !wall(new Date(), zone)) return null;
  const start = minutes(raw.start || (Array.isArray(raw.window) ? raw.window[0] : ''));
  const end = minutes(raw.end || (Array.isArray(raw.window) ? raw.window[1] : ''));
  if (start == null || end == null || start > end) return null;
  const seats = [];
  for (const id of Array.isArray(raw.seats) ? raw.seats : []) {
    const name = String(id || '').toLowerCase();
    if (name && !seats.includes(name)) seats.push(name);
  }
  if (!seats.length) return null;
  return { zone, start, end, seats };
}

export function loadOwnerClock(file) {
  if (!file) return null;
  try {
    return parseOwnerClock(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function stationHourKey(when, clock) {
  const d = when instanceof Date ? when : new Date(when);
  if (Number.isNaN(d.getTime())) return null;
  if (clock) {
    const parts = wall(d, clock.zone);
    if (!parts || parts.weekday === 'Sat' || parts.weekday === 'Sun') return null;
    const now = Number(parts.hour) * 60 + Number(parts.minute);
    if (now < clock.start || now > clock.end) return null;
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}`;
  }
  const stamp = chicagoStamp(d.getTime());
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):/.exec(stamp || '');
  if (!match) return null;
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
  }).format(d);
  if (weekday === 'Sat' || weekday === 'Sun') return null;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (hour < 7 || hour > 17 || minute < 30) return null;
  return `${match[1]}T${match[2]}`;
}

export function stationSeats(ids, clock) {
  const have = new Set();
  for (const id of ids || []) {
    const name = String(id || '').toLowerCase();
    if (name) have.add(name);
  }
  if (clock) return clock.seats.filter((seat) => have.has(seat));
  const seats = CORE.filter((seat) => have.has(seat));
  if (have.has('arch1')) seats.push('arch1');
  return seats;
}

export function stationLines(hour, seats, now) {
  const when = now instanceof Date ? now : new Date(now || Date.now());
  const t = Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString();
  return (seats || []).map((seat) => ({
    id: `nudge:station:${seat}:${hour}`,
    t_ct: t,
    seat,
    from: seat,
    to: seat,
    type: 'nudge',
    kind: 'station',
    repo: '',
    number: 0,
    title: STATION_SENTENCE,
    url: '',
    reason: STATION_SENTENCE,
  }));
}

export function stationDue(when, postedHour, ids, clock) {
  const hour = stationHourKey(when, clock);
  if (!hour || hour === postedHour) return null;
  const seats = stationSeats(ids, clock);
  if (!seats.length) return null;
  return { hour, lines: stationLines(hour, seats, when) };
}
