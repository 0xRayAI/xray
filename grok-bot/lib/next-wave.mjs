// The first open wave. This copy ships inside @0xray/grok-bot.
// The board scheduler stays in house/live/app/wave-schedule.mjs.

export function cardKey(card) {
  if (!card || typeof card !== 'object') return '';
  if (typeof card.key === 'string' && card.key) return card.key.toLowerCase();
  if (card.repo && card.number != null && card.number !== '') {
    return `${String(card.repo).toLowerCase()}#${card.number}`;
  }
  return '';
}

function isPlanCard(card) {
  return !!(card && (card.kind === 'plan' || card.title === 'plan next wave'));
}

function isSyntheticCard(card) {
  if (!card || typeof card !== 'object' || isPlanCard(card)) return false;
  const number = card.number != null && card.number !== '' ? Number(card.number) : NaN;
  return !card.repo || !Number.isInteger(number);
}

function cardClosed(card) {
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

function seedWaves(seed) {
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

function waveStatus(wave, cards) {
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

export function nextWave(seed, cards) {
  const open = seedWaves(seed)
    .filter((wave) => waveStatus(wave, cards) !== 'closed')
    .map((wave) => ({
      rank: wave.rank,
      wave: wave.id,
      title: wave.title,
      cards: wave.cards.map(cardKey).filter(Boolean),
    }));
  return open[0] || null;
}
