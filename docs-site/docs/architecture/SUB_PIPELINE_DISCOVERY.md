---
slug: "/docs/architecture/sub-pipeline-discovery"
title: "SUB PIPELINE DISCOVERY"
sidebar_label: "SUB PIPELINE DISCOVERY"
sidebar_position: 10
tags: ["architecture"]
---

# Sub-Pipeline Discovery Guide

This document provides a methodology for discovering and documenting all sub-pipelines in the StringRay framework.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STRINGRAY AGENT OS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐     │
│  │   OPENCODE       │    │    PLUGINS       │    │    AGENTS        │     │
│  │   ┌──────────┐   │    │   ┌──────────┐   │    │   ┌──────────┐   │     │
│  │   │ Hooks    │   │    │   │Registry  │   │    │   │ Enforcer  │   │     │
│  │   │ injection│   │    │   │Discovery │   │    │   │ Architect │   │     │
│  │   └──────────┘   │    │   └──────────┘   │    │   │ BugTriage │   │     │
│  │                  │    │                  │    │   └──────────┘   │     │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘     │
│           │                        │                        │               │
│           └────────────────────────┼────────────────────────┘               │
│                                    │                                        │
│                                    v                                        │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                         CORE SYSTEMS                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │    │
│  │  │  Processor  │  │    MCP      │  │  Governance │               │    │
│  │  │  Pipeline   │  │   Servers   │  │  Pipeline   │               │    │
│  │  │  (15+ procs)│  │   (16+)     │  │             │               │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    v                                        │
│                         ┌──────────────────┐                                │
│                         │   STATE MANAGER │                                │
│                         │  (artifacts)    │                                │
│                         └──────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why This Matters

StringRay has evolved into a complex agent OS with many interconnected systems. During development, we found that some systems (like the RuleEnforcer) were built with grand visions but ended up being used differently (via OpenCode hooks instead of as centralized enforcers).

## Discovery Process

### Step 1: Find All Processor Registrations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 1: Discover Processors                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   boot-orchestrator.ts                                                     │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    PROCESSOR DEFS                                   │   │
│   │                                                                     │   │
│   │   PRE-PROCESSORS (15)           POST-PROCESSORS (5+)              │   │
│   │   ┌──────────────────┐          ┌──────────────────┐              │   │
│   │   │ preValidate      │          │ stateValidation  │              │   │
│   │   │ codexCompliance  │          │ testAutoHealing  │              │   │
│   │   │ versionCompliance│          │ regressionTesting│              │   │
│   │   │ consoleLogGuard  │          │ coverageAnalysis │              │   │
│   │   │ asyncPattern     │          │ logProtection    │              │   │
│   │   │ ...              │          │ ...              │              │   │
│   │   └──────────────────┘          └──────────────────┘              │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│   src/processors/implementations/                                          │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │  *.ts files                                                         │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
# Find all processors in boot orchestrator
grep -r "registerProcessor\|PROCESSOR_DEFS" src/core/boot-orchestrator.ts

# Find all processor implementations
ls src/processors/implementations/
```

### Step 2: Find All MCP Servers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 2: Discover MCP Servers                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   src/mcps/*.ts                                                            │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    MCP SERVERS (16+)                                │   │
│   │                                                                     │   │
│   │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │   │
│   │   │ knowledge-     │  │   boot-        │  │  processor-    │      │   │
│   │   │ skills        │  │   orchestrator │  │  pipeline      │      │   │
│   │   └────────────────┘  └────────────────┘  └────────────────┘      │   │
│   │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │   │
│   │   │ enforcer-      │  │    codex-      │  │   ...         │      │   │
│   │   │ tools         │  │    injector    │  │                │      │   │
│   │   └────────────────┘  └────────────────┘  └────────────────┘      │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
ls src/mcps/*.ts | grep -v test | grep -v mock
```

