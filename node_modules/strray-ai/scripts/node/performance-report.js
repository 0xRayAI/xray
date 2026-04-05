#!/usr/bin/env node

/**
 * StrRay Framework - Performance Report Generator
 *
 * Generates a comprehensive performance report from test results and baselines.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 StrRay Framework - Performance Report Generator");
console.log("================================================\n");

// Check if performance-baselines.json exists
const baselinesPath = path.join(__dirname, "..", "performance-baselines.json");
const reportPath = path.join(__dirname, "..", "performance-report.json");

try {
  if (fs.existsSync(baselinesPath)) {
    const baselines = JSON.parse(fs.readFileSync(baselinesPath, "utf8"));

    console.log("📊 Performance Baselines Loaded");
    console.log(`   Tests: ${Object.keys(baselines).length}`);

    // Generate basic report
    const report = {
      timestamp: new Date().toISOString(),
      framework: "StringRay AI v1.3.4",
      totalTests: Object.keys(baselines).length,
      baselines: baselines,
      status: "generated",
      recommendations: [
        "Monitor performance regressions against baselines",
        "Run performance tests regularly",
        "Update baselines when performance improves",
      ],
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log("✅ Performance report generated successfully");
    console.log(`   Report saved to: ${reportPath}`);
  } else {
    console.log("⚠️  Performance baselines not found");
    console.log("   Run performance tests first to generate baselines");
  }
} catch (error) {
  console.error("❌ Error generating performance report:", error.message);
  process.exit(1);
}

console.log("\n🎯 Performance report generation completed!\n");
