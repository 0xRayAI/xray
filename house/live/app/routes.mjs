// Route validation, same rules as tools/bifrost-init --check (#294): every fleet seat needs a route, and no rule may
// route to a seat outside the fleet. The server runs it at startup and flags problems on the board and in the log.
import fs from 'node:fs';
import path from 'node:path';

export function roleTargets(roles) {
  const out = new Map(), add = (s, why) => { const k = String(s).toLowerCase(); if (!out.has(k)) out.set(k, new Set()); out.get(k).add(why); };
  for (const [role, r] of Object.entries(roles?.seats || {})) if (r && typeof r === 'object' && !r.off && r.seat) add(r.seat, `seats.${role}`);
  for (const [seat, r] of Object.entries(roles?.extra_seats || {})) if (r && typeof r === 'object' && ['kinds', 'needles', 'merge_bases'].some(k => Array.isArray(r[k]) && r[k].length)) add(seat, 'extra_seats');
  for (const key of ['pr_heads', 'comment_watch']) for (const seat of Object.keys(roles?.[key]?.seats || {})) add(seat, key);
  const fb = roles?.fallback || {};
  for (const seat of [fb.seat, ...(Array.isArray(fb.from) ? fb.from : [])]) if (seat) add(seat, 'fallback');
  return out;
}

/** -> { ok, unrouted: [seat], unknown: [seat], error? } */
export function checkRoutes(roles, seats) {
  const t = roleTargets(roles), fleet = new Set(seats.map(s => String(s).toLowerCase()));
  const unrouted = [...fleet].filter(s => !t.has(s)).sort();
  const unknown = [...t.keys()].filter(s => !fleet.has(s)).sort();
  return { ok: !unrouted.length && !unknown.length, unrouted, unknown };
}

export function checkRoutesFromDir(dir, rosterFile) {
  try {
    const roles = JSON.parse(fs.readFileSync(path.join(dir, 'inbox-roles.json'), 'utf8'));
    const seats = JSON.parse(fs.readFileSync(rosterFile, 'utf8')).seats || [];
    if (!seats.length) return { ok: false, unrouted: [], unknown: [], error: 'no seats in the roster' };
    return checkRoutes(roles, seats);
  } catch (e) {
    return { ok: false, unrouted: [], unknown: [], error: 'routing not readable (' + (e.code || 'json') + ')' };
  }
}