### Step 3: Find All Enforcement/Rule Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 3: Discover Enforcement Components                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   src/enforcement/                                                          │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    RULE ENFORCEMENT                              │   │
│   │                                                                     │   │
│   │   ┌──────────────────┐  ┌──────────────────┐                     │   │
│   │   │ VALIDATORS (29)  │  │   LOADERS (5)    │                     │   │
│   │   │                  │  │                  │                     │   │
│   │   │ architecture     │  │   codex          │                     │   │
│   │   │ testing         │  │   config         │                     │   │
│   │   │ code-quality    │  │   agent          │                     │   │
│   │   │ security        │  │   session       │                     │   │
│   │   │ ...             │  │   ...           │                     │   │
│   │   └──────────────────┘  └──────────────────┘                     │   │
│   │                                                                     │   │
│   │   ┌──────────────────────────────────────────────────────────┐     │   │
│   │   │               CORE CLASSES (4)                          │     │   │
│   │   │  RuleEnforcer, RuleParser, ViolationFixer, RuleLoader   │     │   │
│   │   └──────────────────────────────────────────────────────────┘     │   │
│   │                                                                     │   │
│   │   ACTUAL USAGE: CodexComplianceProcessor (pre-processor)           │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
# RuleEnforcer and related
grep -r "RuleEnforcer\|Validator\|Loader" src/enforcement/

# Validators by category
ls src/enforcement/validators/
```

### Step 4: Find All Services

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 4: Discover Services                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   src/services/                                                            │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    SERVICES                                        │   │
│   │                                                                     │   │
│   │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │   │
│   │   │ InferenceTuner │  │ MemoryMonitor │  │ Performance   │      │   │
│   │   │ (self-tuning)  │  │               │  │ Monitoring    │      │   │
│   │   └────────────────┘  └────────────────┘  └────────────────┘      │   │
│   │   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │   │
│   │   │ Enterprise     │  │    Session    │  │    ...        │      │   │
│   │   │ Monitoring     │  │   Monitor     │  │                │      │   │
│   │   └────────────────┘  └────────────────┘  └────────────────┘      │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
ls src/services/*.ts
```

### Step 5: Check Tests for Pipeline Coverage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Step 5: Pipeline Tests                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   src/__tests__/pipeline/                                                  │
│        │                                                                    │
│        ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                    PIPELINE TESTS                                  │   │
│   │                                                                     │   │
│   │   ┌─────────────────────────┐  ┌─────────────────────────┐         │   │
│   │   │ test-boot-pipeline     │  │ test-mcp-server-        │         │   │
│   │   │ .mjs                   │  │ pipeline.mjs            │         │   │
│   │   └─────────────────────────┘  └─────────────────────────┘         │   │
│   │   ┌─────────────────────────┐  ┌─────────────────────────┐         │   │
│   │   │ test-processor-         │  │ test-orchestration-    │         │   │
│   │   │ pipeline.mjs            │  │ flow.mjs               │         │   │
│   │   └─────────────────────────┘  └─────────────────────────┘         │   │
│   │                                                                     │   │
│   │   Run: npm run test:pipelines                                      │   │
│   └────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

```bash
ls src/__tests__/pipeline/

# Run all pipelines
npm run test:pipelines

# Run specific pipeline
node src/__tests__/pipeline/test-{name}-pipeline.mjs
```

## Known Sub-Pipelines (Current State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUB-PIPELINE MAP                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    PRE-PROCESSORS                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │preValidate│codexComp │verCompliance│consoleLog │asyncPatt │ │   │
│  │  │          │   -lant  │    -ern    │   Guard   │   ern    │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  │      ↓           ↓            ↓            ↓            ↓         │   │
│  │  ┌──────────────────────────────────────────────────────────┐    │   │
│  │  │              CodexComplianceProcessor                     │    │   │
│  │  └──────────────────────────────────────────────────────────┘    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                   POST-PROCESSORS                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │stateValid│testAutoHe │regression │coverageAn │logProtect│ │   │
│  │  │ ation   │   aling   │  Testing  │   alysis  │   ion    │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                   OTHER SYSTEMS                                   │   │
│  │                                                                     │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │   │
│  │  │ Governance   │ │  Performance  │ │   Inference  │               │   │
│  │  │ (rate limit) │ │   Budget      │ │   Tuner      │               │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘               │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

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

1. Create source file in `src/__tests__/pipeline/test-&#123;name&#125;-pipeline.mjs`
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
