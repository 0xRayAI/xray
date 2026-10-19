// Wave schedule. A wave is the cards named in the fleet seed, in rank order.
// When a real wave is closed or merged, one "plan next wave" card is raised for
// the CoS seat. The card names the next open wave. The window is a Chicago cron,
// stored on the card, so a restart does not re-arm it. This module only decides.
// It does not post to a board.

import path from 'node:path';

export const PLAN_TITLE = 'plan next wave';
export const PLAN_FLAG = 'nothing carded';
export const DEFAULT_WINDOW = '0 9 * * 1';
export const BURN_QUIET = 0.75;
export const PLAN_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function cardKey(card) {
  if (!card || typeof card !== 'object') return '';
  if (typeof card.key === 'string' && card.key) return card.key.toLowerCase();
  if (card.repo && card.number != null && card.number !== '') return `${String(card.repo).toLowerCase()}#${card.number}`;
  return '';
}

export function isPlanCard(card) {
  return !!(card && (card.kind === 'plan' || card.title === PLAN_TITLE));
}

/** Live cards that are open work. A plan card is the scheduler's, not a stalled seat. */
export function liveWorkCount(cards) {
  return (Array.isArray(cards) ? cards : []).filter((card) => card && card.state === 'live' && !isPlanCard(card)).length;
}

export function isSyntheticCard(card) {
  if (!card || typeof card !== 'object' || isPlanCard(card)) return false;
  const number = card.number != null && card.number !== '' ? Number(card.number) : NaN;
  return !card.repo || !Number.isInteger(number);
}

export function cardClosed(card) {
  if (!card || typeof card !== 'object') return false;
  const state = String(card.state || '').toLowerCase();
  const stage = String(card.stage || '').toLowerCase();
  if (state === 'closed' || state === 'merged' || stage === 'done') return true;
  const beats = Array.isArray(card.beats) ? card.beats : [];
  return beats.some((beat) => {
    const what = String(beat && (beat.what || beat.kind) || '').toLowerCase();
    return what === 'merged' || what.startsWith('merged ');
  });
}

export function seedWaves(seed) {
  const waves = Array.isArray(seed && seed.waves) ? seed.waves : [];
  return waves
    .map((wave, index) => ({
      id: String(wave && wave.id || ''),
      rank: Number.isFinite(wave && wave.rank) ? wave.rank : index + 1,
      title: String(wave && wave.title || ''),
      cards: Array.isArray(wave && wave.cards) ? wave.cards : [],
    }))
    .filter((wave) => wave.id)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

export function chicagoParts(ms) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const map = {};
  for (const part of fmt.formatToParts(new Date(ms))) map[part.type] = part.value;
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekday: WEEKDAY[map.weekday],
  };
}

function cronAtom(field, value, sunday) {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    const stepBits = part.split('/');
    const step = stepBits.length > 1 ? Number(stepBits[1]) : 0;
    const base = stepBits[0];
    const norm = (n) => (sunday && n === 7 ? 0 : n);
    if (base.includes('-')) {
      const [a, b] = base.split('-').map((n) => norm(Number(n)));
      if (value < a || value > b) return false;
      return step ? (value - a) % step === 0 : true;
    }
    if (base === '*') return step ? value % step === 0 : true;
    const start = norm(Number(base));
    if (!step) return value === start;
    return value >= start && (value - start) % step === 0;
  });
}

export function cronMatches(cron, ms) {
  const bits = String(cron || '').trim().split(/\s+/);
  if (bits.length < 5) return false;
  const [minute, hour, dom, month, dow] = bits;
  const parts = chicagoParts(ms);
  if (!cronAtom(minute, parts.minute, false)) return false;
  if (!cronAtom(hour, parts.hour, false)) return false;
  if (!cronAtom(month, parts.month, false)) return false;
  const dayOk = cronAtom(dom, parts.day, false);
  const weekOk = cronAtom(dow, parts.weekday, true);
  if (dom === '*' && dow === '*') return true;
  if (dom === '*') return weekOk;
  if (dow === '*') return dayOk;
  return dayOk || weekOk;
}

export function nextChicagoCron(cron, fromMs) {
  const start = fromMs - (fromMs % 60000) + 60000;
  const end = fromMs + 8 * 24 * 60 * 60000;
  for (let t = start; t <= end; t += 60000) {
    if (cronMatches(cron, t)) return t;
  }
  return end;
}

export function burnQuiet(weeklyBurn) {
  const n = Number(weeklyBurn);
  return Number.isFinite(n) && n >= BURN_QUIET;
}

function findCard(wanted, cards) {
  const key = cardKey(wanted);
  const repo = wanted && wanted.repo ? String(wanted.repo).toLowerCase() : '';
  const number = wanted && wanted.number != null && wanted.number !== '' ? Number(wanted.number) : null;
  return (Array.isArray(cards) ? cards : []).find((card) => {
    if (key && cardKey(card) === key) return true;
    if (repo && number != null && String(card.repo || '').toLowerCase() === repo && Number(card.number) === number) return true;
    return false;
  }) || null;
}

