#!/usr/bin/env node

/**
 * Universal Version Management Script
 *
 * Automatically updates all version references across the StringRay Framework
 * including framework versions, codex versions, and documentation consistency.
 * Ensures single source of truth for all version information.
 *
 * @version 1.0.0
 * @since 2026-01-15
 */

import fs from "fs";
import path from "path";

// Official version information - SINGLE SOURCE OF TRUTH
const OFFICIAL_VERSIONS = {
  // Framework versions
  framework: {
    version: "1.4.0",
    displayName: "StringRay AI v1.4.0",
    lastUpdated: "2026-02-15",
  },

  // Codex versions
  codex: {
    version: "v1.3.0",
    termsCount: 55,
    lastUpdated: "2026-02-01",
  },

  // External dependencies
  dependencies: {
    ohMyOpencode: "2.14.0",
  },
};

// Simple recursive file finder - necessary for explaining complex directory traversal logic
function findFiles(
  dir,
  extensions,
  ignoreDirs = [
    "node_modules", ".git", "dist", "build", "temp", "test-install", 
    "ci-deploy", "test-config", 
    "docs/reflections", "docs/archive",  // Historical documents - keep original versions
    ".opencode/state",  // Runtime state data
    "logs", "reports",  // Generated logs/reports
  ],
  ignoreFiles = [
    "package-lock.json", ".opencode.json",
    "SIMULATION_TEST_RESULTS.md",  // Test record - keep original
    "TEST_INVENTORY.md",  // Test inventory - keep original
    "CHANGELOG.md", "CHANGELOG-v1.2.0.md",  // Version history
  ],
) {
  const files = [];

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(item)) {
          walk(fullPath);
        }
      } else {
        const ext = path.extname(item);
        const basename = path.basename(item);
        // Skip ignored files and check extension
        if (!ignoreFiles.includes(basename) && extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

// Comprehensive update patterns for all version types
const UPDATE_PATTERNS = [
   // === FRAMEWORK VERSION UPDATES ===
    {
      pattern: /"version": "[0-9]+\.[0-9]+\.[0-9]+"/g,
      replacement: `"version": "${OFFICIAL_VERSIONS.framework.version}"`,
    },
    {
      pattern: /StringRay Framework v[0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: OFFICIAL_VERSIONS.framework.displayName,
    },
    // NOTE: README has a version badge that needs updating
    {
      pattern: /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: `![Version](https://img.shields.io/badge/version-${OFFICIAL_VERSIONS.framework.version}`,
    },
    {
      pattern: /- Framework Version: StrRay v[0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: `- Framework Version: ${OFFICIAL_VERSIONS.framework.displayName}`,
    },
    {
      pattern: /- Framework Version: [0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: `- Framework Version: ${OFFICIAL_VERSIONS.framework.version}`,
    },
    // CLI Version pattern
    {
      pattern: /\.version\("[0-9]+\.[0-9]+\.[0-9]+"\)/g,
      replacement: `.version("${OFFICIAL_VERSIONS.framework.version}")`,
   },
    {
      pattern: /Framework Version: StrRay v[0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: `Framework Version: ${OFFICIAL_VERSIONS.framework.displayName}`,
    },

    // Simple version patterns
    {
      pattern: /StrRay v[0-9]+\.[0-9]+\.[0-9]+/g,
      replacement: OFFICIAL_VERSIONS.framework.displayName,
    },

    // Pre-commit introspection patterns
    {
      pattern: /StringRay [0-9]+\.[0-9]+\.[0-9]+ - Pre-commit Introspection/g,
      replacement: `${OFFICIAL_VERSIONS.framework.displayName} - Pre-commit Introspection`,
    },
    {
      pattern: /🔬 StringRay [0-9]+\.[0-9]+\.[0-9]+ - Pre-commit Introspection/g,
      replacement: `🔬 ${OFFICIAL_VERSIONS.framework.displayName} - Pre-commit Introspection`,
    },

    // Codex version patterns (for .opencode/strray/codex.json)
    {
      pattern: /"version":"[0-9]+\.[0-9]+\.[0-9]+"/g,
      replacement: `"version":"${OFFICIAL_VERSIONS.framework.version}"`,
    },
    {
      pattern: /"codex_version":\s*"v[0-9]+\.[0-9]+\.[0-9]+"/g,
      replacement: `"codex_version": "${OFFICIAL_VERSIONS.codex.version}"`,
    },
    {
      pattern: /"strray:version":\s*"[0-9]+\.[0-9]+\.[0-9]+"/g,
      replacement: `"strray:version": "${OFFICIAL_VERSIONS.framework.version}"`,
    },

  ];

async function standardizeVersions() {
  console.log("🔧 Starting Universal Version Standardization");
  console.log(`📋 Framework: ${OFFICIAL_VERSIONS.framework.displayName}`);
  console.log(
    `📋 Codex: ${OFFICIAL_VERSIONS.codex.version} (${OFFICIAL_VERSIONS.codex.termsCount} terms)`,
  );
  console.log(
    `📋 OpenCode: v${OFFICIAL_VERSIONS.dependencies.ohMyOpencode}`,
  );
  console.log("=".repeat(60));

  // Find all files that might contain version references
  const extensions = [".ts", ".js", ".md", ".json", ".txt", ".sh"];
  const files = findFiles(".", extensions);

  let totalFilesUpdated = 0;
  let totalChanges = 0;

  // Additional safety: protected files that should never be modified
  // Note: Only protect root package.json (npm version manages this)
  // .opencode/package.json should be updated by this script
  const PROTECTED_FILES = [
    "package-lock.json",
    "package.json",  // Only root package.json (matched by exact path, not subdirs)
  ];

  for (const file of files) {
    // Skip protected files as an additional safety measure
    // Use path.basename to match filename only, not full path
    const basename = path.basename(file);
    const normalizedPath = path.normalize(file);
    
    const isProtected = PROTECTED_FILES.some(protectedFile => {
      // For package.json, only protect the root level one (exact match)
      // Subdirectory package.json files (like .opencode/package.json) should be processed
      if (protectedFile === "package.json") {
        return normalizedPath === "package.json";
      }
      // For other protected files, use basename matching
      return basename === protectedFile;
    });
    
    if (isProtected) {
      console.log(`⏭️ Skipping protected file: ${file}`);
      continue;
    }

    try {
      const content = fs.readFileSync(file, "utf8");
      let updatedContent = content;
      let fileChanged = false;

      // Apply all version update patterns
      for (const { pattern, replacement } of UPDATE_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          updatedContent = updatedContent.replace(pattern, replacement);
          totalChanges += matches.length;
          fileChanged = true;
        }
      }

      // Write back if changed
      if (fileChanged) {
        fs.writeFileSync(file, updatedContent, "utf8");
        console.log(`✅ Updated: ${file}`);
        totalFilesUpdated++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Universal Version Standardization Complete!");
  console.log(`📊 Summary:`);
  console.log(`   Files Updated: ${totalFilesUpdated}`);
  console.log(`   Total Changes: ${totalChanges}`);
  console.log(`   Framework Version: ${OFFICIAL_VERSIONS.framework.version}`);
  console.log(
    `   Codex Version: ${OFFICIAL_VERSIONS.codex.version} (${OFFICIAL_VERSIONS.codex.termsCount} terms)`,
  );
  console.log(`   Dependencies Updated: ✅`);
  console.log(`   Last Updated: ${OFFICIAL_VERSIONS.framework.lastUpdated}`);

  // Version management reminder
  console.log("\n💡 To update versions in the future:");
  console.log("   1. Edit OFFICIAL_VERSIONS object in this script");
  console.log("   2. Run: node scripts/standardize-codex-versions.js");
  console.log("   3. Commit the changes");
}

// Run the standardization
standardizeVersions().catch(console.error);
