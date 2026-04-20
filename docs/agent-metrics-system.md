# Agent Metrics System

## Overview

The Agent Metrics System provides comprehensive metrics tracking for all agent invocations in the 0xRay framework.

## Features

### 1. Invocation Tracking
- **Who**: Tracks agent name, type, and role
- **When**: Records precise timestamps for all invocations
- **Success/Failure**: Captures outcome status and error details
- **Duration**: Measures execution time in milliseconds
- **Complexity**: Records complexity level and score
- **Session Context**: Links invocations to sessions and parent tasks

### 2. Aggregation Functions
- **By Agent**: Summarizes metrics per agent including:
  - Total invocations
  - Success/failure counts and rates
  - Average duration and complexity
  - First and last invocation timestamps
  - Operations performed

- **By Time Period**: Groups metrics by:
  - Hour (`YYYY-MM-DDTHH:00`)
  - Day (`YYYY-MM-DD`)
  - Week (`YYYY-Www`)
  - Month (`YYYY-MM`)

- **By Complexity Level**: Tracks metrics for:
  - `simple`
  - `moderate`
  - `complex`
  - `enterprise`

### 3. History Tracking with Configurable Retention
```typescript
const metricsSystem = new AgentMetricsSystem(stateManager, {
  maxEntries: 10000,          // Maximum invocations to store
  maxAgeMs: 30 * 24 * 60 * 60 * 1000,  // 30 days retention
  enableAutoCleanup: true,    // Automatic cleanup
  cleanupIntervalMs: 60 * 60 * 1000,  // Cleanup every hour
});
```

### 4. Export Functionality
- **JSON**: Full invocation data for programmatic access
- **CSV**: Spreadsheet-compatible format
- **Summary**: Aggregated metrics without raw data
- **Detailed**: Combined raw data and aggregations

## Usage

### Basic Tracking
```typescript
import { AgentMetricsSystem, initializeAgentMetrics } from "./metrics";

// Initialize with state manager
const metrics = initializeAgentMetrics(stateManager);

// Track successful invocation
metrics.trackSuccess({
  agentName: "code-analyzer",
  agentType: "code-analyzer",
  operation: "analyze",
  complexityLevel: "moderate",
  complexityScore: 30,
  duration: 1500,
  sessionId: "session-123",
});

// Track failed invocation
metrics.trackFailure({
  agentName: "security-auditor",
  agentType: "security-auditor",
  operation: "scan",
  error: "Permission denied",
  duration: 500,
});
```

### Filtering Invocations
```typescript
// Filter by agent
const agentInvocations = metrics.filterInvocations({
  agentNames: ["orchestrator", "code-analyzer"],
});

// Filter by time range
const recentInvocations = metrics.filterInvocations({
  timeRange: {
    start: Date.now() - 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
});

// Filter by complexity and success
const complexFailures = metrics.filterInvocations({
  complexityLevels: ["complex", "enterprise"],
  failureOnly: true,
});
```

### Aggregating Metrics
```typescript
// Full aggregation
const aggregated = metrics.aggregateMetrics();

// Aggregated by filter
const specificMetrics = metrics.aggregateMetrics({
  agentNames: ["orchestrator"],
  timeRange: {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
});

// Get specific summaries
const orchestratorSummary = metrics.getAgentSummary("orchestrator");
const todaySummary = metrics.getTimePeriodSummary("2026-04-17", "day");
const complexSummary = metrics.getComplexitySummary("complex");
```

### Exporting Metrics
```typescript
// Export as JSON
const jsonExport = metrics.exportMetrics("json");

// Export as CSV
const csvExport = metrics.exportMetrics("csv");

// Export summary
const summaryExport = metrics.exportMetrics("summary");

// Export with filter
const filteredExport = metrics.exportMetrics("json", {
  successOnly: true,
  timeRange: {
    start: Date.now() - 24 * 60 * 60 * 1000,
    end: Date.now(),
  },
});
```

