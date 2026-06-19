#!/usr/bin/env node
/**
 * Emit shell exports for post-commit auto-reflection thresholds.
 * SSOT: synthesis.reflection, fallback auto_reflection.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.PROJECT_ROOT || process.cwd();
const configPath = join(root, '.xray', 'features.json');

let mode = 'minimal';
let commitThreshold = 25;
let daysThreshold = 14;
let autoGenerate = true;
let promptUser = true;

if (existsSync(configPath)) {
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    const reflection = parsed.synthesis?.reflection ?? parsed.auto_reflection;
    if (reflection) {
      mode = reflection.mode ?? 'minimal';
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

console.log(`export MODE="${mode}"`);
console.log(`export COMMIT_THRESHOLD="${commitThreshold}"`);
console.log(`export DAYS_THRESHOLD="${daysThreshold}"`);
console.log(`export AUTO_GENERATE="${autoGenerate}"`);
console.log(`export PROMPT_USER="${promptUser}"`);