/** 'closed' when every real seeded card is on the board and closed or merged. A card with no GitHub number is closed. Missing real cards stay open. */
export function waveStatus(wave, cards) {
  if (!wave.cards.length) return 'open';
  const real = wave.cards.filter((wanted) => !isSyntheticCard(wanted));
  if (!real.length) return 'closed';
  let missing = false;
  let open = false;
  for (const wanted of real) {
    const card = findCard(wanted, cards);
    if (!card) { missing = true; continue; }
    if (!cardClosed(card)) open = true;
  }
  if (open) return 'live';
  if (missing) return 'open';
  return 'closed';
}

export function rankedBacklog(seed, cards) {
  return seedWaves(seed)
    .filter((wave) => waveStatus(wave, cards) !== 'closed')
    .map((wave) => ({
      rank: wave.rank,
      wave: wave.id,
      title: wave.title,
      cards: wave.cards.map(cardKey).filter(Boolean),
    }));
}

export function nextWave(seed, cards) {
  return rankedBacklog(seed, cards)[0] || null;
}

function realWaveClosed(seed, cards) {
  return seedWaves(seed).some((wave) => wave.cards.some((wanted) => !isSyntheticCard(wanted)) && waveStatus(wave, cards) === 'closed');
}

function closeSynthetic(card) {
  if (!isSyntheticCard(card)) return card;
  return { ...card, state: 'closed', stage: 'done' };
}

export function cardsFromSeed(seed, { now = Date.now(), coord = 'coord' } = {}) {
  const cards = [];
  for (const wave of seedWaves(seed)) {
    const wanted = wave.cards.length ? wave.cards : [{ title: wave.title }];
    for (const raw of wanted) {
      const key = cardKey(raw) || `wave:${wave.id.toLowerCase()}`;
      const number = raw.number != null && raw.number !== '' ? Number(raw.number) : null;
      const repo = raw.repo ? String(raw.repo) : '';
      cards.push(closeSynthetic({
        key,
        repo,
        number,
        title: String(raw.title || wave.title),
        url: raw.url || (repo && number ? `https://github.com/${repo}/issues/${number}` : ''),
        owner: raw.owner || coord,
        stage: raw.stage || 'open',
        state: raw.state || 'live',
        kind: raw.kind || (number ? 'issue' : 'wave'),
        wave: wave.id,
        rank: wave.rank,
        packet: {
          goal: String(raw.title || wave.title).slice(0, 200),
          constraints: `wave ${wave.id}`.slice(0, 200),
          path: 'house/bifrost-waves.json',
          acceptance: 'the wave card is closed or merged',
          evidence: '',
          'next owner': raw.owner || coord,
          escalate: 'coordinator',
        },
        packet_ok: true,
        missing: [],
        beats: [],
        last_beat_t: now,
        stall: false,
        raised_at: now,
      }));
    }
  }
  return cards;
}

/** Cards an apply may put on the board: the one current wave, never a synthetic card and never every wave. */
export function postedCards(seed, opts = {}) {
  const all = cardsFromSeed(seed, opts);
  const next = nextWave(seed, all);
  if (!next) return [];
  return all.filter((card) => card.wave === next.wave && !isSyntheticCard(card) && !cardClosed(card));
}

function planFrom(seed, cards, coord, now, window) {
  if (!realWaveClosed(seed, cards)) return null;
  const next = nextWave(seed, cards);
  if (!next) return null;
  const backlog = [next];
  const line = `${next.rank}. ${next.wave} ${next.title}`;
  const seen = cards.map(cardKey).filter((key) => key && key !== 'plan:next-wave');
  const due = nextChicagoCron(window, now);
  return {
    key: 'plan:next-wave',
    kind: 'plan',
    title: PLAN_TITLE,
    url: '',
    owner: coord || 'coord',
    stage: 'open',
    state: 'live',
    wave: next.wave,
    rank: 0,
    raised_at: now,
    due_at: due,
    flag: '',
    seen,
    backlog,
    packet: {
      goal: PLAN_TITLE,
      constraints: line.slice(0, 200),
      path: 'house/bifrost-waves.json',
      acceptance: 'the next wave is carded',
      evidence: '',
      'next owner': coord || 'coord',
      escalate: 'tripwire',
    },
    packet_ok: true,
    missing: [],
    beats: [],
    last_beat_t: now,
    stall: false,
  };
}

function refreshPlan(card, fresh, now, nudgeMs) {
  const same = JSON.stringify(card.backlog || []) === JSON.stringify(fresh.backlog || [])
    && (card.packet || {}).constraints === (fresh.packet || {}).constraints;
  const beat = Number(card.last_beat_t) || 0;
  const stale = !beat || now - beat >= nudgeMs;
  return {
    ...fresh,
    raised_at: card.raised_at || fresh.raised_at,
    due_at: card.due_at || fresh.due_at,
    last_beat_t: !same || stale ? now : beat,
    flag: card.flag || '',
    beats: Array.isArray(card.beats) ? card.beats : [],
    seen: Array.isArray(card.seen) ? card.seen : fresh.seen,
  };
}

function waveOf(card) {
  const backlog = Array.isArray(card && card.backlog) ? card.backlog : [];
  const named = backlog[0] && backlog[0].wave;
  return String(named || (card && card.wave) || '');
}

