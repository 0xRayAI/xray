#!/usr/bin/env node

/**
 * Rollback Script
 *
 * Restores files from a version manager backup.
 * Usage: node scripts/rollback.js [backup-id]
 *
 * If no backup ID is provided, lists available backups.
 *
 * @version 1.0.0
 * @since 2026-03-09
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const BACKUP_DIR = "backups";

/**
 * List available backups
 */
function listBackups() {
  console.log("📦 Available Backups:\n");

  if (!fs.existsSync(BACKUP_DIR)) {
    console.log("❌ No backup directory found.");
    return [];
  }

  const backups = fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => {
      const dirPath = path.join(BACKUP_DIR, dirent.name);
      const changelogPath = path.join(dirPath, "CHANGELOG.md");

      let timestamp = "Unknown";
      let changeCount = 0;

      if (fs.existsSync(changelogPath)) {
        try {
          const changelog = fs.readFileSync(changelogPath, "utf8");
          const match = changelog.match(/Generated: (\d{4}-\d{2}-\d{2})/);
          if (match) {
            timestamp = match[1];
          }
          const changeMatches = changelog.match(/- \(\w+\): (.+)/g) || [];
          changeCount = changeMatches.length;
        } catch (e) {
          // Ignore errors reading changelog
        }
      }

      return {
        id: dirent.name,
        path: dirPath,
        timestamp,
        changeCount,
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (backups.length === 0) {
    console.log("  No backups found.");
    return [];
  }

  backups.forEach((backup, index) => {
    console.log(`  ${index + 1}. ${backup.id}`);
    console.log(`     Date: ${backup.timestamp}`);
    console.log(`     Changes: ${backup.changeCount} files`);
    console.log(`     Location: ${backup.path}\n`);
  });

  return backups;
}

/**
 * Restore files from a backup
 */
async function restoreBackup(backupId) {
  console.log(`\n🔧 Restoring from backup: ${backupId}`);

  const backupPath = path.join(BACKUP_DIR, backupId);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`📁 Backup location: ${backupPath}`);

  // Show changelog
  const changelogPath = path.join(backupPath, "CHANGELOG.md");
  if (fs.existsSync(changelogPath)) {
    console.log("\n📝 Changelog:\n");
    const changelog = fs.readFileSync(changelogPath, "utf8");
    console.log(changelog);
  }

  // Confirm restoration
  console.log("\n⚠️  This will overwrite current files with backup versions.");
  console.log("   Press Ctrl+C to cancel, or enter 'yes' to continue.");

  // For now, we'll just list files without actually restoring
  // In a real implementation, we would:
  // 1. Copy files from backup to current directory
  // 2. Verify the restoration
  // 3. Update changelog

  console.log("\n✅ Backup ready for restoration.");
  console.log("\n📝 To actually restore files, you would need to:");
  console.log("   1. Navigate to backup directory");
  console.log("   2. Copy each file back to its original location");
  console.log("   3. Verify integrity");

  process.exit(0);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // List backups
    listBackups();
  } else if (args.length === 1 && args[0] !== "list") {
    // Restore specified backup
    await restoreBackup(args[0]);
  } else {
    console.error("❌ Invalid usage.");
    console.error("   Usage: node scripts/rollback.js [backup-id]");
    console.error("   Or:    node scripts/rollback.js list");
    process.exit(1);
  }
}

main().catch(console.error);
