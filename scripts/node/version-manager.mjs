#!/usr/bin/env node

/**
 * Version Manager for StringRay
 * 
 * Updates version in:
 * - package.json
 * - init.sh
 * 
 * Usage:
 *   node scripts/node/version-manager.mjs [major|minor|patch]
 *   node scripts/node/version-manager.mjs 1.6.9
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

function updateVersion(newVersion) {
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
  
  console.log(`\n🎉 Version updated to ${newVersion}\n`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    const current = getCurrentVersion();
    console.log(`\n📌 Current version: ${current}`);
    console.log(`\nUsage:`);
    console.log(`  node scripts/node/version-manager.mjs [major|minor|patch]`);
    console.log(`  node scripts/node/version-manager.mjs 1.6.9`);
    console.log(`\nExamples:`);
    console.log(`  node scripts/node/version-manager.mjs patch  # 1.6.8 -> 1.6.9`);
    console.log(`  node scripts/node/version-manager.mjs minor  # 1.6.8 -> 1.7.0`);
    console.log(`  node scripts/node/version-manager.mjs major  # 1.6.8 -> 2.0.0`);
    process.exit(0);
  }
  
  const current = getCurrentVersion();
  const type = args[0];
  const newVersion = bumpVersion(current, type);
  
  console.log(`\n📌 Current version: ${current}`);
  console.log(`📌 Bumping: ${type}`);
  
  updateVersion(newVersion);
}

main();
