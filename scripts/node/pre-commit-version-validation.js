#!/usr/bin/env node

/**
 * Pre-commit Git Hook - Version Consistency Validation
 *
 * Validates that version references are consistent across the codebase
 * before allowing commits. Prevents commits with inconsistent versions.
 */

import fs from "fs";
import path from "path";

// Get the root directory of the git repository
async function getGitRoot() {
  try {
    const { execSync } = await import('child_process');
    const result = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim();
  } catch (error) {
    console.error('❌ Not in a git repository');
    process.exit(1);
  }
}

// Simple version extraction function
function extractVersions(content) {
  const versions = new Set();

  // Match version patterns like "1.2.3", "v1.2.3"
  const versionRegex = /\b\d+\.\d+\.\d+\b/g;
  const matches = content.match(versionRegex);

  if (matches) {
    matches.forEach(match => versions.add(match));
  }

  return Array.from(versions);
}

// Check if versions are consistent
async function validateVersionConsistency() {
  const rootDir = await getGitRoot();
  console.log('🔍 Checking version consistency...');

  // Read package.json to get the official version
  const packagePath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.log('⚠️ No package.json found, skipping version validation');
    return true;
  }

  let packageVersion;
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageVersion = packageJson.version;
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    return false;
  }

  console.log(`📦 Package version: ${packageVersion}`);

  // Check critical files for version consistency
  const criticalFiles = [
    'README.md',
    'AGENTS.md',
    'src/agents/orchestrator.ts',
    'src/agents/enforcer.ts',
    'src/agents/architect.ts'
  ];

  let hasInconsistencies = false;

  for (const file of criticalFiles) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) {
      continue; // Skip if file doesn't exist
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const versions = extractVersions(content);

      // Check if any version in the file conflicts with package version
      const conflictingVersions = versions.filter(v => v !== packageVersion);

      if (conflictingVersions.length > 0) {
        console.log(`❌ ${file}: Found inconsistent versions: ${conflictingVersions.join(', ')} (expected: ${packageVersion})`);
        hasInconsistencies = true;
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
    }
  }

  if (hasInconsistencies) {
    console.log('');
    console.log('💡 To fix version inconsistencies:');
    console.log('   • Run: node scripts/universal-version-manager.js');
    console.log('   • Or commit will be blocked');
    return false;
  }

  console.log('✅ Version consistency validated');
  return true;
}

// Main validation
validateVersionConsistency().then(valid => {
  if (!valid) {
    console.log('');
    console.log('🚫 Commit blocked due to version inconsistencies');
    console.log('💡 Run version manager or fix manually');
    process.exit(1);
  }
}).catch(err => {
  console.error('Error during validation:', err);
  process.exit(1);
});