---
slug: "/docs/reference/pattern-data-collection-tools"
title: "Pattern Data Collection Tools"
sidebar_label: "Pattern Data Collection Tools"
sidebar_position: 1
tags: ["reference"]
---

# StringRay Data Collection & Analysis Tools - Complete Reference

**Framework Version**: v1.7.2  
**Last Updated**: 2026-03-06  
**Purpose**: Comprehensive guide to all available tools and commands for gathering and analyzing development data

---

## 🎯 Executive Summary

StringRay v1.7.2 provides **comprehensive data collection and analysis capabilities** through multiple integrated systems:

### **Available Systems**:
1. **CLI Commands** - Interactive command-line tools for analysis
2. **Analytics Engines** - Programmatic pattern detection and learning
3. **Node Scripts** - Specialized analysis and validation scripts
4. **Reporting System** - Framework-wide activity reporting
5. **Pattern Detection** - Emerging pattern identification and tracking

### **Key Capabilities**:
- ✅ **Pattern Collection** - Detect and analyze development patterns
- ✅ **Performance Tracking** - Monitor system and pattern performance
- ✅ **Learning Engine** - Adaptive pattern learning and optimization
- ✅ **Emergent Detection** - Identify new patterns from usage data
- ✅ **Drift Analysis** - Track pattern performance changes over time
- ✅ **Calibration** - Adjust system parameters based on historical data

---

## 🖥️ CLI Commands for Data Collection

### **Primary Analytics Commands**

#### **1. `npx strray-ai analytics`**
**Purpose**: Central analytics command for pattern analysis and insights  
**Description**: StringRay Central Analytics - Pattern analysis, insights, and consent management

**Options**:
```bash
-l, --limit <number>     # Limit analysis to last N entries (default: 1000)
-o, --output <file>     # Save report to file
```

**Usage Examples**:
```bash
# Analyze last 1000 entries
npx strray-ai analytics -l 1000

# Analyze and save to file
npx strray-ai analytics -l 1000 -o analytics-report.json

# Full analysis with output
npx strray-ai analytics -l 1000 -o ./reports/pattern-analysis.json
```

**Features**:
- Analyze log entries for development patterns
- Generate pattern insights and recommendations
- Support for consent management (v1.7.2+)
- Export results to JSON format
- Limit analysis to specific number of entries

**Use Cases**:
- Weekly pattern analysis
- Development behavior insights
- Performance trend identification
- Consent and privacy management

#### **2. `npx strray-ai calibrate`**
**Purpose**: Calibrate complexity predictions based on historical accuracy  
**Description**: Calibrate complexity predictions based on historical accuracy

**Options**:
```bash
-m, --min-samples <number>  # Minimum samples needed (default: 10)
-a, --apply                # Apply calibration to complexity analyzer
```

**Usage Examples**:
```bash
# Calibrate with default settings
npx strray-ai calibrate

# Calibrate with specific sample size
npx strray-ai calibrate -m 25

# Calibrate and apply results
npx strray-ai calibrate -m 25 -a
```

**Features**:
- Analyze historical accuracy data
- Calculate complexity threshold adjustments
- Provide accuracy breakdown (under/accurate/over)
- Apply calibrated thresholds to system
- Minimum sample validation

**Use Cases**:
- Improve complexity prediction accuracy
- Adjust routing thresholds based on real data
- Optimize delegation decisions
- Weekly calibration after major changes

#### **3. `npx strray-ai report`**
**Purpose**: Generate framework activity and health reports  
**Description**: Generate framework activity and health reports

**Options**:
```bash
-t, --type <type>     # Report type (full-analysis, agent-usage, performance)
-o, --output <file>   # Output file path
```

**Usage Examples**:
```bash
# Generate full analysis report
npx strray-ai report -t full-analysis

# Generate agent usage report
npx strray-ai report -t agent-usage -o agent-usage.json

# Generate performance report
npx strray-ai report -t performance -o perf-report.json
```

**Features**:
- Comprehensive framework reporting
- Multiple report types available
- JSON output format
- Activity and health metrics
- Agent usage tracking