function planAgeExpired(card, now, expireMs) {
  const raised = Number(card && card.raised_at) || 0;
  return raised > 0 && now - raised >= expireMs;
}

function expirePlan(card, now) {
  return { ...card, state: 'closed', stage: 'done', flag: 'expired', last_beat_t: now };
}

/** Keep a plan card and loaded wave cards the collector does not send. Earlier cards win on key. */
export function retainSeedCards(collector, prior, seedCards) {
  const base = Array.isArray(collector) ? collector.slice() : [];
  const have = new Set(base.map(cardKey).filter(Boolean));
  const extras = [...(Array.isArray(prior) ? prior : []), ...(Array.isArray(seedCards) ? seedCards : [])];
  for (const card of extras) {
    const key = cardKey(card);
    if (!key || have.has(key)) continue;
    if (!isPlanCard(card) && !card.wave && card.kind !== 'wave' && card.kind !== 'plan') continue;
    base.push(card);
    have.add(key);
  }
  return base;
}

function oneWave(list, seed) {
  const kept = list.filter((card) => isPlanCard(card) || !isSyntheticCard(card));
  const next = nextWave(seed, kept);
  const id = next ? next.wave : '';
  return kept.filter((card) => {
    if (isPlanCard(card) || !card.wave) return true;
    if (cardClosed(card)) return true;
    return card.wave === id;
  });
}

export function scheduleWaves(incoming, seed, opts = {}) {
  const now = opts.now || Date.now();
  const coord = opts.coord || 'coord';
  const window = opts.window || (seed && seed.window) || DEFAULT_WINDOW;
  const nudgeMs = opts.nudgeMs > 0 ? opts.nudgeMs : 60 * 60000;
  const expireMs = opts.expireMs > 0 ? opts.expireMs : PLAN_EXPIRE_MS;
  const quiet = burnQuiet(opts.weeklyBurn);
  const list = oneWave(
    retainSeedCards(incoming, opts.prior, []).filter((card) => {
      if (!isPlanCard(card) || !cardClosed(card)) return true;
      return card.flag === 'expired';
    }),
    seed,
  );
  const openPlan = list.find((card) => isPlanCard(card) && !cardClosed(card));
  const expiredPlan = list.find((card) => isPlanCard(card) && card.flag === 'expired');
  const fresh = quiet ? null : planFrom(seed, list, coord, now, window);
  let cards = list;
  if (fresh && openPlan) {
    cards = list.map((card) => {
      if (!isPlanCard(card) || cardClosed(card)) return card;
      const refreshed = refreshPlan(card, fresh, now, nudgeMs);
      if (waveOf(card) === waveOf(fresh)) return refreshed;
      return { ...refreshed, raised_at: now, state: 'live', stage: 'open', flag: '' };
    });
  } else if (fresh && expiredPlan && waveOf(expiredPlan) === waveOf(fresh)) {
    cards = list;
  } else if (fresh && expiredPlan) {
    cards = list.map((card) => (isPlanCard(card) ? fresh : card));
  } else if (fresh) {
    cards = [...list, fresh];
  } else if (openPlan && quiet) {
    cards = list.map((card) => (isPlanCard(card) && !cardClosed(card) ? { ...card, last_beat_t: now, flag: '' } : card));
  }
  cards = cards.map((card) => {
    if (!isPlanCard(card) || cardClosed(card)) return card;
    if (!planAgeExpired(card, now, expireMs)) return card;
    return expirePlan(card, now);
  });
  let planDue = false;
  cards = cards.map((card) => {
    if (!isPlanCard(card) || cardClosed(card)) return card;
    const dueAt = Number(card.due_at) || Date.parse(card.due_at) || 0;
    const seen = new Set(Array.isArray(card.seen) ? card.seen.map((key) => String(key).toLowerCase()) : []);
    const carded = cards.some((other) => {
      if (isPlanCard(other)) return false;
      const key = cardKey(other);
      return key && !seen.has(key);
    });
    if (carded || quiet || !dueAt || now < dueAt) {
      if (card.flag === PLAN_FLAG) return { ...card, flag: '' };
      return card;
    }
    planDue = true;
    if (card.flag === PLAN_FLAG) return card;
    return { ...card, flag: PLAN_FLAG };
  });
  const stamp = (rows) => JSON.stringify((rows || []).map((card) => [
    cardKey(card), card.flag || '', card.title, card.state, card.owner,
    card.last_beat_t || 0, card.due_at || '', ((card.backlog || []).map((item) => item.wave)).join(','),
  ]));
  return { cards, planDue, changed: stamp(cards) !== stamp(incoming) };
}

/** House file first (OP-PROC). The bundled copy beside the server is what the image can read. */
export function resolveWaveSeed(appDir, env = {}, exists = () => false) {
  if (env.BIFROST_WAVE_SEED) return env.BIFROST_WAVE_SEED;
  const house = path.join(appDir, '..', '..', '..', 'house', 'bifrost-waves.json');
  if (exists(house)) return house;
  return path.join(appDir, 'bifrost-waves.json');
}
