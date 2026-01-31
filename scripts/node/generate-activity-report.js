import { frameworkReportingSystem } from '../../dist/reporting/framework-reporting-system.js';

async function generateActivityReport() {
  console.log('🚀 Generating activity report for pipeline integration work...');

  const config = {
    type: 'full-analysis',
    timeRange: { lastHours: 2 }, // Last 2 hours
    outputFormat: 'markdown',
    detailedMetrics: true,
    outputPath: './reports/activity/ACTIVITY_REPORT_PIPELINE_INTEGRATION.md'
  };

  try {
    const report = await frameworkReportingSystem.generateReport(config);
    console.log('✅ Activity report generated!');
    console.log('📄 Saved to: ACTIVITY_REPORT_PIPELINE_INTEGRATION.md');
    console.log('\n📊 Report Preview:');
    console.log('==================');
    console.log(report.split('\n').slice(0, 20).join('\n'));
    console.log('\n... (full report saved to file)');
  } catch (error) {
    console.error('❌ Report generation failed:', error);
  }
}

generateActivityReport();