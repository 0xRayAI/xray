# Sub-Pipeline Discovery Guide

This document provides a methodology for discovering and documenting all sub-pipelines in the 0xRay framework.

## Why This Matters

0xRay has evolved into a complex agent OS with many interconnected systems. During development, we found that some systems (like the RuleEnforcer) were built with grand visions but ended up being used differently (via OpenCode hooks instead of as centralized enforcers).

## Discovery Process

### Step 1: Find All Processor Registrations

```bash
# Find all processors in boot orchestrator
grep -r "registerProcessor\|PROCESSOR_DEFS" src/core/boot-orchestrator.ts

# Find all processor implementations
ls src/processors/implementations/
```

### Step 2: Find All MCP Servers

```bash
ls src/mcps/*.ts | grep -v test | grep -v mock
```

### Step 3: Find All Enforcement/Rule Components

```bash
# RuleEnforcer and related
grep -r "RuleEnforcer\|Validator\|Loader" src/enforcement/

# Validators by category
ls src/enforcement/validators/
```

### Step 4: Find All Services

```bash
ls src/services/*.ts
```

### Step 5: Check Tests for Pipeline Coverage

```bash
ls src/__tests__/pipeline/
```

## Known Sub-Pipelines (Current State)

| Sub-Pipeline | Description | Status |
|-------------|-------------|--------|
| **Pre-Processors** | 15 processors (preValidate, codexCompliance, etc.) | ✅ Active |
| **Post-Processors** | 5+ processors (stateValidation, testAutoHealing, etc.) | ✅ Active |
| **RuleEnforcer** | 29 validators, 5 loaders, 4 core classes | ✅ Active via CodexComplianceProcessor |
| **MCP Servers** | 16 server implementations | ✅ Active |
| **InferenceTuner** | Self-tuning routing based on outcomes | ✅ Active |
| **Governance** | SpawnGovernanceProcessor, rate limiting | ✅ Active |
| **Performance** | PerformanceBudgetProcessor | ✅ Active |
| **ConsoleLogGuard** | Blocks console.log in prod | ✅ Active |
| **AsyncPattern** | Validates async/await usage | ✅ Active |
| **VersionCompliance** | Enforces version sync | ✅ Active |
| **TestAutoCreation** | Auto-generates tests | ✅ Active |
| **RegressionTesting** | Runs regression tests post-write | ✅ Active |
| **CoverageAnalysis** | Analyzes test coverage | ✅ Active |
| **LogProtection** | Protects sensitive log data | ✅ Active |

## What Was Different Than Expected

| System | Original Vision | Actual Usage |
|--------|----------------|--------------|
| **RuleEnforcer** | Central enforcement engine | Runs via CodexComplianceProcessor pre-processor |
| **Enforcer Agent** | Does all enforcement | Now routes to specialists; CodexComplianceProcessor does actual validation |
| **SpawnGovernance** | Spawns governance agent on commits | Currently validates but doesn't spawn agents |
| **PerformanceBudget** | Enforces perf budgets | Validates but doesn't block |
| **ViolationFixer** | Maps violations to agents | Not actively used |

## How to Document a New Pipeline

1. Create source file in `src/__tests__/pipeline/test-{name}-pipeline.mjs`
2. Test: existence of source files, build artifacts, key methods
3. Add to `run-all-pipelines.mjs`
4. Document in `docs/architecture/PIPELINE_INVENTORY.md`

## Running Pipeline Discovery

```bash
# List all test pipelines
ls src/__tests__/pipeline/*.mjs

# Run all pipelines
npm run test:pipelines

# Run specific pipeline
node src/__tests__/pipeline/test-{name}-pipeline.mjs
```
