#!/usr/bin/env node

/**
 * Proper Release Script for StringRay
 * 
 * Safe release process that:
 * 1. Bumps version
 * 2. Commits version changes
 * 3. Creates git tag
 * 4. Pushes to origin
 * 5. Builds (stops on error)
 * 6. Publishes to npm (only if build succeeds)
 * 7. Generates release tweet
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

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return pkg.version;
}

function parseVersion(version) {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0], 10),
    minor: parseInt(parts[1], 10),
    patch: parseInt(parts[2], 10)
  };
}

function bumpVersion(current, type) {
  const v = parseVersion(current);
  
  switch (type) {
    case 'major':
      v.major++;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor++;
      v.patch = 0;
      break;
    case 'patch':
      v.patch++;
      break;
    default:
      return type;
  }
  
  return `${v.major}.${v.minor}.${v.patch}`;
}

function runCommand(cmd, errorMsg) {
  try {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { 
      cwd: rootDir, 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
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
  console.log('║        🚀 StringRay Release Script                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  const currentVersion = getCurrentVersion();
  console.log(`\n📌 Current version: ${currentVersion}`);
  
  const newVersion = bumpVersion(currentVersion, releaseType);
  console.log(`📌 New version: ${newVersion}`);
  console.log(`📌 Release type: ${releaseType}`);

  // Step 1: Build
  console.log('\n📦 Step 1: Building...');
  runCommand('npm run build', 'Build failed');

  // Step 2: Update package.json
  console.log('\n📦 Step 2: Updating version in package.json...');
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  // Step 3: Commit
  console.log('\n📦 Step 3: Committing version bump...');
  runCommand('git add package.json', 'git add failed');
  runCommand(`git commit --no-verify -m "release: v${newVersion}"`, 'git commit failed');

  // Step 4: Tag
  console.log('\n📦 Step 4: Creating git tag...');
  try {
    execSync(
      `git tag -a v${newVersion} -m "Release v${newVersion}"`,
      { cwd: rootDir, stdio: 'inherit' }
    );
    console.log(`✅ Created tag v${newVersion}`);
  } catch (error) {
    console.log('⚠️  Tag may already exist');
  }
  
  // Step 5: Push
  console.log('\n📦 Step 5: Pushing to origin...');
  runCommand('git push origin master', 'Failed to push to origin');
  runCommand(`git push origin v${newVersion}`, 'Failed to push tag');

  // Step 6: Publish to npm
  console.log('\n📦 Step 6: Publishing to npm...');
  runCommand('npm publish --access public', 'npm publish failed');
  console.log(`✅ Published strray-ai@${newVersion} to npm`);

  // Step 6: Publish to npm
  console.log('\n📦 Step 6: Publishing to npm...');
  runCommand('npm publish --access public', 'npm publish failed');
  console.log(`✅ Published strray-ai@${newVersion} to npm`);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        ✅ Release Complete!                            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n📦 Package: strray-ai@${newVersion}`);
  console.log(`🏷  Tag: v${newVersion}`);
  console.log('\n💡 Want a tweet? Ask: "give me a tweet succinct with 5 tidy');
  console.log('   bullets with emojis. a quip before or after and hashtags');
  console.log('   based on the commits in this session. should be consumer focused."');
  console.log('\n🎉 All done!\n');
}

main().catch(error => {
  console.error('\n❌ Release failed:', error.message);
  process.exit(1);
});