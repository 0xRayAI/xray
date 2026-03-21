# Pipeline Testing Methodology

**Version**: 1.0.0  
**Date**: 2026-03-21  
**Purpose**: Formalize pipeline testing as a core StringRay practice

---

## The Problem

Unit tests pass but pipelines fail. Why?

```
Unit Test: ✅ Passes (isolated, mocked)
Pipeline Test: ❌ Fails (real integration)
```

**Root Cause**: Integration issues only visible when components work together.

---

## The Solution: Pipeline Testing

A **pipeline test** exercises the complete flow from input to output, verifying all components work together.

---

## The Methodology

### Step 1: Identify All Pipelines

Every major feature has a pipeline. Map yours:

```
┌─────────────────────────────────────────────────┐
│ PIPELINE NAME                                    │
│ Input → Layer1 → Layer2 → ... → Output          │
│                                                  │
│ Components: [list all components]                 │
│ Artifacts: [list data files, configs]           │
└─────────────────────────────────────────────────┘
```

#### Example: Inference Pipeline

```
Input Layer
  ↓
Routing Engines (TaskSkillRouter → RouterCore → KeywordMatcher)
  ↓
Analytics Engines (OutcomeTracker → PerformanceAnalyzer)
  ↓
Learning Engines (PatternTracker → LearningEngine)
  ↓
Autonomous Engines (InferenceTuner)
  ↓
Output Layer

Components: 17 engines
Artifacts: logs/framework/routing-outcomes.json, pattern-metrics.json
```

#### Your Pipeline Structure

| Pipeline | Layers | Components | Status |
|----------|--------|------------|--------|
| Inference | 6 | 17 | ✅ Tested |
| Governance | ? | ? | ❌ Not tested |
| Orchestration | ? | ? | ❌ Not tested |
| Framework Boot | ? | ? | ❌ Not tested |

### Step 2: Create the Pipeline Test

Use this template:

```typescript
// src/__tests__/pipeline/[pipeline-name]-pipeline.test.ts

import { describe, it, expect, beforeEach } from 'vitest';

describe('[Pipeline Name] Pipeline', () => {
  beforeEach(() => {
    // Reset all pipeline state
    // Clear artifacts (JSON files)
    // Reset singletons
  });

  // ============================================
  // LAYER 1: INPUT
  // ============================================
  describe('Layer 1: Input', () => {
    it('should accept valid input', () => {
      // Test data ingestion
    });

    it('should reject invalid input', () => {
      // Test validation
    });
  });

  // ============================================
  // LAYER 2: PROCESSING
  // ============================================
  describe('Layer 2: Processing', () => {
    it('should process input through component A', () => {
      // Test first transformation
    });

    it('should pass data to component B', () => {
      // Test component connection
    });

    it('should handle component failures gracefully', () => {
      // Test error handling
    });
  });

  // ============================================
  // LAYER N: [Add each layer]
  // ============================================

  // ============================================
  // LAYER X: OUTPUT
  // ============================================
  describe('Layer X: Output', () => {
    it('should produce expected output', () => {
      // Test final result
    });

    it('should persist artifacts', () => {
      // Verify JSON files created
    });
  });

  // ============================================
  // END-TO-END
  // ============================================
  describe('End-to-End', () => {
    it('should complete full pipeline', () => {
      // Test complete flow
    });

    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### Step 3: The Test Pattern

Use this shell script pattern for manual testing:

```bash
# test-pipeline.sh

echo "=== [PIPELINE NAME] PIPELINE TEST ==="
echo ""

echo "📍 Layer 1: Input"
# Test input handling

echo "📍 Layer 2: Processing"
# Test each component

echo "📍 Layer N: Output"
# Test output generation

echo "📍 End-to-End"
# Test complete flow

echo ""
echo "✅ Pipeline test complete"
```

**Node.js version**:

```javascript
// test-pipeline.mjs (run with: node test-pipeline.mjs)

console.log('=== [PIPELINE NAME] PIPELINE TEST ===\n');

// Import components
import { component1 } from './component1.js';
import { component2 } from './component2.js';

// Track results
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// Layer 1: Input
console.log('📍 Layer 1: Input');
test('should accept valid input', () => {
  const result = component1.input({ data: 'test' });
  if (!result) throw new Error('No result');
});

// Layer 2: Processing
console.log('\n📍 Layer 2: Processing');
test('should process through component', () => {
  const result = component2.process({ input: 'data' });
  if (!result.output) throw new Error('No output');
});

