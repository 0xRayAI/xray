/**
 * Analytics Enable Action
 *
 * Enables 0xRay Central Analytics with opt-in consent
 *
 * Usage: npx strray-ai analytics enable [--categories reflections,logs,metrics,patterns]
 */

import { ConsentManager } from "../../analytics/consent-manager.js";

export async function analyticsEnableAction(options: any) {
    console.log("🔓 Enabling 0xRay Central Analytics...\n");

    try {
        const consentManager = new ConsentManager();
        const currentStatus = await consentManager.initialize();

        // Check if already enabled
        if (currentStatus.analyticsEnabled) {
            console.log("✅ Analytics is already enabled!");
            console.log(`\nCurrent Status:`);
            console.log(`  Project ID: ${currentStatus.projectId}`);
            console.log(`  Categories: ${Object.entries(currentStatus.categories)
                .filter(([_, enabled]) => enabled)
                .map(([cat]) => cat)
                .join(', ')}`);
            return;
        }

        // Parse categories
        let categories: string[] | undefined;
        if (options.all) {
            categories = ["reflections", "logs", "metrics", "patterns"];
        } else if (options.categories) {
            categories = options.categories.split(',').map((c: string) => c.trim());
        }

        // Show what will be enabled
        console.log("📋 Configuration:");
        console.log(`  Categories to enable: ${categories ? categories.join(', ') : 'all'}`);
        console.log(`  Project ID will be: ${currentStatus.projectId}`);
        console.log(`  Consent version: 1.0`);

        // Confirmation
        if (!options.yes) {
            console.log(`\n⚠️  This will enable anonymous data submission to 0xRay Central Analytics.`);
            console.log(`   • Data is anonymized before submission`);
            console.log(`   • You can disable anytime with: npx strray-ai analytics disable`);
            console.log(`   • Preview what would be submitted: npx strray-ai analytics preview`);
            console.log(`   • Learn more: docs/architecture/central-analytics-store.md\n`);

            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise<string>((resolve) => {
                rl.question("Do you want to proceed? (yes/no): ", resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
                console.log("❌ Consent not enabled. Aborted.");
                return;
            }
        }

        // Enable consent
        await consentManager.enableConsent(categories);

        // Show success
        console.log("\n✅ Analytics successfully enabled!");
        console.log(`\n🎉 Your project can now contribute to community learning!`);
        console.log(`\n📋 Your consent configuration:`);
        const updatedStatus = await consentManager.getStatus();
        console.log(`  Project ID: ${updatedStatus.projectId}`);
        console.log(`  Consent Date: ${updatedStatus.consentDate.toISOString()}`);
        console.log(`  Categories Enabled: ${Object.entries(updatedStatus.categories)
            .filter(([_, enabled]) => enabled)
            .map(([cat]) => cat)
            .join(', ')}`);

        console.log(`\n💡 Next steps:`);
        console.log(`  1. Check what will be submitted: npx strray-ai analytics preview`);
        console.log(`  2. View current status: npx strray-ai analytics status`);
        console.log(`  3. Disable anytime: npx strray-ai analytics disable`);

    } catch (error) {
        console.error("❌ Failed to enable analytics:", error instanceof Error ? error.message : String(error));
        console.error("\n💡 Try: npx strray-ai analytics enable --help");
        process.exit(1);
    }
}