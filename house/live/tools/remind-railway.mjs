#!/usr/bin/env node
// One short inbox line per core seat. No model call. Never ack. Never print keys.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DUE = {
  station: 're-read the station skill and OP-PROC',
  watcher: 'the watcher check is grok-bot/OP-PROC.md#inbox-watcher',
  key: 'a GitHub App key expires soon',
  uncarded: 'open items with no card',
  stale: 'stale in-flight cards',
  unacked: 'unacked inbox lines',
  budget: 'budget state',
  'station-file': 'write station.md before yielding',
};

export function railwayLines(seats, dueBySeat = {}) {
  return (seats || []).map((seat) => {
    const parts = (dueBySeat[seat] || []).map((key) => DUE[key]).filter(Boolean);
    const title = parts.length ? parts.join('; ') : DUE.station;
    return { seat, title };
  });
}

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stdout.write('[]\n');
    return;
  }
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(railwayLines(input.seats, input.due))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
