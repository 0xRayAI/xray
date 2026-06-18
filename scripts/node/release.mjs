#!/usr/bin/env node

/**
 * Release Script for 0xRay
 *
 * Safe release process:
 * 1. Compute target version from npm registry
 * 2. Pre-commit gate (build + test + consumer smoke)
 * 3. Commit version bump
 * 4. Push to origin
 * 5. Full release gate (reconcile + guard — no tag until green)
 * 6. Create git tag + push tag
 * 7. Publish to npm
 *
 * Usage:
 *   npm run release:patch
 *   npm run release:minor
 *   npm run release:major
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.cwd();

function runCommand(cmd, errorMsg) {
  try {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { cwd: rootDir, stdio: 'inherit', encoding: 'utf-8' });
  } catch (error) {
    console.error(`\n❌ ${errorMsg}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const releaseType = args[0] || 'patch';

  if (!['major', 'minor', 'patch'].includes(releaseType)) {
    console.error('Usage: node scripts/node/release.mjs [major|minor|patch]');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        🚀 0xRay Release Script                         ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Step 1: Compute & apply version from npm baseline
  console.log(`\n📦 Step 1: Version bump (${releaseType}) from npm baseline...`);
  runCommand(`node scripts/node/reconcile-version.mjs ${releaseType} --apply`, 'Version bump failed');
  const newVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')).version;
  console.log(`📌 Target version: ${newVersion}`);

  // Step 2: Pre-commit gate — no tag until build/test/smoke pass
  console.log('\n📦 Step 2: Pre-commit release gate...');
  runCommand('node scripts/node/release-gate.mjs --pre-commit', 'Pre-commit gate failed');

  // Step 2.5: Sync docs (non-blocking)
  try {
    execSync('node scripts/node/sync-versions.mjs --apply', { cwd: rootDir, stdio: 'inherit' });
  } catch {
    console.log('⚠️  Version sync had issues (non-blocking)');
  }

  // Step 3: Commit version bump only (avoid git add -A slop)
  console.log('\n📦 Step 3: Committing version bump...');
  runCommand('git add package.json CHANGELOG.md AGENTS.md README.md 2>/dev/null || git add package.json', 'git add failed');
  runCommand(`git commit --no-verify -m "release: v${newVersion}"`, 'git commit failed');

  // Step 4: Push before full gate (guard requires pushed commit)
  console.log('\n📦 Step 4: Pushing to origin...');
  runCommand('git push origin main', 'Failed to push to origin');

  // Step 5: Full release gate — reconcile + guard + smoke
  console.log('\n📦 Step 5: Full release gate (no tag until green)...');
  runCommand('node scripts/node/release-gate.mjs', 'Release gate failed — do NOT tag');

  // Step 6: Tag (only after gate passes)
  console.log('\n📦 Step 6: Creating git tag...');
  try {
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✅ Created tag v${newVersion}`);
  } catch {
    console.log('⚠️  Tag may already exist');
  }

  runCommand(`git push origin v${newVersion}`, 'Failed to push tag');

  // Step 7: Publish
  console.log('\n📦 Step 7: Publishing to npm...');
  runCommand('npm publish --access public', 'npm publish failed');
  console.log(`✅ Published 0xray@${newVersion} to npm`);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        ✅ Release Complete!                            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n📦 Package: 0xray@${newVersion}`);
  console.log(`🏷  Tag: v${newVersion}`);

  const tweetPath = path.join(rootDir, 'tweets', `v${newVersion}.md`);
  const tweetDir = path.join(rootDir, 'tweets');
  if (!fs.existsSync(tweetDir)) fs.mkdirSync(tweetDir, { recursive: true });

  if (!fs.existsSync(tweetPath)) {
    const tweet = `🎉 0xRay v${newVersion} is LIVE - {THEME}!
{EMOJI} {feature - consumer benefit}
{EMOJI} {feature - consumer benefit}
{EMOJI} {feature - consumer benefit}
{EMOJI} {feature - consumer benefit}
{EMOJI} {feature - consumer benefit}
\`\`\`
npm install 0xray@latest
\`\`\`
What 0xRay is: {one sentence positioning}
#0xRay #AIOps #DevTools #SelfHealing #NPM`;
    fs.writeFileSync(tweetPath, tweet);
    console.log(`\n📝 Tweet template saved to tweets/v${newVersion}.md`);
  }
}

main().catch((error) => {
  console.error('\n❌ Release failed:', error.message);
  process.exit(1);
});