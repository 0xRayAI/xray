#!/usr/bin/env node

/**
 * Simple Activity Log Analyzer
 * Analyzes the framework activity log to understand what happened
 */

const fs = require('fs');

function analyzeActivityLog() {
  const logFile = 'logs/framework/activity.log';

  if (!fs.existsSync(logFile)) {
    console.error('Activity log not found:', logFile);
    return;
  }

  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  console.log('=== FRAMEWORK ACTIVITY ANALYSIS ===\n');
  console.log(`Total log entries: ${lines.length}\n`);

  // Parse log entries
  const logPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \[([^\]]+)\] \[([^\]]+)\] (.+?) - (SUCCESS|ERROR|INFO|DEBUG)$/;

  const parsedLogs = [];
  const components = new Map();
  const jobs = new Map();
  let successCount = 0;
  let errorCount = 0;
  let infoCount = 0;

  lines.forEach((line, index) => {
    const match = line.match(logPattern);
    if (!match) {
      console.log(`Unparseable line ${index + 1}: ${line.substring(0, 100)}...`);
      return;
    }

    const [, timestamp, jobId, component, message, level] = match;
    const logEntry = { timestamp, jobId, component, message, level };

    parsedLogs.push(logEntry);

    // Count by level
    switch (level) {
      case 'SUCCESS': successCount++; break;
      case 'ERROR': errorCount++; break;
      case 'INFO': infoCount++; break;
    }

    // Count by component
    if (!components.has(component)) {
      components.set(component, { total: 0, success: 0, error: 0, info: 0 });
    }
    const compStats = components.get(component);
    compStats.total++;
    switch (level) {
      case 'SUCCESS': compStats.success++; break;
      case 'ERROR': compStats.error++; break;
      case 'INFO': compStats.info++; break;
    }

    // Track jobs
    if (!jobs.has(jobId)) {
      jobs.set(jobId, { component, logs: [], startTime: new Date(timestamp), endTime: null, success: null });
    }
    const job = jobs.get(jobId);
    job.logs.push(logEntry);

    if (level === 'SUCCESS' || level === 'ERROR') {
      job.endTime = new Date(timestamp);
      job.success = level === 'SUCCESS';
    }
  });

  console.log(`Parsed entries: ${parsedLogs.length}`);
  console.log(`Success entries: ${successCount}`);
  console.log(`Error entries: ${errorCount}`);
  console.log(`Info entries: ${infoCount}\n`);

  // Component analysis
  console.log('=== COMPONENT ACTIVITY ===');
  const sortedComponents = Array.from(components.entries()).sort((a, b) => b[1].total - a[1].total);

  sortedComponents.slice(0, 15).forEach(([component, stats]) => {
    const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0';
    console.log(`${component}: ${stats.total} total (${successRate}% success, ${stats.error} errors)`);
  });

  console.log('\n=== JOB ANALYSIS ===');
  const completedJobs = Array.from(jobs.values()).filter(job => job.endTime !== null);
  const successfulJobs = completedJobs.filter(job => job.success);
  const failedJobs = completedJobs.filter(job => !job.success);

  console.log(`Total jobs: ${jobs.size}`);
  console.log(`Completed jobs: ${completedJobs.length}`);
  console.log(`Successful jobs: ${successfulJobs.length}`);
  console.log(`Failed jobs: ${failedJobs.length}`);

  if (completedJobs.length > 0) {
    const successRate = ((successfulJobs.length / completedJobs.length) * 100).toFixed(1);
    console.log(`Overall success rate: ${successRate}%`);
  }

  // Timeline analysis
  console.log('\n=== TIMELINE ANALYSIS ===');
  if (parsedLogs.length > 0) {
    const startTime = new Date(parsedLogs[0].timestamp);
    const endTime = new Date(parsedLogs[parsedLogs.length - 1].timestamp);
    const duration = endTime - startTime;

    console.log(`Start time: ${startTime.toISOString()}`);
    console.log(`End time: ${endTime.toISOString()}`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)} seconds`);

    // Activity by minute
    const activityByMinute = new Map();
    parsedLogs.forEach(log => {
      const minute = new Date(log.timestamp).getMinutes();
      activityByMinute.set(minute, (activityByMinute.get(minute) || 0) + 1);
    });

    console.log('\nActivity by minute:');
    for (const [minute, count] of activityByMinute.entries()) {
      console.log(`Minute ${minute}: ${count} activities`);
    }
  }

  // Error analysis
  console.log('\n=== ERROR ANALYSIS ===');
  const errors = parsedLogs.filter(log => log.level === 'ERROR');
  console.log(`Total errors: ${errors.length}`);

  if (errors.length > 0) {
    const errorByComponent = new Map();
    errors.forEach(error => {
      errorByComponent.set(error.component, (errorByComponent.get(error.component) || 0) + 1);
    });

    console.log('\nErrors by component:');
    for (const [component, count] of errorByComponent.entries()) {
      console.log(`${component}: ${count} errors`);
    }

    console.log('\nSample errors:');
    errors.slice(0, 5).forEach(error => {
      console.log(`[${error.component}] ${error.message}`);
    });
  }

  // Key insights
  console.log('\n=== KEY INSIGHTS ===');

  // Most active component
  const mostActive = sortedComponents[0];
  console.log(`Most active component: ${mostActive[0]} (${mostActive[1].total} activities)`);

  // Success rate assessment
  const overallSuccessRate = parsedLogs.length > 0 ? ((successCount / parsedLogs.length) * 100).toFixed(1) : '0';
  console.log(`Overall success rate: ${overallSuccessRate}%`);

  // System health assessment
  if (errorCount === 0) {
    console.log('✅ System health: EXCELLENT - No errors detected');
  } else if (errorCount < parsedLogs.length * 0.05) {
    console.log('✅ System health: GOOD - Low error rate');
  } else if (errorCount < parsedLogs.length * 0.15) {
    console.log('⚠️ System health: FAIR - Moderate error rate');
  } else {
    console.log('❌ System health: POOR - High error rate');
  }

  // Performance assessment
  if (parsedLogs.length > 0) {
    const startTime = new Date(parsedLogs[0].timestamp);
    const endTime = new Date(parsedLogs[parsedLogs.length - 1].timestamp);
    const totalDuration = endTime - startTime;
    const avgActivitiesPerSecond = totalDuration > 0 ?
      (parsedLogs.length / (totalDuration / 1000)).toFixed(1) : '0';
    console.log(`Average activity rate: ${avgActivitiesPerSecond} per second`);
  }

  console.log('\n=== ANALYSIS COMPLETE ===');
}

analyzeActivityLog();