/**
 * Analytics Status CLI Command
 *
 * Shows current consent and analytics status
 *
 * Usage: npx strray-ai analytics status
 */

import { program } from "commander";
import { ConsentManager } from "../../analytics/consent-manager.js";
import { getConfigDir } from "../../core/config-paths.js";

export const analyticsStatusCommand = program
  .command("analytics status")
  .description("Show current analytics consent status")
  .option("-v, --verbose", "Show detailed information", false)
  .action(async (options) => {
    console.log("📊 StringRay Central Analytics Status\n");

    try {
      const consentManager = new ConsentManager();
      const status = await consentManager.getStatus();

      // Show main status
      const enabledEmoji = status.analyticsEnabled ? "✅ ENABLED" : "❌ DISABLED";
      console.log(`🎯 Status: ${enabledEmoji}\n`);

      // Show project ID
      console.log(`📋 Project Information:`);
      console.log(`  Project ID: ${status.projectId}`);
      console.log(`  Consent Version: ${status.consentVersion}`);
      console.log(`  Consent Date: ${status.consentDate.toISOString()}`);

      if (status.lastOptOut) {
        console.log(`  Last Opt-Out: ${status.lastOptOut.toISOString()}`);
      }

      // Show category status
      console.log(`\n📂 Categories Status:`);
      const categories = consentManager.getCategories();
      categories.forEach(cat => {
        const emoji = cat.enabled ? "✅" : "❌";
        console.log(`  ${emoji} ${cat.name.padEnd(15)} ${cat.description}`);
      });

      if (options.verbose) {
        // Show configuration file location
        const configDir = getConfigDir();
        console.log(`\n📁 Configuration Files:`);
        console.log(`  Consent Config: ${configDir}/consent.json`);
        console.log(`  Submission Queue: ${configDir}/analytics/submission-queue.json`);

        // Show detailed information
        console.log(`\n📊 Detailed Information:`);
        const enabledCats = categories.filter(c => c.enabled);
        console.log(`  Enabled Categories: ${enabledCats.length}/${categories.length}`);
        console.log(`  Analytics Active: ${status.analyticsEnabled}`);

        if (status.analyticsEnabled) {
          console.log(`\n💡 Your project is contributing to community learning!`);
          console.log(`   • View what's being submitted: npx strray-ai analytics preview`);
          console.log(`   • Get community insights: npx strray-ai analytics recommendations`);
          console.log(`   • Check performance: npx strray-ai analytics`);
        } else {
          console.log(`\n💡 Analytics is currently disabled.`);
          console.log(`   • Enable anytime: npx strray-ai analytics enable`);
          console.log(`   • Learn more: docs/architecture/central-analytics-store.md`);
        }
      }

    } catch (error) {
      console.error("❌ Failed to get analytics status:", error instanceof Error ? error.message : String(error));
      console.error("\n💡 Try: npx strray-ai analytics status --help");
      process.exit(1);
    }
  });

export default analyticsStatusCommand;