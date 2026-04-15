#!/usr/bin/env node
/**
 * CI Report Generator
 * 
 * Generates reports from logs/framework/activity.log for CI dashboards
 * Reports: agent-usage, processor-execution, error-summary, tool-usage
 * 
 * Usage: node scripts/node/ci-report-generator.mjs [--report agent|processor|error|tool|all]
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_FILE = process.cwd() + '/logs/framework/activity.log';
const OUTPUT_DIR = process.cwd() + '/.ci-reports';

function parseLogFile() {
  if (!existsSync(LOG_FILE)) {
    console.log('No activity.log found');
    return [];
  }
  
  const content = readFileSync(LOG_FILE, 'utf-8');
  return content.split('\n').filter(line => line.trim());
}

function generateAgentReport(logs) {
  const agentSpawns = logs.filter(l => l.includes('spawn-authorized'));
  const agentTypes = {};
  
  for (const log of agentSpawns) {
    const match = log.match(/"agentType":"([^"]+)"/);
    if (match) {
      const type = match[1];
      agentTypes[type] = (agentTypes[type] || 0) + 1;
    }
  }
  
  // agent-spawn-governor logs with explicit result
  const explicitResults = logs.filter(l => l.includes('[agent-spawn-governor]') && l.includes('spawn-completed'));
  const failures = explicitResults.filter(l => l.includes('"result":"failure"'));
  const successes = explicitResults.filter(l => l.includes('"result":"success"'));
  
  // spawn-governance logs (no result field = success)
  const governanceCompleted = logs.filter(l => l.includes('[spawn-governance]') && l.includes('spawn-completed'));
  const governanceSuccesses = governanceCompleted.length;
  
  const totalCompleted = explicitResults.length + governanceSuccesses;
  const totalFailures = failures.length;
  const totalSuccesses = successes.length + governanceSuccesses;
  
  return {
    totalSpawns: agentSpawns.length,
    byType: agentTypes,
    completed: totalCompleted,
    failures: totalFailures,
    successes: totalSuccesses,
    failureRate: totalCompleted > 0 ? (totalFailures / totalCompleted * 100).toFixed(1) + '%' : 'N/A',
    breakdown: {
      withResult: { completed: explicitResults.length, failures: failures.length, successes: successes.length },
      governance: { completed: governanceSuccesses }
    }
  };
}

function generateProcessorReport(logs) {
  const preProcs = logs.filter(l => l.includes('pre-processor succeeded'));
  const postProcs = logs.filter(l => l.includes('post-processor succeeded'));
  const procFailures = logs.filter(l => l.includes('pre-processor failed') || l.includes('post-processor failed'));
  
  const preByName = {};
  for (const log of preProcs) {
    const match = log.match(/"processor":"([^"]+)"/);
    if (match) {
      const name = match[1];
      preByName[name] = (preByName[name] || 0) + 1;
    }
  }
  
  const postByName = {};
  for (const log of postProcs) {
    const match = log.match(/"processor":"([^"]+)"/);
    if (match) {
      const name = match[1];
      postByName[name] = (postByName[name] || 0) + 1;
    }
  }
  
  const durations = {};
  for (const log of preProcs) {
    const match = log.match(/"processor":"([^"]+)".*"duration":(\d+)/);
    if (match) {
      const name = match[1];
      const dur = parseInt(match[2]);
      if (!durations[name]) durations[name] = [];
      durations[name].push(dur);
    }
  }
  
  const avgDurations = {};
  for (const [name, durs] of Object.entries(durations)) {
    const sum = durs.reduce((a, b) => a + b, 0);
    avgDurations[name] = (sum / durs.length).toFixed(1) + 'ms';
  }
  
  return {
    preProcessors: { count: preProcs.length, byName: preByName, avgDuration: avgDurations },
    postProcessors: { count: postProcs.length, byName: postByName },
    failures: procFailures.length,
    successRate: preProcs.length > 0 ? ((preProcs.length - procFailures.length) / preProcs.length * 100).toFixed(1) + '%' : 'N/A'
  };
}

function generateErrorReport(logs) {
  const errors = logs.filter(l => l.includes(' - ERROR |'));
  const errorTypes = {};
  const recentErrors = [];
  
  for (const log of errors) {
    const match = log.match(/\[([^\]]+)\] \[([^\]]+)\] ([^ -]+) - ERROR/);
    if (match) {
      const source = match[3];
      errorTypes[source] = (errorTypes[source] || 0) + 1;
    }
    
    const msgMatch = log.match(/"message":"([^"]+)"/);
    if (msgMatch && recentErrors.length < 10) {
      recentErrors.push({
        timestamp: log.substring(0, 24),
        message: msgMatch[1]
      });
    }
  }
  
  return {
    totalErrors: errors.length,
    bySource: errorTypes,
    recentErrors
  };
}

function generateToolReport(logs) {
  const tools = logs.filter(l => l.includes('"tool":"'));
  const toolCounts = {};
  
  for (const log of tools) {
    const match = log.match(/"tool":"([^"]+)"/);
    if (match) {
      const tool = match[1];
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    }
  }
  
  const sorted = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
  
  return {
    totalToolCalls: tools.length,
    byTool: sorted
  };
}

function generateReport(type) {
  console.log(`📊 Generating ${type} report...`);
  
  const logs = parseLogFile();
  if (logs.length === 0) {
    console.log('⚠️  No logs to analyze');
    return null;
  }

  const timestamp = new Date().toISOString();
  const report = {
    generatedAt: timestamp,
    logFile: LOG_FILE,
    totalLogLines: logs.length,
  };
  
  switch (type) {
    case 'agent':
      report.data = generateAgentReport(logs);
      break;
    case 'processor':
      report.data = generateProcessorReport(logs);
      break;
    case 'error':
      report.data = generateErrorReport(logs);
      break;
    case 'tool':
      report.data = generateToolReport(logs);
      break;
    case 'all':
      report.agent = generateAgentReport(logs);
      report.processor = generateProcessorReport(logs);
      report.error = generateErrorReport(logs);
      report.tool = generateToolReport(logs);
      break;
    default:
      console.log(`Unknown report type: ${type}`);
      return null;
  }
  
  return report;
}

const args = process.argv.slice(2);
const type = args[0]?.replace('--', '') || 'all';
const report = generateReport(type);

if (report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  console.log('\n=== 📊 CI Report (' + type + ') ===');
  console.log('Generated:', timestamp);
  console.log(JSON.stringify(report, null, 2));
  
  const outputFile = join(OUTPUT_DIR, `ci-${type}-report-${timestamp}.json`);
  try {
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log(`\n✅ Saved to: ${outputFile}`);
  } catch (e) {
    console.log(`\n⚠️ Note: Could not save to ${outputFile} (${e.message})`);
  }
}
