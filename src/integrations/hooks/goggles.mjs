/**
 * One plane at a time. Look at what is worn. Short digest. At most one move.
 * Not a power. Not a plate set.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hostTruthById } from './host-truth.mjs';

export const PLANES = ['host', 'house', 'counts'];

const HOUSE_ON = 'house on';
const HOUSE_OFF = 'house is not enabled here';

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function signalCount(file) {
  const data = readJson(file);
  if (!data) return null;
  if (Array.isArray(data.signals)) return data.signals.length;
  return null;
}

function wornHostId(root) {
  const boot = readJson(join(root, '.xray', 'state', 'session-boot.json'));
  const host = boot && typeof boot.host === 'string' ? boot.host : 'grok';
  return host;
}

function cardSignalCount(root) {
  try {
    const text = readFileSync(join(root, '.xray', 'state', 'STATION.md'), 'utf8');
    const match = text.match(/Repertoire: on — (\d+) signals/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function houseOff(hostId) {
  if (hostId === 'grok-bot') {
    return {
      digest: `${HOUSE_OFF}. The house is how this chat shares rules.`,
      one: 'Run grok-bot house init, then fill the six lines.',
    };
  }
  return {
    digest: `${HOUSE_OFF}. A missing house is not a broken suit.`,
    one: null,
  };
}

function houseLook(root, hostId) {
  const file = join(root, 'house', 'HOUSE.md');
  if (!existsSync(file)) return houseOff(hostId);
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return houseOff(hostId);
  }
  const unfilled = text.split(/\r?\n/).some((line) => /^\s*[-*]?\s*\(example\)/.test(line));
  if (unfilled) {
    return {
      digest: 'Example lines are still empty.',
      one: 'Fill the example lines in house/HOUSE.md.',
    };
  }
  return { digest: HOUSE_ON, one: null };
}

function countsLook(root) {
  const card = cardSignalCount(root);
  const project = signalCount(join(root, '.xray', 'state', 'repertoire', 'curated_signals.json'));
  const seed = signalCount(
    join(root, 'node_modules', '@0xray', 'repertoire', 'data', 'curated_signals.json'),
  );
  const cardBit = card == null ? 'no count' : String(card);
  const projectBit = project == null ? 'no file' : String(project);
  const seedBit = seed == null ? 'no seed' : String(seed);
  const digest = `The card says ${cardBit}. The project file has ${projectBit}. Doctor counts the package seed, which has ${seedBit}.`;
  const one =
    card != null && project != null && card !== project
      ? 'Count the project file on the card. Leave the package seed alone.'
      : null;
  return { digest, one };
}

function hostLook(hostId) {
  const row = hostTruthById(hostId);
  if (!row) {
    return {
      worn: hostId,
      digest: 'This chat is not on the card.',
      one: null,
    };
  }
  const one =
    row.id === 'grok'
      ? 'Read .xray/state/STATION.md after the chat dies. The host will not put it in the next message.'
      : null;
  return { worn: row.name, digest: row.line, one };
}

/** @returns {{ ok: true, plane: string, worn: string, digest: string, one: string | null } | { ok: false, error: string }} */
export function look(root, plane) {
  if (typeof plane !== 'string' || !PLANES.includes(plane)) {
    return { ok: false, error: 'Name one plane: host, house, or counts.' };
  }
  const hostId = wornHostId(root);
  if (plane === 'host') {
    const seen = hostLook(hostId);
    return { ok: true, plane, worn: seen.worn, digest: seen.digest, one: seen.one };
  }
  if (plane === 'house') {
    const seen = houseLook(root, hostId);
    const row = hostTruthById(hostId);
    return {
      ok: true,
      plane,
      worn: row ? row.name : hostId,
      digest: seen.digest,
      one: seen.one,
    };
  }
  const seen = countsLook(root);
  const row = hostTruthById(hostId);
  return {
    ok: true,
    plane,
    worn: row ? row.name : hostId,
    digest: seen.digest,
    one: seen.one,
  };
}

export function formatLook(result) {
  if (!result.ok) return result.error;
  return [
    `Plane: ${result.plane}`,
    `Worn: ${result.worn}`,
    `Digest: ${result.digest}`,
    `One: ${result.one || 'none'}`,
  ].join('\n');
}

function invokedAsScript() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedAsScript()) {
  const result = look(process.argv[3] || process.cwd(), process.argv[2]);
  process.stdout.write(`${formatLook(result)}\n`);
  process.exit(result.ok ? 0 : 1);
}
