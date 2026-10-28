#!/usr/bin/env node
// Local reminder. Writes station.md. Says so when the board is unreachable.
// No model call. Never ack. Never print keys. Does not start a LaunchAgent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function stationText({ seat = 'arch1', due = [], boardReachable = true } = {}) {
  const lines = ['# station', '', `Seat: ${seat}`, ''];
  if (!boardReachable) lines.push('The board server is unreachable.', '');
  for (const item of due) lines.push(`- ${item}`);
  if (due.length) lines.push('');
  return `${lines.join('\n')}`;
}

export function writeStation(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function main() {
  const args = process.argv.slice(2);
  let out = '';
  let seat = 'arch1';
  let boardReachable = true;
  const due = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--out') out = args[++i] || '';
    else if (arg === '--seat') seat = args[++i] || seat;
    else if (arg === '--due') due.push(args[++i] || '');
    else if (arg === '--board' && args[i + 1] === 'down') {
      boardReachable = false;
      i += 1;
    }
  }
  if (!out) return;
  writeStation(out, stationText({ seat, due: due.filter(Boolean), boardReachable }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