**Use Cases**:
- Weekly development reporting
- System health monitoring
- Agent performance analysis
- Framework activity tracking

#### **4. `npx strray-ai doctor`**
**Purpose**: Diagnose framework issues (does not fix them)  
**Description**: Diagnose framework issues

**Usage Examples**:
```bash
# Full diagnostic check
npx strray-ai doctor

# Check specific aspects
npx strray-ai doctor
```

**Features**:
- Node.js version checking
- Package installation verification
- Configuration file validation
- Common issue detection
- Automated fix suggestions

**Use Cases**:
- Framework health checks
- Installation validation
- Configuration troubleshooting
- Pre-flight deployment checks

---

## 🔬 Programmatic Analytics Engines

### **Core Analytics Classes**

#### **1. `emergingPatternDetector`**
**File**: `src/analytics/emerging-pattern-detector.ts`  
**Purpose**: Discover new routing patterns from recent task requests

**Available Methods**:
```typescript
// Main pattern detection method
detectEmergingPatterns(tasks: Task[]): PatternDiscoveryResult

// Clustering and pattern identification
clusterTasks(tasks: Task[]): ClusterResult[]

// Similarity calculation
calculateSimilarity(keywords1: string[], keywords2: string[]): number

// Pattern emergence validation
isPatternEmerging(pattern: EmergentPattern): boolean

// Suggest keyword mappings
suggestKeywordMappings(tasks: Task[]): Array<{keyword: string; mappings: string[]}>
```

**Usage**:
```javascript
import { emergingPatternDetector } from './dist/analytics/emerging-pattern-detector.js';

const tasks = [
  { id: 'task-1', description: 'Fix skill system bug', keywords: ['skill', 'bug'] },
  { id: 'task-2', description: 'Update documentation', keywords: ['documentation', 'update'] }
];

const patterns = emergingPatternDetector.detectEmergingPatterns(tasks);
console.log('New patterns:', patterns.emergentPatterns);
console.log('Clusters:', patterns.clusters);
```

**Features**:
- Identifies recurring patterns in task descriptions
- Clusters similar tasks for pattern recognition
- Calculates pattern confidence and frequency
- Suggests keyword-to-agent mappings
- Validates pattern emergence criteria

**Use Cases**:
- Weekly pattern discovery
- New pattern identification
- Agent routing optimization
- Keyword mapping suggestions

#### **2. `patternPerformanceTracker`**
**File**: `src/analytics/pattern-performance-tracker.ts`  
**Purpose**: Track pattern performance metrics and detect drift

**Available Methods**:
```typescript
// Track individual pattern performance
trackPatternPerformance(outcome: RoutingOutcome): void

// Detect performance drift over time
detectPatternDrift(patternId: string): PatternDriftInfo | null

// Get all drift analyses
getAllDriftAnalyses(): PatternDriftInfo[]

// Calculate adaptive thresholds
calculateAdaptiveThresholds(): AdaptiveThresholds

// Get system performance summary
getSystemPerformanceSummary(): SystemPerformanceSummary

// Get pattern metrics
getPatternMetrics(patternId: string): PatternMetrics | null

// Get all pattern metrics
getAllPatternMetrics(): PatternMetrics[]

// Clear tracking data
clear(): void
```

**Usage**:
```javascript
import { patternPerformanceTracker } from './dist/analytics/pattern-performance-tracker.js';

// Track routing outcome
const outcome = {
  taskId: 'task-1',
  routedAgent: 'architect',
  routedSkill: 'architecture-patterns',
  confidence: 0.98,
  success: true
};

patternPerformanceTracker.trackPatternPerformance(outcome);

// Detect drift
const drift = patternPerformanceTracker.detectPatternDrift('architect');
if (drift && drift.detected) {
  console.log('Pattern drift detected:', drift);
}

// Get system summary
const summary = patternPerformanceTracker.getSystemPerformanceSummary();
console.log('System performance:', summary);
```

**Features**:
- Tracks individual pattern performance over time
- Detects performance drift and degradation
- Calculates adaptive thresholds based on history
- Provides comprehensive system performance metrics
- Identifies patterns needing attention