// End-to-End
console.log('\n📍 End-to-End');
test('should complete full pipeline', async () => {
  await component1.initialize();
  const result = await component2.run();
  if (!result.success) throw new Error('Pipeline failed');
});

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);
```

### Step 4: The Iteration Loop

This is critical. **One pass is never enough.**

```
┌─────────────────────────────────────────────────────────────┐
│                    ITERATION LOOP                           │
│                                                              │
│  1. Run pipeline test                                        │
│  2. Find issue                                              │
│  3. Fix issue                                               │
│  4. Run test again                                          │
│  5. Find next issue                                          │
│  6. ...                                                     │
│  7. Repeat until NO issues found                             │
│  8. Run test ONE MORE TIME to confirm                       │
│  9. Pipeline is complete ONLY when test passes 3x in a row │
└─────────────────────────────────────────────────────────────┘
```

**The Rule**: Say "pipeline complete" only after test passes **3 consecutive times** with no changes between runs.

### Step 5: Verify Completeness

Use this checklist:

```
□ All layers tested
□ All components in pipeline loaded
□ All data flows verified
□ All artifacts created/read correctly
□ Async operations properly awaited
□ Error handling tested
□ Test passes 3x consecutively
□ No console.log/error in test output
```

---

## The Inference Pipeline Test (Reference)

This is what we created during v1.14.0:

```javascript
// test-inference-pipeline.mjs
import { TaskSkillRouter } from './dist/delegation/task-skill-router.js';
import { routingOutcomeTracker } from './dist/delegation/analytics/outcome-tracker.js';
import { patternPerformanceTracker } from './dist/analytics/pattern-performance-tracker.js';
import { routingPerformanceAnalyzer } from './dist/analytics/routing-performance-analyzer.js';
import { inferenceTuner } from './dist/services/inference-tuner.js';

console.log('=== INFERENCE PIPELINE TEST ===\n');

// Layer 3: Routing
const router = new TaskSkillRouter();
const tests = [
  ['fix bug', 'bug-triage-specialist'],
  ['review code', 'code-reviewer'],
  ['perf', 'performance-engineer'],
  ['scan security', 'security-auditor'],
  ['refactor module', 'refactorer'],
];

let pass = 0;
for (const [task, expected] of tests) {
  const result = router.routeTask(task, { taskId: 'test' });
  if (result.agent === expected) {
    console.log(`✅ ${task}`);
    pass++;
  } else {
    console.log(`❌ ${task} -> ${result.agent} (expected ${expected})`);
  }
}

// Layer 4: Analytics
routingOutcomeTracker.reloadFromDisk();
patternPerformanceTracker.loadFromDisk();
console.log(`\nOutcomes: ${routingOutcomeTracker.getOutcomes().length}`);
console.log(`Patterns: ${patternPerformanceTracker.getAllPatternMetrics().length}`);

// Layer 5: Performance
const report = routingPerformanceAnalyzer.generatePerformanceReport();
console.log(`\nAvg confidence: ${(report.avgConfidence * 100).toFixed(1)}%`);

// Layer 6: Tuning
await inferenceTuner.runTuningCycle();
console.log('\n✅ Pipeline complete');
```

---

## Governance Pipeline (TESTED)

```
┌─────────────────────────────────────────────────┐
│ GOVERNANCE PIPELINE (TESTED v1.14.1)            │
│                                                  │
│ Input: Operation + Context                      │
│   ↓                                             │
│ Layer 1: Rule Registry (28+ rules)             │
│   ↓                                             │
│ Layer 2: Rule Hierarchy (dependencies)          │
│   ↓                                             │
│ Layer 3: Validator Registry                     │
│   ↓                                             │
│ Layer 4: Rule Executor (validation)             │
│   ↓                                             │
│ Layer 5: Violation Fixer (auto-fix)            │
│   ↓                                             │
│ Output: ValidationReport, ViolationFix[]        │
└─────────────────────────────────────────────────┘

Components: RuleEnforcer, RuleRegistry, RuleHierarchy, ValidatorRegistry, RuleExecutor, ViolationFixer
Artifacts: 93 rules (28 sync + async loaded), logs via frameworkLogger

Status: ✅ TESTED - 3 consecutive passes
Test: src/__tests__/pipeline/test-governance-pipeline.mjs
```

---

## Running Pipeline Tests

```bash
# Run all pipeline tests
npm run test:pipelines

# Run specific pipeline
node src/__tests__/pipeline/test-inference-pipeline.mjs
node src/__tests__/pipeline/test-governance-pipeline.mjs

# Run in watch mode during development
npm run test:pipelines -- --watch
```

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/pipeline-tests.yml
name: Pipeline Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  pipeline-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run test:pipelines
      - run: npm test
```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Identify all pipelines in the system |
| 2 | Map components, layers, and artifacts |
| 3 | Create pipeline test (template provided) |
| 4 | Run test, find issue, fix, repeat |
| 5 | Say "complete" only after 3 consecutive passes |

**Remember**: Unit tests ✅ ≠ Pipeline works ❌

Only pipeline tests prove the pipeline works.

---

**Tags**: #pipeline-testing #methodology #best-practices
