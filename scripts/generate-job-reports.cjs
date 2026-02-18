const fs = require('fs');

// Read activity log
const logContent = fs.readFileSync('logs/framework/activity.log', 'utf8');
const lines = logContent.split('\n').filter(l => l.trim());

// Parse entries
const entries = [];
const pattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/;

lines.forEach(line => {
  const match = line.match(pattern);
  if (match) {
    entries.push({
      timestamp: match[1],
      jobId: match[2],
      component: match[3],
      message: match[4]
    });
  }
});

// Get unique job IDs from the last 100 entries
const recentEntries = entries.slice(-100);
const jobIds = [...new Set(recentEntries.map(e => e.jobId))].slice(0, 5);

console.log('Generating reports for jobs:');
jobIds.forEach((jobId, i) => {
  console.log(`  ${i+1}. ${jobId}`);
  
  const jobEntries = entries.filter(e => e.jobId === jobId);
  const components = [...new Set(jobEntries.map(e => e.component))];
  
  const report = `# Job Report: ${jobId}
Generated: ${new Date().toISOString()}

## Summary
- Total Entries: ${jobEntries.length}
- Components Involved: ${components.length}
- Start Time: ${jobEntries[0]?.timestamp}
- End Time: ${jobEntries[jobEntries.length-1]?.timestamp}

## Components
${components.map(c => `- ${c}`).join('\n')}

## Timeline
${jobEntries.map(e => `- [${e.timestamp}] ${e.component}: ${e.message}`).join('\n')}
`;
  
  fs.writeFileSync(`logs/reports/job-${jobId}.md`, report);
});

console.log('\n✅ Reports generated in logs/reports/');