**Use Cases**:
- Pattern performance monitoring
- Drift detection and alerting
- Adaptive threshold calculation
- System health assessment
- Pattern optimization recommendations

#### **3. `patternLearningEngine`**
**File**: `src/analytics/pattern-learning-engine.ts`  
**Purpose**: Learn from performance data and generate adaptive modifications

**Available Methods**:
```typescript
// Main learning function
learnFromData(data: LearningData): LearningResult

// Generate pattern modifications
generatePatternModifications(): PatternUpdate[]

// Generate pattern removals
generatePatternRemovals(): PatternUpdate[]

// Generate threshold updates
generateThresholdUpdates(): PatternUpdate[]

// Generate new patterns
generateNewPatterns(): PatternUpdate[]

// Generate recommendations
generateRecommendations(): string[]

// Get learning history
getLearningHistory(): LearningResult[]

// Update configuration
updateConfig(updates: Partial<AdaptiveLearningConfig>): void

// Get current configuration
getConfig(): AdaptiveLearningConfig
```

**Usage**:
```javascript
import { patternLearningEngine } from './dist/analytics/pattern-learning-engine.js';

const learningData = {
  tasks: weeklyTasks,
  outcomes: routingOutcomes,
  performanceMetrics: {
    averageSuccessRate: 0.95,
    averageConfidence: 0.92,
    totalRoutes: 100,
    successfulRoutes: 95
  }
};

const learningResult = patternLearningEngine.learnFromData(learningData);

console.log('New patterns:', learningResult.newPatterns);
console.log('Modified patterns:', learningResult.modifiedPatterns);
console.log('Removed patterns:', learningResult.removedPatterns);
console.log('Threshold updates:', learningResult.thresholdUpdates);
console.log('Recommendations:', learningResult.recommendations);
```

**Features**:
- Adaptive pattern learning from real usage data
- Generates pattern updates (add, modify, remove)
- Calculates adaptive thresholds based on performance
- Provides actionable recommendations
- Maintains learning history for analysis

**Use Cases**:
- Automated pattern optimization
- Threshold adaptation based on usage
- Obsolete pattern removal
- New pattern addition from emergent patterns
- Continuous improvement of routing accuracy

#### **4. `promptPatternAnalyzer`**
**File**: `src/analytics/prompt-pattern-analyzer.ts`  
**Purpose**: Analyze actual vs. template prompts to detect gaps and emerging patterns

**Available Methods**:
```typescript
// Analyze prompt patterns
analyzePromptPatterns(): PromptComparisonResult

// Detect template gaps
detectTemplateGaps(promptData: PromptDataPoint[], outcomes: RoutingOutcome[]): TemplateGap[]

// Identify emerging patterns
identifyEmergingPatterns(promptData: PromptDataPoint[], outcomes: RoutingOutcome[]): EmergingPattern[]

// Analyze missed keywords
analyzeMissedKeywords(promptData: PromptDataPoint[]): Array<{keyword: string; count: number; suggestedMappings: string[]}>

// Calculate agent coverage
calculateAgentCoverage(promptData: PromptDataPoint[]): Map<string, {total: number; withTemplate: number; withoutTemplate: number}>

// Generate template optimization suggestions
generateOptimizationSuggestions(comparisonResult: PromptComparisonResult): TemplateOptimizationSuggestion[]

// Generate analytics report
generateReport(comparisonResult: PromptComparisonResult): string
```

**Usage**:
```javascript
import { promptPatternAnalyzer } from './dist/analytics/prompt-pattern-analyzer.js';

// Analyze prompt patterns
const comparisonResult = promptPatternAnalyzer.analyzePromptPatterns();

console.log('Template match rate:', comparisonResult.templateMatchRate);
console.log('Template gaps:', comparisonResult.gaps);
console.log('Emerging patterns:', comparisonResult.emergingPatterns);
console.log('Agent coverage:', comparisonResult.agentCoverage);

// Generate optimization suggestions
const suggestions = promptPatternAnalyzer.generateOptimizationSuggestions(comparisonResult);
suggestions.forEach(suggestion => {
  console.log('Suggestion:', suggestion.type, suggestion.reasoning);
});

// Generate report
const report = promptPatternAnalyzer.generateReport(comparisonResult);
console.log(report);
```

