# Reporting Pipeline

**Purpose**: Generate comprehensive framework reports from activity logs

**Data Flow**:
```
generateReport(config)
    │
    ▼
Check cache (5 min TTL)
    │
    ▼
collectReportData(config)
    │
    ├─► frameworkLogger.getRecentLogs(1000)
    ├─► readCurrentLogFile()
    └─► readRotatedLogFiles() (if lastHours > 24)
    │
    ▼
calculateMetrics(logs)
    │
    ├─► Agent usage counts
    ├─► Delegation counts
    ├─► Context operations
    └─► Tool execution stats
    │
    ▼
generateInsights(logs, metrics)
    │
    ▼
generateRecommendations(metrics)
    │
    ▼
formatReport(data, format) → Markdown | JSON | HTML
    │
    ▼
saveReportToFile(outputPath) (optional)
    │
    ▼
Return ReportData
```

**Layers**:
- Layer 1: Log Collection (frameworkLogger, rotated logs)
- Layer 2: Log Parsing (parseLogLine, parseCompressedLogFile)
- Layer 3: Metrics Calculation (calculateMetrics)
- Layer 4: Insights Generation (generateInsights)
- Layer 5: Report Formatting (Markdown, JSON, HTML)
- Layer 6: Scheduled Reports (scheduleAutomatedReports)

**Components**:
- `src/reporting/framework-reporting-system.ts` (FrameworkReportingSystem)
- `src/core/framework-logger.ts` (frameworkLogger)

**Report Types**:
| Type | Description |
|------|-------------|
| orchestration | Agent delegation metrics |
| agent-usage | Per-agent invocation counts |
| context-awareness | Context operation analysis |
| performance | Response time and throughput |
| full-analysis | Comprehensive all-of-the-above |

**Entry Points**:
| Entry | File:Line | Description |
|-------|-----------|-------------|
| generateReport() | framework-reporting-system.ts:87 | Main entry |
| scheduleAutomatedReports() | framework-reporting-system.ts:110 | Scheduled |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | ReportData { generatedAt, metrics, insights } |
| Failure | Error thrown |

**Artifacts**:
- `logs/framework/activity.log` (current log)
- `logs/framework/framework-activity-*.log.gz` (rotated)
- `reports/${type}-report-${date}.md|json|html` (generated)

**Configuration**:
- Log retention: 24 hours
- Report cache TTL: 5 minutes
- Scheduled: hourly/daily/weekly

**Testing Requirements**:
1. Logs collected correctly
2. Metrics calculated accurately
3. Insights generated
4. Report formatted correctly
