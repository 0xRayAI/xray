#!/usr/bin/env node

/**
 * Daily Routing Analytics Script
 *
 * Generates comprehensive daily reports for routing system performance,
 * providing insights and actionable recommendations for continuous improvement.
 *
 * Usage: node scripts/analytics/daily-routing-analysis.ts [--preview] [--apply]
 * Or from npm: npm run analytics:daily
 *
 * @version 1.0.0
 * @since 2026-03-05
 */

import { taskSkillRouter } from "../../delegation/task-skill-router.js";
import { routingOutcomeTracker } from "../../delegation/task-skill-router.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get proper file URL path resolution for both dev and production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AnalyticsConfig {
  outputDir: string;
  reportPrefix: string;
  retentionDays: number;
  thresholds: {
    lowSuccessRate: number;
    lowConfidence: number;
    lowTemplateMatch: number;
  };
}

const config: AnalyticsConfig = {
  outputDir: process.env.ANALYTICS_OUTPUT_DIR || ".analytics",
  reportPrefix: "routing-report-",
  retentionDays: 30,
  thresholds: {
    lowSuccessRate: 0.7,
    lowConfidence: 0.8,
    lowTemplateMatch: 0.5,
  },
};

/**
 * Ensure output directory exists
 */
function ensureOutputDir(): void {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

/**
 * Clean up old reports beyond retention period
 */
function cleanupOldReports(): void {
  try {
    const files = fs.readdirSync(config.outputDir);
    const now = Date.now();
    const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith(config.reportPrefix)) {
        const filePath = path.join(config.outputDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up old report: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error("⚠️  Warning: Failed to clean up old reports:", error);
  }
}

/**
 * Generate formatted daily report
 */
function generateDailyReport(): string {
  const date = new Date().toISOString().split('T')[0];
  const analytics = taskSkillRouter.getDailyAnalyticsSummary();

  let report = `
╔══════════════════════════════════════════════════════════════╗
║         📊 StringRay Daily Routing Analytics Report            ║
║                    ${date}                              ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 KEY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Routings:     ${analytics.totalRoutings}
Average Confidence: ${analytics.averageConfidence.toFixed(2)}
Template Match Rate: ${(analytics.templateMatchRate * 100).toFixed(1)}%
Success Rate:        ${(analytics.successRate * 100).toFixed(1)}%

`;

  // Top Agents
  if (analytics.topAgents.length > 0) {
    report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 TOP PERFORMING AGENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    analytics.topAgents.forEach((agent, index) => {
      const status = agent.successRate >= config.thresholds.lowSuccessRate ? "✅" : "⚠️";
      report += `${index + 1}. ${status} ${agent.agent.padEnd(20)} | ${agent.count} routes | ${(agent.successRate * 100).toFixed(1)}% success\n`;
    });
  }

  // Top Keywords
  if (analytics.topKeywords.length > 0) {
    report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔤 TOP PERFORMING KEYWORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    analytics.topKeywords.forEach((keyword, index) => {
      const status = keyword.successRate >= config.thresholds.lowSuccessRate ? "✅" : "⚠️";
      report += `${index + 1}. ${status} ${keyword.keyword.padEnd(30)} | ${keyword.count} matches | ${(keyword.successRate * 100).toFixed(1)}% success\n`;
    });
  }

  // Insights
  report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INSIGHTS & RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
  if (analytics.insights.length === 0) {
    report += `✅ All routing metrics within normal parameters. System is performing well!\n`;
  } else {
    analytics.insights.forEach(insight => {
      const icon = insight.includes("Low") || insight.includes("below target") ? "⚠️" : "💡";
      report += `${icon} ${insight}\n`;
    });
  }

  // Recommendations
  report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 AUTOMATED IMPROVEMENTS AVAILABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To apply automated routing improvements, run:
  node scripts/analytics/daily-routing-analysis.ts --apply

This will:
  • Add new high-priority keyword mappings
  • Optimize existing mapping confidence scores
  • Remove low-performing mappings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FULL ANALYTICS DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  const fullAnalytics = taskSkillRouter.getRoutingAnalytics();
  const promptAnalysis = fullAnalytics.promptPatterns;
  const performanceAnalysis = fullAnalytics.routingPerformance;

  report += `
Prompt Pattern Analysis:
  • Total Prompts: ${promptAnalysis.totalPrompts}
  • Template Matches: ${promptAnalysis.templateMatches}
  • Template Match Rate: ${(promptAnalysis.templateMatchRate * 100).toFixed(1)}%
  • Template Gaps Detected: ${promptAnalysis.gaps.length}
  • Emerging Patterns: ${promptAnalysis.emergingPatterns.length}

Routing Performance:
  • Total Routings: ${performanceAnalysis.totalRoutings}
  • Overall Success Rate: ${(performanceAnalysis.overallSuccessRate * 100).toFixed(1)}%
  • Average Confidence: ${performanceAnalysis.avgConfidence.toFixed(2)}
  • Time Range: ${performanceAnalysis.timeRange.start.toISOString().split('T')[0]} to ${performanceAnalysis.timeRange.end.toISOString().split('T')[0]}
  • Recommendations: ${performanceAnalysis.recommendations.length}

  • Agent Metrics: ${performanceAnalysis.agentMetrics.length} agents tracked
  • Keyword Effectiveness: ${performanceAnalysis.keywordEffectiveness.length} keywords analyzed
  • Confidence Metrics: ${performanceAnalysis.confidenceMetrics.length} thresholds evaluated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Report generated at: ${new Date().toISOString()}
╚══════════════════════════════════════════════════════════════╝
`;

  return report;
}

/**
 * Save report to file
 */
function saveReport(report: string, date: string): string {
  const filename = `${config.reportPrefix}${date}.txt`;
  const filepath = path.join(config.outputDir, filename);

  fs.writeFileSync(filepath, report, 'utf-8');
  console.log(`📄 Report saved to: ${filepath}`);

  return filepath;
}

/**
 * Display preview of improvements
 */
function showImprovementsPreview(): void {
  console.log("\n🔍 Previewing Automated Routing Improvements...\n");

  const refinements = taskSkillRouter.applyRoutingRefinements(false);

  console.log(`📊 Proposed Changes:`);
  console.log(`   • New Mappings:     ${refinements.appliedMappings}`);
  console.log(`   • Optimized Mappings: ${refinements.optimizedMappings}`);
  console.log(`   • Removed Mappings:  ${refinements.removedMappings}`);
  console.log(`   • Total Changes:      ${refinements.changes.length}`);

  if (refinements.changes.length > 0) {
    console.log(`\n📋 Sample Changes:`);
    const sampleChanges = refinements.changes.slice(0, 5);
    sampleChanges.forEach((change, index) => {
      const icon = change.type === 'added' ? '➕' : change.type === 'optimized' ? '⚡' : '➖';
      console.log(`   ${index + 1}. ${icon} ${change.type.toUpperCase()}: ${change.reason}`);
    });

    if (refinements.changes.length > 5) {
      console.log(`   ... and ${refinements.changes.length - 5} more changes`);
    }
  }

  console.log("\n💡 To apply these changes, run with --apply flag");
}

/**
 * Apply automated improvements
 */
function applyImprovements(): void {
  console.log("🔧 Applying Automated Routing Improvements...\n");

  const refinements = taskSkillRouter.applyRoutingRefinements(true);

  console.log(`✅ Improvements Applied:`);
  console.log(`   • New Mappings Added:     ${refinements.appliedMappings}`);
  console.log(`   • Mappings Optimized:      ${refinements.optimizedMappings}`);
  console.log(`   • Low-Performing Mappings: ${refinements.removedMappings}`);
  console.log(`   • Total Changes:           ${refinements.changes.length}`);

  if (refinements.changes.length > 0) {
    console.log(`\n📋 Applied Changes:`);
    refinements.changes.forEach((change, index) => {
      const icon = change.type === 'added' ? '➕' : change.type === 'optimized' ? '⚡' : '➖';
      console.log(`   ${index + 1}. ${icon} ${change.type.toUpperCase()}: ${change.reason}`);
    });
  }

  console.log("\n✨ Routing system has been optimized based on recent performance data!");
}

/**
 * Main execution - exported for external use and auto-executed when run directly
 */
export function main(): void {
  console.log("🚀 Starting Daily Routing Analytics...\n");

  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const previewMode = args.includes('--preview');

  // Ensure output directory
  ensureOutputDir();

  // Cleanup old reports
  cleanupOldReports();

  // Generate daily report
  console.log("📊 Generating daily analytics report...\n");
  const report = generateDailyReport();
  const date = new Date().toISOString().split('T')[0] || new Date().toISOString();
  const reportPath = saveReport(report, date);

  // Display report
  console.log(report);

  // Handle improvement modes
  if (applyMode) {
    console.log("🔧 Apply mode requested.\n");
    applyImprovements();
  } else if (previewMode) {
    console.log("🔍 Preview mode requested.\n");
    showImprovementsPreview();
  } else {
    console.log("\n💡 Available options:");
    console.log("   --preview  Show what improvements would be made");
    console.log("   --apply    Apply automated routing improvements\n");
  }

  console.log(`📄 Full report saved to: ${reportPath}`);
  console.log("\n✅ Daily routing analytics completed successfully!");
}

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}