**Features**:
- Compares actual prompts vs. template prompts
- Identifies template gaps and missing patterns
- Detects emerging patterns from real usage
- Analyzes agent coverage and routing effectiveness
- Generates actionable optimization suggestions
- Produces comprehensive analytics reports

**Use Cases**:
- Template optimization
- Gap identification and filling
- Prompt quality improvement
- Routing accuracy enhancement
- Template system evolution

#### **5. `routingPerformanceAnalyzer`**
**File**: `src/analytics/routing-performance-analyzer.ts`  
**Purpose**: Analyze routing performance metrics and identify optimization opportunities

**Available Methods**:
```typescript
// Analyze routing performance
analyzeRouting(routingData: RoutingData[]): RoutingPerformanceAnalysis

// Calculate average confidence
calculateAverageConfidence(routingData: RoutingData[]): number

// Calculate success rate
calculateSuccessRate(routingData: RoutingData[]): number

// Generate performance rating
generatePerformanceRating(analysis: RoutingPerformanceAnalysis): string

// Generate optimization recommendations
generateOptimizationRecommendations(analysis: RoutingPerformanceAnalysis): OptimizationRecommendation[]
```

**Usage**:
```javascript
import { routingPerformanceAnalyzer } from './dist/analytics/routing-performance-analyzer.js';

const routingData = [
  { query: '@architect analyze', routedAgent: 'architect', confidence: 0.98, success: true },
  { query: '@enforcer validate', routedAgent: 'enforcer', confidence: 0.95, success: true }
];

const analysis = routingPerformanceAnalyzer.analyzeRouting(routingData);

console.log('Average confidence:', analysis.averageConfidence);
console.log('Success rate:', analysis.successRate);
console.log('Performance rating:', analysis.performance);

// Get recommendations
const recommendations = analysis.recommendations;
recommendations.forEach(rec => {
  console.log('Recommendation:', rec.type, rec.description);
});
```

**Features**:
- Comprehensive routing performance analysis
- Confidence and success rate tracking
- Performance rating generation
- Optimization recommendation identification
- Trend analysis and pattern detection

**Use Cases**:
- Routing performance monitoring
- Agent effectiveness evaluation
- Confidence threshold optimization
- Success rate improvement
- Systematic routing optimization

#### **6. `routingRefiner`**
**File**: `src/analytics/routing-refiner.ts`  
**Purpose**: Analyze routing patterns and generate refinements for improved accuracy

**Available Methods**:
```typescript
// Analyze refinements
analyzeRefinements(): RefinementAnalysis

// Generate refinement suggestions
generateRefinements(routingData: RoutingData[]): RefinementSuggestion[]

// Identify refinement opportunities
identifyRefinementOpportunities(routingData: RoutingData[]): RefinementOpportunity[]

// Generate refinement application plan
generateRefinementPlan(refinements: RefinementSuggestion[]): RefinementPlan
```

**Usage**:
```javascript
import { routingRefiner } from './dist/analytics/routing-refiner.js';

// Analyze routing refinements
const refinementAnalysis = routingRefiner.analyzeRefinements();

console.log('Refinement opportunities:', refinementAnalysis.refinementOpportunities);
console.log('High priority refinements:', refinementAnalysis.highPriorityRefinements);
console.log('Expected impact:', refinementAnalysis.expectedImpact);

// Get refinement suggestions
const refinements = refinementAnalysis.refinements;
refinements.forEach(refinement => {
  console.log('Refinement:', refinement.type, refinement.target, refinement.suggestedState);
});
```

**Features**:
- Systematic refinement opportunity identification
- Priority-based refinement suggestion
- Impact assessment for each refinement
- Comprehensive refinement planning
- Targeted improvements for specific aspects

**Use Cases**:
- Routing accuracy improvement
- Agent mapping optimization
- Keyword refinement
- Pattern library enhancement
- Systematic quality improvement

---

## 🔧 Node Scripts for Specialized Analysis

### **Analytics & Reporting Scripts**

#### **1. `analyze-activity-log.cjs`**
**Purpose**: Analyze framework activity logs and generate insights

