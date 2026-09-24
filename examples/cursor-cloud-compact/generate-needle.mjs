#!/usr/bin/env node
/**
 * Build a token-sized chat fill pile for Cursor cloud compaction needle tests.
 * Size is measured with gpt-tokenizer (same family as Composer token accounting).
 * The hidden fact comes from NEEDLE_FACT — never hardcode secrets in this file.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from 'gpt-tokenizer';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, 'needle-pile.txt');

function parseArgs(argv) {
  let tokens = 180_000;
  let at = null;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tokens' && argv[i + 1]) {
      tokens = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (arg.startsWith('--tokens=')) {
      tokens = Number.parseInt(arg.slice('--tokens='.length), 10);
      continue;
    }
    if (arg === '--at' && argv[i + 1]) {
      at = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (arg.startsWith('--at=')) {
      at = Number.parseInt(arg.slice('--at='.length), 10);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`Usage: NEEDLE_FACT='…' node generate-needle.mjs [--tokens N] [--at index]

  --tokens N   Target token count (default 180000)
  --at index   Paragraph index for NEEDLE_FACT (default ~40% through pile)
`);
      process.exit(0);
    }
  }
  if (!Number.isFinite(tokens) || tokens < 1) {
    process.stderr.write('Invalid --tokens\n');
    process.exit(1);
  }
  if (at !== null && (!Number.isFinite(at) || at < 0)) {
    process.stderr.write('Invalid --at\n');
    process.exit(1);
  }
  return { tokens, at };
}

function paragraphBody(index) {
  const salt = (index * 1_009 + 7) % 10_007;
  return [
    `Paragraph ${index}:`,
    `Compaction harness block ${index} carries unique mass for tokenizer sizing.`,
    `Index ${index} references lattice ${salt} and orbit ${index % 991}.`,
    `Entropy tag ${index}-${index * index} must not repeat another paragraph.`,
    `Filler line ${index} discusses observability without substituting for host context fields.`,
  ].join(' ');
}

function countTokens(text) {
  return encode(text).length;
}

function buildPile(targetTokens) {
  const paragraphs = [];
  let index = 1;
  while (true) {
    const next = [...paragraphs, paragraphBody(index)].join('\n\n');
    const tokens = countTokens(next);
    if (tokens > targetTokens * 1.02 && paragraphs.length > 0) {
      break;
    }
    paragraphs.push(paragraphBody(index));
    index += 1;
    if (tokens >= targetTokens * 0.98) {
      break;
    }
    if (index > 200_000) {
      throw new Error('paragraph guard tripped');
    }
  }

  let text = paragraphs.join('\n\n');
  let tokens = countTokens(text);
  const padWord = 'tokenpad';
  let padN = 0;
  while (tokens < targetTokens * 0.98 && paragraphs.length > 0) {
    paragraphs[paragraphs.length - 1] += ` ${padWord}${padN}`;
    padN += 1;
    text = paragraphs.join('\n\n');
    tokens = countTokens(text);
    if (padN > 500_000) {
      break;
    }
  }

  while (tokens > targetTokens * 1.02 && paragraphs.length > 1) {
    paragraphs.pop();
    text = paragraphs.join('\n\n');
    tokens = countTokens(text);
  }

  return { paragraphs, text, tokens };
}

function main() {
  const fact = process.env.NEEDLE_FACT;
  if (!fact || !String(fact).trim()) {
    process.stderr.write('Set NEEDLE_FACT to the hidden sentence (not committed).\n');
    process.exit(1);
  }

  const { tokens: targetTokens, at: atArg } = parseArgs(process.argv);
  const { paragraphs } = buildPile(targetTokens);

  const needleIndex =
    atArg !== null ? atArg : Math.floor(paragraphs.length * 0.4);
  if (needleIndex < 0 || needleIndex >= paragraphs.length) {
    process.stderr.write(`--at ${needleIndex} out of range (0..${paragraphs.length - 1})\n`);
    process.exit(1);
  }

  paragraphs[needleIndex] = `${paragraphs[needleIndex]}\n\n${String(fact).trim()}`;

  const finalText = paragraphs.join('\n\n');
  const finalTokens = countTokens(finalText);

  writeFileSync(outPath, finalText, 'utf8');
  process.stdout.write(`${finalTokens}\n`);
}

main();
