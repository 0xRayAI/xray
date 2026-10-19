// Wave schedule. A wave is the cards named in the fleet seed, in rank order.
// When every card in a wave is closed or merged, one "plan next wave" card is
// raised for the CoS seat with the ranked backlog of waves that are still open.
// The tripwire flags that card when the window passes and no new card appeared.
// This module only decides. It does not post to a board.

export const PLAN_TITLE = 'plan next wave';
export const PLAN_FLAG = 'nothing carded';

export function cardKey(card) {
  if (!card || typeof card !== 'object') return '';
  if (typeof card.key === 'string' && card.key) return card.key.toLowerCase();
  if (card.repo && card.number != null && card.number !== '') return `${String(card.repo).toLowerCase()}#${card.number}`;
  return '';
}

export function isPlanCard(card) {
  return !!(card && (card.kind === 'plan' || card.title === PLAN_TITLE));
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

/** 'closed' when every seeded card is on the board and closed or merged. Missing cards stay open. */
export function waveStatus(wave, cards) {
  if (!wave.cards.length) return 'open';
  const found = wave.cards.map((wanted) => findCard(wanted, cards));
  if (found.some((card) => !card)) return 'open';
  return found.every(cardClosed) ? 'closed' : 'live';
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

export function cardsFromSeed(seed, { now = Date.now(), coord = 'coord' } = {}) {
  const cards = [];
  for (const wave of seedWaves(seed)) {
    const wanted = wave.cards.length ? wave.cards : [{ title: wave.title }];
    for (const raw of wanted) {
      const key = cardKey(raw) || `wave:${wave.id.toLowerCase()}`;
      const number = raw.number != null && raw.number !== '' ? Number(raw.number) : null;
      const repo = raw.repo ? String(raw.repo) : '';
      cards.push({
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
          path: 'grok-bot/templates/house/bifrost-waves.json',
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
      });
    }
  }
  return cards;
}

function planFrom(seed, cards, coord, now) {
  const closed = seedWaves(seed).filter((wave) => waveStatus(wave, cards) === 'closed');
  if (!closed.length) return null;
  const backlog = rankedBacklog(seed, cards);
  if (!backlog.length) return null;
  const line = backlog.map((item) => `${item.rank}. ${item.wave} ${item.title}`).join('; ');
  const seen = cards.map(cardKey).filter((key) => key && key !== 'plan:next-wave');
  return {
    key: 'plan:next-wave',
    kind: 'plan',
    title: PLAN_TITLE,
    url: '',
    owner: coord || 'coord',
    stage: 'open',
    state: 'live',
    wave: closed[closed.length - 1].id,
    rank: 0,
    raised_at: now,
    flag: '',
    seen,
    backlog,
    packet: {
      goal: PLAN_TITLE,
      constraints: line.slice(0, 200),
      path: 'grok-bot/templates/house/bifrost-waves.json',
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

export function scheduleWaves(incoming, seed, opts = {}) {
  const now = opts.now || Date.now();
  const coord = opts.coord || 'coord';
  const tripMs = opts.tripMs > 0 ? opts.tripMs : 30 * 60000;
  const list = retainSeedCards(incoming, opts.prior, []).filter((card) => !(isPlanCard(card) && cardClosed(card)));
  const openPlan = list.find((card) => isPlanCard(card));
  let cards = list;
  if (!openPlan) {
    const plan = planFrom(seed, list, coord, now);
    if (plan) cards = [...list, plan];
  }
  let planDue = false;
  cards = cards.map((card) => {
    if (!isPlanCard(card) || cardClosed(card)) return card;
    const raised = Number(card.raised_at) || 0;
    const seen = new Set(Array.isArray(card.seen) ? card.seen.map((key) => String(key).toLowerCase()) : []);
    const carded = cards.some((other) => {
      if (isPlanCard(other)) return false;
      const key = cardKey(other);
      return key && !seen.has(key);
    });
    if (carded || !raised || now - raised < tripMs) {
      if (card.flag === PLAN_FLAG) return { ...card, flag: '' };
      return card;
    }
    planDue = true;
    if (card.flag === PLAN_FLAG) return card;
    return { ...card, flag: PLAN_FLAG };
  });
  const stamp = (rows) => JSON.stringify((rows || []).map((card) => [cardKey(card), card.flag || '', card.title, card.state, card.owner]));
  return { cards, planDue, changed: stamp(cards) !== stamp(incoming) };
}