**Usage**:
```bash
node scripts/node/analyze-activity-log.cjs
```

**Features**:
- Activity log parsing and analysis
- Agent usage patterns identification
- Performance metrics extraction
- Trend analysis over time

#### **2. `generate-activity-report.js`**
**Purpose**: Generate comprehensive framework activity reports

**Usage**:
```bash
node scripts/node/generate-activity-report.js
```

**Features**:
- Complete activity summary generation
- Agent performance metrics
- System health indicators
- Export to multiple formats

#### **3. `performance-report.js`**
**Purpose**: Generate detailed performance analysis reports

**Usage**:
```bash
node scripts/node/performance-report.js
```

**Features**:
- Performance metrics compilation
- Bottleneck identification
- Resource usage analysis
- Optimization recommendations

#### **4. `generate-autonomous-report.cjs`**
**Purpose**: Generate autonomous operation reports

**Usage**:
```bash
node scripts/node/generate-autonomous-report.cjs
```

**Features**:
- Autonomous operation tracking
- Success/failure rate analysis
- Pattern effectiveness evaluation

### **Testing & Validation Scripts**

#### **5. `kernel-e2e-test.mjs`**
**Purpose**: Run end-to-end kernel tests with real framework data

**Usage**:
```bash
node scripts/node/kernel-e2e-test.mjs
```

**Features**:
- Real framework environment testing
- Kernel pattern validation
- Performance and accuracy testing
- Comprehensive reporting

#### **6. `kernel-framework-test.mjs`**
**Purpose**: Test kernel integration with full framework

**Usage**:
```bash
node scripts/node/kernel-framework-test.mjs
```

**Features**:
- Framework integration validation
- Component interaction testing
- End-to-end workflow verification

#### **7. `kernel-live-test.mjs`**
**Purpose**: Test kernel with live production-like scenarios

**Usage**:
```bash
node scripts/node/kernel-live-test.mjs
```

**Features**:
- Live scenario simulation
- Real-time pattern detection
- Performance under load testing

#### **8. `kernel-real-framework-test.mjs`**
**Purpose**: Comprehensive kernel testing with real framework components

**Usage**:
```bash
node scripts/node/kernel-real-framework-test.mjs
```

**Features**:
- Complete framework testing
- All component interaction validation
- Real-world scenario simulation

### **Analysis Scripts**

#### **9. `analyzer-agent-runner.js`**
**Purpose**: Run analytics agents for pattern detection and analysis

**Usage**:
```bash
node scripts/node/analyzer-agent-runner.js
```

**Features**:
- Automated agent execution
- Pattern detection agents
- Analysis coordination
- Result aggregation

#### **10. `dependency-scan.cjs`**
**Purpose**: Scan and analyze dependency patterns

**Usage**:
```bash
node scripts/node/dependency-scan.cjs
```

**Features**:
- Dependency structure analysis
- Dependency health assessment
- Security vulnerability scanning
- Optimization recommendations

---

## 📊 Data Collection Workflow

### **Recommended Daily Workflow**

```bash
# Morning - Daily health check
npx strray-ai doctor

# During development - Monitor performance
npx strray-ai analytics -l 100

# End of day - Generate reports
npx strray-ai report -t full-analysis -o daily-report.json

# Weekly calibration
npx strray-ai calibrate -m 100 -a
```

### **Recommended Weekly Workflow**

```bash
# Monday - Pattern collection and analysis
node scripts/node/analyze-activity-log.cjs
node scripts/node/generate-activity-report.js

# Wednesday - Performance analysis
node scripts/node/performance-report.js

# Friday - Comprehensive testing
node scripts/node/kernel-e2e-test.mjs
node scripts/node/kernel-framework-test.mjs

# Weekly calibration
npx strray-ai calibrate -m 500 -a
```

### **Recommended Monthly Workflow**

```bash
# Week 1 - Comprehensive pattern analysis
npx strray-ai analytics -l 5000 -o monthly-patterns.json

# Week 2 - Performance optimization
node scripts/node/performance-report.js

# Week 3 - System calibration
npx strray-ai calibrate -m 1000 -a

# Week 4 - Comprehensive testing
node scripts/node/kernel-real-framework-test.mjs
node scripts/node/generate-autonomous-report.cjs
```

