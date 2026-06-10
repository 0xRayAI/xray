#!/usr/bin/env node

/**
 * Release Script for xray
 *
 * Thin orchestrator that delegates to npm lifecycle hooks:
 *   1. Typecheck + full test suite
 *   2. npm version (bumps package.json, triggers preversion → version scripts)
 *   3. Build
 *   4. Consumer verification (npm pack + fresh install + 4 bridge E2Es)
 *   5. Commit + tag
 *   6. npm publish (triggers prepublishOnly → prepare-consumer + build)
 *   7. Push commit + tag
 *
 * Usage:
 *   npm run release:patch           # patch bump (default)
 *   npm run release:minor           # minor bump
 *   npm run release:major           # major bump
 *   npm run release:dry             # dry run (no changes)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.cwd();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const dryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => a !== '--dry-run');
const bumpType = args.find(a => ['major', 'minor', 'patch'].includes(a)) || 'patch';

function log(label, msg, color = BLUE) {
  console.log(`${color}${label}${RESET}${msg ? ` ${msg}` : ''}`);
}

function step(n, label) {
  console.log(`\n${BOLD}${BLUE}▸ Step ${n}: ${label}${RESET}`);
}

function run(cmd, label) {
  log(`  ⚡`, label);
  try {
    execSync(cmd, { cwd: rootDir, stdio: 'pipe', encoding: 'utf-8' });
    log(`  ✓`, `${label} done`, GREEN);
    return true;
  } catch (e) {
    log(`  ✗`, `${label} failed: ${(e.stderr || e.message || '').slice(0, 200)}`, RED);
    return false;
  }
}

function runInherit(cmd, label) {
  log(`  ⚡`, label);
  try {
    execSync(cmd, { cwd: rootDir, stdio: 'inherit', encoding: 'utf-8' });
    log(`  ✓`, `${label} done`, GREEN);
    return true;
  } catch (e) {
    log(`  ✗`, `${label} failed`, RED);
    return false;
  }
}

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

async function main() {
  const currentVersion = getCurrentVersion();

  console.log(`\n${BOLD}${BLUE}╔══════════════════════════════════════════╗`);
  console.log(`║   🚀 0xray Release                      ║`);
  console.log(`╚══════════════════════════════════════════╝${RESET}`);
  console.log(`${BOLD}  ${currentVersion} → (${bumpType})${RESET}`);

  if (dryRun) {
    console.log(`\n${YELLOW}${BOLD}  DRY RUN — no changes will be made${RESET}\n`);
  }

  // Step 1: Typecheck + tests
  step(1, 'Typecheck + Tests');
  if (!runInherit('npx tsc --noEmit', 'Typecheck')) process.exit(1);
  if (!runInherit('npx vitest run', 'Tests')) process.exit(1);

  // Step 2: Version bump (npm version triggers preversion → version:sync → version-manager.mjs)
  step(2, 'Version bump');
  if (!dryRun) {
    if (!run(`npm version ${bumpType} --no-git-tag-version`, `Bump ${bumpType}`)) {
      process.exit(1);
    }
  } else {
    log(`  ~`, `Would bump: npm version ${bumpType} --no-git-tag-version`, YELLOW);
  }

  const newVersion = getCurrentVersion();
  console.log(`  📦 Version: ${currentVersion} → ${newVersion}`);

  // Step 3: Build
  step(3, 'Build');
  if (!run('npm run build', 'Build')) process.exit(1);

  // Step 4: Consumer verification (pack + install + bridge E2Es + activity.log check)
  step(4, 'Consumer verification');
  if (!dryRun) {
    if (!runInherit('bash scripts/verify-consumer.sh', 'verify:consumer')) {
      process.exit(1);
    }
  } else {
    log(`  ~`, 'Would run: bash scripts/verify-consumer.sh', YELLOW);
  }

  // Step 5: Commit
  step(5, 'Commit');
  if (!dryRun) {
    if (!run('git add -A', 'Stage changes')) process.exit(1);
    const commitMsg = `v${newVersion}`;
    try {
      execSync(`git commit -m "${commitMsg}"`, { cwd: rootDir, stdio: 'pipe', encoding: 'utf-8' });
      log(`  ✓`, `Committed: ${commitMsg}`, GREEN);
    } catch (e) {
      const output = e.stdout || e.stderr || '';
      if (output.includes('nothing to commit')) {
        log(`  ⚠`, 'Nothing to commit', YELLOW);
      } else {
        log(`  ✗`, `Commit failed: ${output.slice(0, 200)}`, RED);
        process.exit(1);
      }
    }
  } else {
    log(`  ~`, 'Would commit and tag', YELLOW);
  }

  // Step 6: Tag
  step(6, 'Tag');
  if (!dryRun) {
    try {
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: rootDir, stdio: 'pipe' });
      log(`  ✓`, `Tagged v${newVersion}`, GREEN);
    } catch {
      log(`  ⚠`, 'Tag may already exist', YELLOW);
    }
  }

  // Step 7: Publish (prepublishOnly runs prepare-consumer + build)
  step(7, 'Publish to npm');
  if (!dryRun) {
    if (!run('npm publish --access public', `Publish 0xray@${newVersion}`)) {
      log(`  ✗`, 'Publish failed — trying without scripts', RED);
      if (!run('npm publish --access public --ignore-scripts', `Publish 0xray@${newVersion} (fallback)`)) {
        process.exit(1);
      }
    }
  } else {
    log(`  ~`, 'Would publish: npm publish --access public', YELLOW);
  }

  // Step 8: Push
  step(8, 'Push to remote');
  if (!dryRun) {
    if (!run('git push', 'Push commits')) process.exit(1);
    if (!run(`git push origin v${newVersion}`, 'Push tag')) process.exit(1);
  } else {
    log(`  ~`, 'Would push commits + tag', YELLOW);
  }

  console.log(`\n${BOLD}${GREEN}✅ Released 0xray@${newVersion}${RESET}\n`);

  // Generate tweet template (non-blocking)
  const tweetPath = path.join(rootDir, 'tweets', `v${newVersion}.md`);
  const tweetDir = path.join(rootDir, 'tweets');
  if (!fs.existsSync(tweetDir)) fs.mkdirSync(tweetDir, { recursive: true });
  if (!fs.existsSync(tweetPath)) {
    const recentCommits = (() => {
      try {
        const prevTag = execSync('git describe --tags --abbrev=0 HEAD~5 2>/dev/null || echo "HEAD~10"', { cwd: rootDir, encoding: 'utf-8' }).trim();
        return execSync(`git log ${prevTag}..HEAD --oneline`, { cwd: rootDir, encoding: 'utf-8' }).trim();
      } catch {
        try { return execSync('git log -10 --oneline', { cwd: rootDir, encoding: 'utf-8' }).trim(); }
        catch { return '(could not read commits)'; }
      }
    })();
    const tweet = `🎉 0xray v${newVersion} is LIVE!
{EMOJI} {feature - consumer benefit}
{EMOJI} {feature - consumer benefit}
\`\`\`
npm install 0xray@latest
\`\`\`
#0xray #AIOps #DevTools #MCP #Agentic`;
    fs.writeFileSync(tweetPath, tweet);
    console.log(`📝 Tweet template saved to tweets/v${newVersion}.md`);
    console.log(`📋 Recent commits:\n${recentCommits.split('\n').map(l => '   ' + l).join('\n')}`);
  }
}

main().catch(error => {
  console.error(`\n❌ Release failed: ${error.message}`);
  process.exit(1);
});
