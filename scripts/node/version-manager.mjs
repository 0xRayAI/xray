#!/usr/bin/env node

/**
 * Version Manager for StringRay
 * 
 * Updates version in:
 * - package.json
 * - init.sh
 * - CHANGELOG.md (auto-generates entry)
 * 
 * Usage:
 *   node scripts/node/version-manager.mjs [major|minor|patch]
 *   node scripts/node/version-manager.mjs 1.6.9
 *   node scripts/node/version-manager.mjs patch "Added new feature"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// Files to update with version
const VERSION_FILES = [
  { file: 'package.json', field: 'version', pattern: /"version":\s*"[^"]+"/ },
  { file: 'init.sh', field: 'STRRAY_VERSION', pattern: /STRRAY_VERSION="[^"]+"/ }
];

function getChangelogEntry(newVersion, changeDescription) {
  const date = new Date().toISOString().split('T')[0];
  
  let content = changeDescription || '';
  
  return `## [${newVersion}] - ${date}

### 🔄 Changes

${content ? content : '- Version bump'}

---

`;
}

function updateChangelog(newVersion, changeDescription) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let changelog = fs.readFileSync(changelogPath, 'utf-8');
  
  // Find the position after the header and insert new entry
  const headerEnd = changelog.indexOf('## [');
  if (headerEnd === -1) {
    console.log('⚠️  Could not find version header in CHANGELOG.md');
    return;
  }
  
  const newEntry = getChangelogEntry(newVersion, changeDescription);
  const newChangelog = changelog.slice(0, headerEnd) + newEntry + changelog.slice(headerEnd);
  
  fs.writeFileSync(changelogPath, newChangelog);
  console.log(`✅ Updated CHANGELOG.md`);
}

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
      // Assume it's a specific version
      return type;
  }
  
  return `${v.major}.${v.minor}.${v.patch}`;
}

function updateVersion(newVersion, changeDescription = '') {
  console.log(`\n📦 Updating version to ${newVersion}\n`);
  
  // Update package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✅ Updated package.json`);
  
  // Update init.sh
  const initPath = path.join(rootDir, 'init.sh');
  let initContent = fs.readFileSync(initPath, 'utf-8');
  initContent = initContent.replace(
    /STRRAY_VERSION="[^"]+"/,
    `STRRAY_VERSION="${newVersion}"`
  );
  fs.writeFileSync(initPath, initContent);
  console.log(`✅ Updated init.sh`);
  
  // Update CHANGELOG.md
  updateChangelog(newVersion, changeDescription);
  
  console.log(`\n🎉 Version updated to ${newVersion}\n`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    const current = getCurrentVersion();
    console.log(`\n📌 Current version: ${current}`);
    console.log(`\nUsage:`);
    console.log(`  node scripts/node/version-manager.mjs [major|minor|patch] [description]`);
    console.log(`  node scripts/node/version-manager.mjs 1.6.9 "Description of changes"`);
    console.log(`\nExamples:`);
    console.log(`  node scripts/node/version-manager.mjs patch  # 1.6.8 -> 1.6.9`);
    console.log(`  node scripts/node/version-manager.mjs minor  # 1.6.8 -> 1.7.0`);
    console.log(`  node scripts/node/version-manager.mjs major  # 1.6.8 -> 2.0.0`);
    console.log(`  node scripts/node/version-manager.mjs patch "Added new MCP server"  # with changelog entry`);
    process.exit(0);
  }
  
  const current = getCurrentVersion();
  const type = args[0];
  const changeDescription = args[1] || '';  const newVersion = bumpVersion(current, type);
  
  console.log(`\n📌 Current version: ${current}`);
  console.log(`📌 Bumping: ${type}`);
  if (changeDescription) {
    console.log(`📌 Changes: ${changeDescription}`);
  }
  
  updateVersion(newVersion, changeDescription);
}

main();
