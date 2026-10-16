#!/usr/bin/env node
import { runWear } from '../lib/wear-run.mjs';

function taskFromArgv() {
  const arg = process.argv.slice(2).join(' ').trim();
  if (!arg) {
    process.stderr.write('usage: node bin/wear.mjs "<task>"\n');
    process.exit(1);
  }
  return arg;
}

try {
  const out = runWear(taskFromArgv(), {
    sessionId: process.env.RECALL_BENCH_SESSION,
  });
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}
