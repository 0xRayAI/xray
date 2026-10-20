#!/usr/bin/env node
// Load the Bifrost wave seed. Prints the cards. Does not post unless --apply.
// --apply refuses the production board unless BIFROST_SEED_APPLY=1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardsFromSeed, postedCards, seedWaves } from '../app/wave-schedule.mjs';

// The public board is https://bifrost.0xray.dev.
// burst-live-production.up.railway.app is the direct service behind that host.
// A seed apply to either hits production.
const LIVE_HOSTS = new Set([
  'bifrost.0xray.dev',
  'burst-live-production.up.railway.app',
]);
const DEFAULT_SEED = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'bifrost-waves.json');

function arg(name, argv) {
  const i = argv.indexOf(name);
  if (i < 0) return '';
  return argv[i + 1] || '';
}

export function loadSeedFile(file) {
  const seed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!seed || !Array.isArray(seed.waves)) throw new Error('wave seed needs a waves array');
  return seed;
}

export function refuseLiveApply(url, applyFlag) {
  if (applyFlag === '1') return '';
  let host = '';
  try { host = new URL(url).host; } catch { return 'LIVE_URL is not a URL'; }
  if (LIVE_HOSTS.has(host)) return 'refusing to post the seed to the live board';
  return '';
}

function payload(seed, now = Date.now()) {
  return { updated_ct: new Date(now).toISOString(), cards: cardsFromSeed(seed, { now }) };
}

async function main(argv) {
  const seedPath = arg('--seed', argv) || DEFAULT_SEED;
  const outPath = arg('--out', argv);
  const apply = argv.includes('--apply');
  const seed = loadSeedFile(seedPath);
  const body = payload(seed);
  const text = `${JSON.stringify(body, null, 2)}\n`;
  if (outPath) fs.writeFileSync(outPath, text);
  else process.stdout.write(text);
  const posting = postedCards(seed);
  process.stderr.write(`loaded ${body.cards.length} cards in ${seedWaves(seed).length} waves from ${seedPath}\n`);
  process.stderr.write(`current wave posts ${posting.length} card(s)\n`);
  if (!apply) {
    process.stderr.write('not posted\n');
    return;
  }
  const url = process.env.LIVE_URL || '';
  if (!url) throw new Error('LIVE_URL is required for --apply');
  const refused = refuseLiveApply(url, process.env.BIFROST_SEED_APPLY);
  if (refused) throw new Error(refused);
  const secret = process.env.INGEST_SECRET || '';
  if (!secret) throw new Error('INGEST_SECRET is required for --apply');
  const res = await fetch(new URL('/cards/seed', url), {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(seed),
  });
  if (!res.ok) throw new Error(`seed post failed: ${res.status}`);
  process.stderr.write('posted\n');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(2);
  });
}
