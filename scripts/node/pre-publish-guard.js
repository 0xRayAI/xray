#!/usr/bin/env node

/**
 * Pre-Publish Validation Script
 *
 * Full mode: git + reconcile + build + test + consumer smoke
 * --verify-only: git + reconcile + (optional smoke via release-gate)
 * --skip-smoke: skip consumer install smoke
 * --skip-build / --skip-tests: skip redundant steps when gate already ran
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

const verifyOnly = process.argv.includes('--verify-only');
const skipSmoke =
  process.argv.includes('--skip-smoke') ||
  process.env.SKIP_CONSUMER_SMOKE === '1' ||
  verifyOnly;
const skipBuild = process.argv.includes('--skip-build') || verifyOnly;
const skipTests = process.argv.includes('--skip-tests') || verifyOnly;

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

let errors = [];
let warnings = [];

function log(msg, type = 'info') {
  const prefix = {
    info: `${BLUE}ℹ${RESET}`,
    success: `${GREEN}✅${RESET}`,
    error: `${RED}❌${RESET}`,
    warn: `${YELLOW}⚠${RESET}`,
    step: `${BLUE}🔄${RESET}`,
  }[type] || 'ℹ';
  console.log(`${prefix} ${msg}`);
}

function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: rootDir,
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options,
    }).trim();
  } catch {
    return null;
  }
}

/** Runtime/generated paths only — never ignore scripts/, src/, or CHANGELOG */
const ARTIFACT_PREFIXES = [
  '.opencode/codex.codex',
  '.opencode/enforcer-config.json',
  '.opencode/package.json',
  '.opencode/command/',
  '.opencode/activity-report.json',
  '.opencode/init.sh',
  '.xray/inference/',
  'logs/',
  'backups/',
  '.ci-reports/',
];

function checkGitStatus() {
  log('Checking git status...', 'step');

  const status = run('git status --porcelain');
  if (status && status.length > 0) {
    const lines = status.split('\n').filter((l) => !l.startsWith('??'));

    const realChanges = lines.filter((l) => {
      const filePath = l.slice(2).trim();
      return !ARTIFACT_PREFIXES.some((prefix) => filePath.startsWith(prefix));
    });

    if (realChanges.length > 0) {
      errors.push(`Git has uncommitted changes:\n${realChanges.join('\n')}`);
      log('Uncommitted changes block release', 'error');
      return false;
    }

    if (lines.length > 0) {
      log('Generated artifacts present (OK)', 'info');
    }
  }

  const currentBranch = run('git rev-parse --abbrev-ref HEAD');
  const remoteCommit = run(`git rev-parse origin/${currentBranch} 2>/dev/null || echo ""`);
  const localCommit = run('git rev-parse HEAD');

  if (remoteCommit && remoteCommit !== localCommit) {
    errors.push(`Local commit ${localCommit.slice(0, 7)} not pushed to origin/${currentBranch}`);
    log(`Not pushed to origin/${currentBranch}`, 'error');
    return false;
  }

  log('Git status OK', 'success');
  return true;
}

function checkVersionReconcile() {
  log('Checking version reconcile...', 'step');
  try {
    execSync('node scripts/node/reconcile-version.mjs --check', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    log('Version reconcile OK', 'success');
    return true;
  } catch {
    errors.push('Version reconcile failed — run: npm run version:reconcile');
    return false;
  }
}

function runBuild() {
  if (skipBuild) {
    log('Build skipped', 'info');
    return true;
  }
  log('Running build...', 'step');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    log('Build succeeded', 'success');
    return true;
  } catch {
    errors.push('Build failed');
    return false;
  }
}

function runTests() {
  if (skipTests) {
    log('Tests skipped', 'info');
    return true;
  }
  log('Running tests...', 'step');
  try {
    execSync('npm test', { cwd: rootDir, stdio: 'inherit' });
    log('Tests passed', 'success');
    return true;
  } catch {
    errors.push('Tests failed');
    return false;
  }
}

function runConsumerSmoke() {
  if (skipSmoke) {
    log('Consumer smoke skipped', 'warn');
    return true;
  }
  log('Running consumer install smoke...', 'step');
  try {
    execSync('node scripts/node/consumer-install-smoke.mjs', { cwd: rootDir, stdio: 'inherit' });
    log('Consumer smoke passed', 'success');
    return true;
  } catch {
    errors.push('Consumer install smoke failed');
    return false;
  }
}

function main() {
  console.log('\n' + '='.repeat(60));
  log(verifyOnly ? 'PRE-PUBLISH VERIFY' : 'PRE-PUBLISH VALIDATION', 'step');
  console.log('='.repeat(60) + '\n');

  const checks = [
    checkGitStatus,
    checkVersionReconcile,
    runBuild,
    runTests,
    runConsumerSmoke,
  ];

  let allPassed = true;
  for (const fn of checks) {
    if (!fn()) {
      allPassed = false;
      break;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    log('ALL CHECKS PASSED', 'success');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  }

  log('VALIDATION FAILED', 'error');
  console.log('='.repeat(60) + '\n');
  if (errors.length) {
    console.log(`${RED}Errors:${RESET}`);
    errors.forEach((e) => console.log(`  • ${e}`));
  }
  console.log(`\n${YELLOW}Fix:${RESET} npm run release:gate  or  npm run version:reconcile\n`);
  process.exit(1);
}

main();