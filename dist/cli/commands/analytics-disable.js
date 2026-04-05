/**
 * Analytics Disable CLI Command
 *
 * Disables StringRay Central Analytics with immediate opt-out
 *
 * Usage: npx strray-ai analytics disable
 */
import { program } from "commander";
import { ConsentManager } from "../../analytics/consent-manager.js";
export const analyticsDisableCommand = program
    .command("analytics disable")
    .description("Disable StringRay Central Analytics (opt-out)")
    .option("-y, --yes", "Skip confirmation prompts", false)
    .action(async (options) => {
    console.log("🔒 Disabling StringRay Central Analytics...\n");
    try {
        const consentManager = new ConsentManager();
        const currentStatus = await consentManager.initialize();
        // Check if already disabled
        if (!currentStatus.analyticsEnabled) {
            console.log("✅ Analytics is already disabled!");
            return;
        }
        // Show what will be disabled
        console.log("📋 Current Status:");
        console.log(`  Project ID: ${currentStatus.projectId}`);
        console.log(`  Enabled Categories: ${Object.entries(currentStatus.categories)
            .filter(([_, enabled]) => enabled)
            .map(([cat]) => cat)
            .join(', ')}`);
        console.log(`  Submissions will: STOP IMMEDIATELY`);
        // Confirmation
        if (!options.yes) {
            console.log(`\n⚠️  This will immediately stop all data submission.`);
            console.log(`   • Existing submission queue will be cleared`);
            console.log(`   • Your project ID will be preserved in config`);
            console.log(`   • You can re-enable anytime: npx strray-ai analytics enable\n`);
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const answer = await new Promise((resolve) => {
                rl.question("Do you want to proceed? (yes/no): ", resolve);
            });
            rl.close();
            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log("❌ Consent not disabled. Aborted.");
                return;
            }
        }
        // Disable consent
        await consentManager.disableConsent();
        // Show success
        console.log("\n✅ Analytics successfully disabled!");
        console.log(`\n🔒 All data submission has stopped.`);
        console.log(`\n📋 Your consent configuration:`);
        const updatedStatus = await consentManager.getStatus();
        console.log(`  Project ID: ${updatedStatus.projectId}`);
        console.log(`  Opt-Out Date: ${updatedStatus.lastOptOut?.toISOString()}`);
        console.log(`  Analytics Enabled: ${updatedStatus.analyticsEnabled}`);
        console.log(`\n💡 Re-enable anytime:`);
        console.log(`  npx strray-ai analytics enable`);
        console.log(`\n📖 Learn more: docs/architecture/central-analytics-store.md`);
    }
    catch (error) {
        console.error("❌ Failed to disable analytics:", error instanceof Error ? error.message : String(error));
        console.error("\n💡 Try: npx strray-ai analytics disable --help");
        process.exit(1);
    }
});
export default analyticsDisableCommand;
//# sourceMappingURL=analytics-disable.js.map