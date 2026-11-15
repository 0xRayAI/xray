#!/usr/bin/env node
// Flags a wake entrypoint that is not house/live/tools/live-inbox in the main checkout.
// A symlink to that file is the same entrypoint. A wrapper may name that path and no other live-inbox.
// This does not delete copies. It only names them.

import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function canonicalLiveInbox(root) {
  return path.resolve(root, 'house', 'live', 'tools', 'live-inbox');
}

function sameFile(a, b) {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

function inboxTokens(text) {
  return [...text.matchAll(/[^\s"'`]*live-inbox/g)].map((match) => match[0].replace(/^[A-Za-z_][A-Za-z0-9_]*=/, ''));
}

export function flagWakeEntrypoint(file, canonical) {
  let stat;
  try {
    stat = lstatSync(file);
  } catch {
    return { file, why: 'missing wake entrypoint' };
  }
  if (stat.isSymbolicLink() || stat.isFile()) {
    if (sameFile(file, canonical)) return null;
  }
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return { file, why: 'unreadable wake entrypoint' };
  }
  const hits = inboxTokens(text);
  if (hits.length === 0) {
    return { file, why: 'wake entrypoint is not the main-checkout live-inbox' };
  }
  const allowed = new Set([
    'house/live/tools/live-inbox',
    '$XRAY_MAIN/house/live/tools/live-inbox',
    '${XRAY_MAIN}/house/live/tools/live-inbox',
  ]);
  for (const hit of hits) {
    if (allowed.has(hit)) continue;
    if (path.isAbsolute(hit) && sameFile(hit, canonical)) continue;
    return { file, why: `wake entrypoint ${hit}` };
  }
  return null;
}

export function flagWakeEntrypoints(root, files) {
  const canonical = canonicalLiveInbox(root);
  const bad = [];
  for (const file of files) {
    const flag = flagWakeEntrypoint(file, canonical);
    if (flag) bad.push(flag);
  }
  return bad;
}

function take(argv, flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) return '';
  argv.splice(i, 2);
  return value;
}

function main() {
  const args = process.argv.slice(2);
  const root = take(args, '--root') || process.cwd();
  const files = [];
  while (args.includes('--entry')) {
    const file = take(args, '--entry');
    if (file) files.push(file);
  }
  if (!files.length) {
    process.stderr.write('usage: wake-doctor.mjs --root <checkout> --entry <path> [--entry <path>...]\n');
    process.exit(2);
  }
  const bad = flagWakeEntrypoints(root, files);
  if (!bad.length) {
    process.stdout.write('wake entrypoints: ok\n');
    process.exit(0);
  }
  for (const item of bad) process.stderr.write(`${item.file}: ${item.why}\n`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
