#!/usr/bin/env node
// Local seat check. The watcher rule is grok-bot/OP-PROC.md#inbox-watcher.
// This file does not restate it. It does not ack and it does not print keys.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_WATCH = 'house/live/tools/inbox-watch.sh';

export function inspectSeat(seat, layout, pidAlive = () => false) {
  const drift = [];
  const note = (what) => drift.push({ seat, what });
  if (!layout || !Array.isArray(layout.bins) || !layout.bins.includes('live-inbox')) note('bin wrapper missing');
  const link = String(layout?.liveInbox || '');
  if (!link.endsWith('house/live/tools/live-inbox') || link.includes(`${path.sep}.burst${path.sep}bin${path.sep}`)) {
    note('live-inbox is not the repo script');
  }
  if (layout?.version && layout?.mainVersion && layout.version !== layout.mainVersion) note('version drift');
  if (!layout?.skills) note('skills folder missing');
  const state = layout?.watcher || {};
  const script = String(state.script || '');
  const scriptOk = script.endsWith(REPO_WATCH) && !script.includes(`${path.sep}.burst${path.sep}bin${path.sep}`);
  const alive = Boolean(state.pid) && pidAlive(String(state.pid)) && Boolean(state.last_ok) && scriptOk;
  return { drift, watcher: { seat, ok: alive } };
}

export function seatReport({ seats = [], now = new Date().toISOString(), layouts = {}, pidAlive } = {}) {
  const drift = [];
  const watcher = [];
  for (const seat of seats) {
    const found = inspectSeat(seat, layouts[seat] || {}, pidAlive);
    drift.push(...found.drift);
    watcher.push(found.watcher);
  }
  return { generated_at: now, drift, watcher, prompts: [] };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stdout.write('{}\n');
    return;
  }
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(seatReport(input))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
