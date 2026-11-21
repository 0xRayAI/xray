#!/usr/bin/env node
// A named bug, gap, follow-up, or ask without a GitHub issue, pull, or comment URL fails the turn.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openCardsMissingRaci } from './packet-body.mjs';

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

const REF_SRC = '([A-Za-z0-9_.-]+)#(\\d+)';

function refOf(repo, n) {
  return `${repo.toLowerCase()}#${n}`;
}

export function unclosedAfterMerge(text) {
  const merged = new Set();
  const fixes = new Set();
  const closed = new Set();
  for (const raw of turnSlice(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const mergeRe = new RegExp(`^-?\\s*merged\\s+${REF_SRC}\\b`, 'i');
    const fixRe = new RegExp(`(?:^|\\s)(?:fix(?:es|ed)?|closes?)\\s+${REF_SRC}\\b`, 'gi');
    const closedRe = new RegExp(`(?<!not\\s)closed\\s+${REF_SRC}\\b`, 'gi');
    const merge = line.match(mergeRe);
    if (merge) merged.add(refOf(merge[1], merge[2]));
    for (const hit of line.matchAll(fixRe)) fixes.add(refOf(hit[1], hit[2]));
    for (const hit of line.matchAll(closedRe)) closed.add(refOf(hit[1], hit[2]));
  }
  if (merged.size === 0) return [];
  return [...fixes].filter((r) => !merged.has(r) && !closed.has(r));
}

export { openCardsMissingRaci };

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

function parseArgs(argv) {
  const files = [];
  let gitDir = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--git') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        gitDir = next;
        i += 1;
      } else {
        gitDir = process.cwd();
      }
      continue;
    }
    files.push(arg);
  }
  return { files, gitDir };
}

async function cleanTreeReason(dir) {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '../../../src/nucleus/work-freshness.mjs'),
    join(here, '../../../dist/nucleus/work-freshness.mjs'),
    join(here, 'work-freshness.mjs'),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const mod = await import(pathToFileURL(file).href);
      if (typeof mod.localResidue === 'function') return mod.localResidue(dir);
    } catch {
      /* the next copy may load */
    }
  }
  return null;
}

async function main() {
  const { files, gitDir } = parseArgs(process.argv.slice(2));
  if (!files.length) {
    process.stderr.write('usage: exit-gate.mjs [--git [dir]] <file>...\n');
    process.exit(2);
  }
  const bad = [];
  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        bad.push(`${file}: missing file`);
        continue;
      }
      throw err;
    }
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const missing = openCardsMissingRaci(parsed);
        if (missing.length || Array.isArray(parsed) || (parsed && Array.isArray(parsed.cards))) {
          for (const key of missing) bad.push(`${file}: open card ${key} needs R A`);
          continue;
        }
      } catch {
        /* prose that happens to start with a brace */
      }
    }
    for (const line of unbackedDefects(text)) bad.push(`${file}: ${line}`);
    for (const ref of unclosedAfterMerge(text)) bad.push(`${file}: merged turn left ${ref} open`);
  }
  if (gitDir) {
    const reason = await cleanTreeReason(gitDir);
    if (reason === null) bad.push('clean-tree gate missing');
    else if (reason) bad.push(reason);
  }
  if (!bad.length) process.exit(0);
  process.stderr.write(bad.join('\n') + '\n');
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`${err && err.message ? err.message : err}\n`);
    process.exit(1);
  });
}
