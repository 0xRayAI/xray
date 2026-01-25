import { frameworkReportingSystem } from "../../dist/reporting/framework-reporting-system.js";

async function generatePhase1Report() {
  console.log("🚀 Generating Phase 1 Completion Report...");

  const config = {
    type: "full-analysis",
    outputFormat: "markdown",
    outputPath: "./reports/phase1/PHASE_1_COMPLETION_REPORT.md",
    detailedMetrics: true,
    includeCharts: false,
    timeRange: { lastHours: 24 },
  };

  try {
    const report = await frameworkReportingSystem.generateReport(config);
    console.log("✅ Report generated successfully!");
    console.log("📄 Saved to: PHASE_1_COMPLETION_REPORT.md");
    console.log("\n📊 Report Summary:");
    console.log(report.split("\n").slice(0, 10).join("\n"));
    console.log("... (full report saved to file)");
  } catch (error) {
    console.error("❌ Report generation failed:", error);
    process.exit(1);
  }
}

generatePhase1Report();
