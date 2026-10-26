#!/usr/bin/env node
/**
 * Runs a Grok hook from dist, or from src when a rebuild has removed dist.
 * The hook command stays on this file, which prebuild does not delete.
 *
 * UserPromptSubmit rejects decision "allow". A prompt or compact command
 * that omits the script name loads session-start.js. A miss on those
 * events prints no decision.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const SESSION_EVENTS = new Set([
  'user_prompt_submit',
  'pre_compact',
  'post_compact',
  'session_start',
]);

export function resolveGrokHook(packageRoot, name) {
  const base = String(name || '');
  if (!base || base.includes('/') || base.includes('..') || !base.endsWith('.js')) return '';
  const candidates = [
    join(packageRoot, 'dist', 'integrations', 'grok', 'hooks', base),
    join(packageRoot, 'src', 'integrations', 'grok', 'hooks', base),
  ];
  return candidates.find((file) => existsSync(file)) || '';
}

export function grokHookEventFromArgv(argv) {
  const flag = (argv || []).find((arg) => String(arg).startsWith('--hook-event='));
  return flag ? String(flag).slice('--hook-event='.length) : '';
}

export function selectGrokHookName(argv) {
  const args = (argv || []).slice(2);
  const named = args.find((arg) => {
    const base = String(arg || '');
    return base.endsWith('.js') && !base.startsWith('-') && !base.includes('/') && !base.includes('..');
  });
  if (named) return String(named);
  if (SESSION_EVENTS.has(grokHookEventFromArgv(argv))) return 'session-start.js';
  const plain = args.find((arg) => arg && !String(arg).startsWith('-'));
  return plain ? String(plain) : '';
}

function pass(event) {
  const body = SESSION_EVENTS.has(event) ? '{}' : '{"decision":"allow"}';
  process.stdout.write(`${body}\n`);
  process.exit(0);
}

async function main() {
  const event = grokHookEventFromArgv(process.argv);
  const name = selectGrokHookName(process.argv);
  const hit = resolveGrokHook(root, name);
  if (!hit) pass(event);
  const extra = process.argv.slice(2).filter((arg) => arg !== name);
  process.argv = [process.argv[0], hit, ...extra];
  try {
    await import(pathToFileURL(hit).href);
  } catch {
    pass(event);
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