### Managing Retention
```typescript
// Manual cleanup
const result = metrics.cleanup(
  30 * 24 * 60 * 60 * 1000,  // Older than 30 days
  10000                        // Keep max 10000 entries
);

// Update retention config
metrics.updateRetentionConfig({
  maxEntries: 5000,
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
});

// Reset all metrics
metrics.resetMetrics();
```

## Integration with Agent Delegator

The AgentDelegator automatically tracks all agent invocations:

```typescript
const delegator = new AgentDelegator(stateManager, configLoader);
delegator.initialize();  // Creates AgentMetricsSystem internally

// All delegation executions are automatically tracked
const result = await delegator.executeDelegation(analysis, request);
```

## Types

### AgentInvocation
```typescript
interface AgentInvocation {
  id: string;
  agentName: string;
  agentType: AgentType;
  timestamp: number;
  operation: string;
  description: string;
  complexityLevel: ComplexityLevel;
  complexityScore: number;
  duration: number;
  success: boolean;
  error?: string;
  sessionId?: string;
  parentTaskId?: string;
  inputTokens?: number;
  outputTokens?: number;
  metadata?: Record<string, unknown>;
}
```

### AgentType
```typescript
type AgentType =
  | "orchestrator"
  | "architect"
  | "enforcer"
  | "code-analyzer"
  | "code-reviewer"
  | "researcher"
  | "frontend-engineer"
  | "backend-engineer"
  | "devops-engineer"
  | "security-auditor"
  | "database-engineer"
  | "testing-lead"
  | "performance-engineer"
  | "refactorer"
  | "bug-triage-specialist"
  | "strategist"
  | "tech-writer"
  | "content-creator"
  | "seo-consultant"
  | "growth-strategist"
  | "log-monitor"
  | "multimodal-looker"
  | "mobile-developer"
  | "frontend-ui-ux-engineer"
  | "custom"
  | "unknown";
```

### ComplexityLevel
```typescript
type ComplexityLevel = "simple" | "moderate" | "complex" | "enterprise";
```

## API Reference

### AgentMetricsSystem

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the metrics system |
| `trackInvocation(params)` | Track a single invocation |
| `trackSuccess(params)` | Track a successful invocation |
| `trackFailure(params)` | Track a failed invocation |
| `filterInvocations(filter)` | Filter invocations by criteria |
| `aggregateMetrics(filter?)` | Get aggregated metrics |
| `getAgentSummary(name)` | Get summary for specific agent |
| `getTimePeriodSummary(period, type)` | Get summary for time period |
| `getComplexitySummary(level)` | Get summary for complexity level |
| `cleanup(olderThan?, maxEntries?)` | Remove old entries |
| `resetMetrics()` | Clear all metrics |
| `exportMetrics(format, filter?)` | Export metrics data |
| `getStatistics()` | Get overall statistics |
| `updateRetentionConfig(config)` | Update retention settings |
| `destroy()` | Cleanup resources |

## Best Practices

1. **Initialize Early**: Create the metrics system early in your application lifecycle
2. **Use Filters**: When working with large datasets, use filters to limit results
3. **Configure Retention**: Set appropriate retention limits based on storage constraints
4. **Export Regularly**: Export metrics periodically to prevent data loss
5. **Monitor Statistics**: Use `getStatistics()` for quick insights

## Example: Daily Report

```typescript
function generateDailyReport(metrics: AgentMetricsSystem) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const summary = metrics.getTimePeriodSummary(yesterdayStr, "day");
  if (!summary) {
    return "No activity yesterday";
  }

  return `
Daily Report - ${yesterdayStr}
========================
Total Invocations: ${summary.totalInvocations}
Success Rate: ${summary.successRate.toFixed(1)}%
Average Duration: ${summary.averageDuration.toFixed(0)}ms

Top Agents:
${Object.entries(summary.agents)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([name, count]) => `  - ${name}: ${count}`)
  .join("\n")}
  `.trim();
}
```
