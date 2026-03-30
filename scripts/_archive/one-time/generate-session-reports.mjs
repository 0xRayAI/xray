import fs from 'fs';

// Read activity log
const logContent = fs.readFileSync('logs/framework/activity.log', 'utf8');
const lines = logContent.split('\n').filter(l => l.trim());

// Parse entries with session extraction
const entries = [];
const pattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/;

lines.forEach(line => {
  const match = line.match(pattern);
  if (match) {
    const jobId = match[2];
    // Extract session from job ID (first 10 digits = Unix timestamp)
    const session = jobId.split('-')[1]?.slice(0, 10) || 'unknown';
    entries.push({
      timestamp: match[1],
      jobId: jobId,
      session: session,
      component: match[3],
      message: match[4]
    });
  }
});

// Group by session
const sessions = {};
entries.forEach(entry => {
  if (!sessions[entry.session]) {
    sessions[entry.session] = [];
  }
  sessions[entry.session].push(entry);
});

// Generate session reports
console.log('Generating session reports...\n');

const sessionIds = Object.keys(sessions).sort().slice(-10); // Last 10 sessions

sessionIds.forEach(sessionId => {
  const sessionEntries = sessions[sessionId];
  const date = new Date(parseInt(sessionId) * 1000).toISOString();
  const components = [...new Set(sessionEntries.map(e => e.component))];
  
  // Get success/error counts
  const errors = sessionEntries.filter(e => e.message.includes('ERROR')).length;
  const successes = sessionEntries.filter(e => e.message.includes('SUCCESS')).length;
  
  const report = `# Session Report: ${sessionId}
Generated: ${new Date().toISOString()}

## Summary
- **Date:** ${date}
- **Total Entries:** ${sessionEntries.length}
- **Components:** ${components.length}
- **Errors:** ${errors}
- **Successes:** ${successes}

## Components
${components.map(c => `- ${c}`).join('\n')}

## Timeline
${sessionEntries.map(e => `- [${e.timestamp}] ${e.component}: ${e.message}`).join('\n')}
`;

  const filename = `logs/reports/session-${sessionId}.md`;
  fs.writeFileSync(filename, report);
  console.log(`✅ Session ${sessionId}: ${sessionEntries.length} entries, ${components.length} components`);
});

console.log(`\n✅ Generated ${sessionIds.length} session reports in logs/reports/session-*.md`);
