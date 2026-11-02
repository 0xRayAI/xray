#!/usr/bin/env node
// A named bug, gap, follow-up, or ask without a GitHub issue, pull, or comment URL fails the turn.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REF = /[A-Za-z0-9_.-]+#\d+|https:\/\/github\.com\/\S+\/(?:issues|pull|pulls)\/\d+/;
const DEFECT = /\b(?:bug|gap|follow-up|follow up|FU)\b|\bask:/i;

export function turnSlice(text) {
  const lines = String(text || '').split('\n');
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^##\s+\S/.test(lines[i])) continue;
    if (start < 0) start = i;
    else {
      end = i;
      break;
    }
  }
  if (start < 0) return lines.slice(0, 30).join('\n');
  return lines.slice(start, end).join('\n');
}

export function unbackedDefects(text) {
  const bad = [];
  for (const raw of turnSlice(text).split('\n')) {
    const line = raw.trim();
    if (!line || /^fell out:\s*nothing$/i.test(line)) continue;
    if (!DEFECT.test(line) || REF.test(line)) continue;
    bad.push(line);
  }
  return bad;
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    process.stderr.write('usage: exit-gate.mjs <file>...\n');
    process.exit(2);
  }
  const bad = [];
  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      if (err && err.code === 'ENOENT') continue;
      throw err;
    }
    for (const line of unbackedDefects(text)) bad.push(`${file}: ${line}`);
  }
  if (!bad.length) process.exit(0);
  process.stderr.write(bad.join('\n') + '\n');
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