---

## 🎯 Best Practices for Data Collection

### **1. Regular Collection**
- **Daily**: Basic health and performance checks
- **Weekly**: Pattern analysis and calibration
- **Monthly**: Comprehensive analysis and optimization

### **2. Data Quality**
- **Consistent**: Use standardized formats and time ranges
- **Complete**: Collect all relevant metrics and dimensions
- **Accurate**: Validate data integrity and accuracy
- **Timely**: Collect data at regular intervals

### **3. Analysis Depth**
- **Pattern Level**: Identify recurring behaviors and trends
- **Performance Level**: Track effectiveness and efficiency
- **Drift Level**: Monitor changes and degradation over time
- **Learning Level**: Enable adaptive improvements and optimizations

### **4. Actionable Insights**
- **Specific**: Provide concrete, actionable recommendations
- **Prioritized**: Rank by impact and effort
- **Tested**: Validate recommendations before implementation
- **Documented**: Track recommendation effectiveness

### **5. Continuous Improvement**
- **Monitor**: Track recommendation effectiveness over time
- **Iterate**: Update and refine based on results
- **Automate**: Automate routine collection and analysis
- **Share**: Distribute insights across team for collective learning

---

## 🚀 Quick Start Guide

### **Immediate Actions** (What to do today):

```bash
# 1. Run health check
npx strray-ai doctor

# 2. Start collecting data
npx strray-ai analytics -l 1000 -o current-data.json

# 3. Analyze current patterns
npx strray-ai analytics -l 1000

# 4. Check calibration status
npx strray-ai calibrate

# 5. Generate comprehensive report
npx strray-ai report -t full-analysis -o comprehensive-report.json
```

### **Setup Monitoring** (Ongoing):

```bash
# Create daily data collection script
# Save as: scripts/daily-analytics.sh

#!/bin/bash
echo "📊 Daily Analytics - $(date)"
echo "================================"

npx strray-ai doctor
npx strray-ai analytics -l 500 -o daily-analytics-$(date +%Y%m%d).json
npx strray-ai report -t agent-usage -o agent-usage-$(date +%Y%m%d).json

# Make executable and run daily
chmod +x scripts/daily-analytics.sh
```

---

## 📈 Analytics Data Flow

```
┌─────────────────────────────────────────────┐
│         Development Activities               │
│    (Tasks, Routing, Outcomes)         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Analytics Collection Layer              │
│  (CLI Commands, Scripts, Engines)       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Pattern Detection & Analysis         │
│  (Emerging, Performance, Learning)      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      Insights & Recommendations          │
│  (Optimization, Updates, Actions)      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│      System Improvements                  │
│  (Patterns Updated, Thresholds Calibrated) │
└─────────────────────────────────────────────┘
```

---

## ✅ Summary

StringRay v1.7.2 provides **comprehensive data collection and analysis capabilities** through:

### **Key Tools**:
- 🖥️ **6 CLI Commands** for interactive analysis
- 🔬 **6 Analytics Engines** for programmatic pattern detection
- 🔧 **10+ Specialized Scripts** for detailed analysis
- 📊 **Integrated Reporting** for framework-wide insights

### **Core Capabilities**:
- ✅ Pattern detection and emergence identification
- ✅ Performance tracking and drift detection
- ✅ Adaptive learning and optimization
- ✅ Template analysis and gap identification
- ✅ Routing performance analysis and refinement
- ✅ Comprehensive calibration and reporting

### **Production Readiness**:
- 🟢 **All systems operational** and ready for production use
- 🟢 **Data collection workflows** established and tested
- 🟢 **Analysis capabilities** comprehensive and effective
- 🟢 **Actionable insights** generation working correctly

**Recommendation**: Begin regular data collection immediately to enable pattern learning and system optimization!

---

**Document Version**: 1.0  
**Framework Version**: v1.7.2  
**Last Updated**: 2026-03-06T12:30:00Z

*"Comprehensive data collection and analysis tools for pattern detection, performance tracking, and adaptive learning."*
