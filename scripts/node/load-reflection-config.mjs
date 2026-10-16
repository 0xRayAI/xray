#!/usr/bin/env node
/**
 * Emit reflection config for post-commit hook.
 * SSOT: synthesis.reflection, fallback auto_reflection.
 *
 * Usage:
 *   node load-reflection-config.mjs          # shell-safe export lines
 *   node load-reflection-config.mjs --json   # JSON for hook parsers
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_MODES = new Set(['minimal', 'full', 'off']);

const root = process.env.PROJECT_ROOT || process.cwd();
const configPath = join(root, '.xray', 'features.json');

let mode = 'minimal';
let commitThreshold = 50;
let daysThreshold = 14;
let autoGenerate = false;
let promptUser = true;

if (existsSync(configPath)) {
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    const reflection = parsed.synthesis?.reflection ?? parsed.auto_reflection;
    if (reflection) {
      const rawMode = reflection.mode ?? 'minimal';
      mode = ALLOWED_MODES.has(rawMode) ? rawMode : 'minimal';
      const thresholds = reflection.thresholds?.[mode];
      if (thresholds) {
        if (typeof thresholds.commit_threshold === 'number') {
          commitThreshold = thresholds.commit_threshold;
        }
        if (typeof thresholds.days_threshold === 'number') {
          daysThreshold = thresholds.days_threshold;
        }
        if (typeof thresholds.auto_generate === 'boolean') {
          autoGenerate = thresholds.auto_generate;
        }
        if (typeof thresholds.prompt_user === 'boolean') {
          promptUser = thresholds.prompt_user;
        }
      } else if (mode === 'full') {
        commitThreshold = 10;
        daysThreshold = 5;
      }
    }
  } catch {
    /* keep defaults */
  }
}

if (mode === 'off') {
  autoGenerate = false;
  promptUser = false;
}

const config = {
  mode,
  commitThreshold,
  daysThreshold,
  autoGenerate,
  promptUser,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(config));
  process.exit(0);
}

console.log(`MODE=${mode}`);
console.log(`COMMIT_THRESHOLD=${commitThreshold}`);
console.log(`DAYS_THRESHOLD=${daysThreshold}`);
console.log(`AUTO_GENERATE=${autoGenerate}`);
console.log(`PROMPT_USER=${promptUser}`);