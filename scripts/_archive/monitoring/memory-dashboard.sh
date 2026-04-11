#!/bin/bash

# Memory Health Dashboard
echo "🧠 0xRay Framework - Memory Health Dashboard"
echo "=============================================="

# Get current memory status
node -e "
(async () => {
  const { bootOrchestrator } = await import('./dist/core/boot-orchestrator.js');
  const health = bootOrchestrator.getMemoryHealth();
  
  console.log('📊 Current Memory Health Status');
  console.log('================================');
  console.log('Status:', health.healthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED');
  console.log('');
  
  if (health.issues.length > 0) {
    console.log('🚨 Issues Found:');
    health.issues.forEach((issue, i) => {
      console.log(\`  \${i + 1}. \${issue}\`);
    });
    console.log('');
  }
  
  const m = health.metrics;
  console.log('📈 Memory Metrics:');
  console.log(\`  Current Heap: \${m.current.heapUsed.toFixed(1)} MB\`);
  console.log(\`  Heap Total:   \${m.current.heapTotal.toFixed(1)} MB\`);
  console.log(\`  External:     \${m.current.external.toFixed(1)} MB\`);
  console.log(\`  RSS:          \${m.current.rss.toFixed(1)} MB\`);
  console.log('');
  console.log(\`  Peak Usage:   \${m.peak.heapUsed.toFixed(1)} MB\`);
  console.log(\`  Average:      \${m.average.toFixed(1)} MB\`);
  console.log(\`  Trend:        \${m.trend.toUpperCase()}\`);
  
  // Show recent alerts
  try {
    const alerts = bootOrchestrator.stateManager?.get('memory:alerts') || [];
    if (alerts.length > 0) {
      console.log('');
      console.log('🚨 Recent Memory Alerts (last 5):');
      alerts.slice(-5).forEach((alert, i) => {
        const time = new Date(alert.timestamp).toLocaleTimeString();
        console.log(\`  \${time} - \${alert.message}\`);
      });
    }
  } catch (e) {
    // Ignore if state manager not available
  }
})();
" 2>/dev/null