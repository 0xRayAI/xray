#!/usr/bin/env node
/**
 * Runs a Grok hook from dist, or from src when a rebuild has removed dist.
 * The hook command stays on this file, which prebuild does not delete.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

export function resolveGrokHook(packageRoot, name) {
  const base = String(name || '');
  if (!base || base.includes('/') || base.includes('..') || !base.endsWith('.js')) return '';
  const candidates = [
    join(packageRoot, 'dist', 'integrations', 'grok', 'hooks', base),
    join(packageRoot, 'src', 'integrations', 'grok', 'hooks', base),
  ];
  return candidates.find((file) => existsSync(file)) || '';
}

function allow() {
  process.stdout.write('{"decision":"allow"}\n');
  process.exit(0);
}

async function main() {
  const name = process.argv[2];
  const hit = resolveGrokHook(root, name);
  if (!hit) allow();
  const extra = process.argv.slice(3);
  process.argv = [process.argv[0], hit, ...extra];
  try {
    await import(pathToFileURL(hit).href);
  } catch {
    allow();
  }
}

function samePath(left, right) {
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return left === right;
  }
}

const invoked = Boolean(process.argv[1]) && samePath(process.argv[1], fileURLToPath(import.meta.url));
if (invoked) await main();
