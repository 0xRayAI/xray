#!/usr/bin/env node
// A missing prompt, drift, or a dead cron is one finding. Owner-message times
// come from the board archive in the input, not from the seat. The watcher
// rule is grok-bot/OP-PROC.md#inbox-watcher. This file does not restate it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WATCHER = 'grok-bot/OP-PROC.md#inbox-watcher';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function boardFindings({ report, now = Date.now(), maxAgeMs = MAX_AGE_MS, ownerMessages = [] } = {}) {
  const generated = report && Date.parse(report.generated_at);
  if (!report || !Number.isFinite(generated) || now - generated > maxAgeMs) {
    return [{ kind: 'dead-cron', title: 'The seat report is missing. The upkeep cron is dead.' }];
  }
  const out = [];
  for (const row of report.drift || []) {
    if (!row || !row.seat || !row.what) continue;
    out.push({ kind: 'drift', seat: row.seat, title: `${row.seat} drift: ${row.what}` });
  }
  const prompts = new Set((report.prompts || []).map((row) => row && row.id).filter(Boolean));
  for (const msg of ownerMessages) {
    if (!msg || !msg.id || prompts.has(msg.id)) continue;
    out.push({
      kind: 'missing-prompt',
      seat: msg.seat || 'arch1',
      title: `Owner message ${msg.id} has no live-inbox prompt.`,
    });
  }
  for (const row of report.watcher || []) {
    if (!row || row.ok) continue;
    out.push({ kind: 'watcher', seat: row.seat, title: `${row.seat} watcher failed. ${WATCHER}` });
  }
  return out;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    process.stdout.write('[]\n');
    return;
  }
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(boardFindings(input))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
