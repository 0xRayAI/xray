# Processor Pipeline

**Purpose**: Execute validation, compliance, and enhancement processors before/after operations

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROCESSOR PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           INPUT LAYER                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │executePreProcessors │  │executePostProcessors│                          │
│  │ processor-manager.ts│  │ processor-manager.ts│                          │
│  └──────────┬──────────┘  └──────────┬──────────┘                          │
└─────────────┼────────────────────────┼─────────────────────────────────────┘
              │                         │
              └─────────────┬───────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │               PROCESSOR ENGINES (5 layers)                          │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                LAYER 1: Processor Registry                   │   │  │
│  │  │                                                             │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │                ProcessorRegistry                        │ │   │  │
│  │  │  │             processor-registry.ts                       │ │   │  │
│  │  │  │                                                         │ │   │  │
│  │  │  │  get(name) → ProcessorInstance                          │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │              LAYER 2: Pre-Processors (6)                   │   │  │
│  │  │                                                             │   │  │
│  │  │  Get pre-processors (type="pre", enabled)                   │   │  │
│  │  │  Sort by priority (ascending)                               │   │  │
│  │  │                                                             │   │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │   │  │
│  │  │  │preValid │→ │codexCom │→ │testAuto │→ │versionC │        │   │  │
│  │  │  │  (10)  │  │  (20)   │  │  (22)   │  │  (25)   │        │   │  │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │   │  │
│  │  │  ┌─────────┐  ┌─────────┐                                 │   │  │
│  │  │  │errorBnd │→ │agentsMd │                                 │   │  │
│  │  │  │  (30)   │  │  (35)   │                                 │   │  │
│  │  │  └─────────┘  └─────────┘                                 │   │  │
│  │  │                                                             │   │  │
│  │  │  preValidate         → Syntax checking                      │   │  │
│  │  │  codexCompliance    → Codex rules validation                │   │  │
│  │  │  testAutoCreation   → Auto-generate tests                  │   │  │
│  │  │  versionCompliance  → NPM/UVM version check                │   │  │
│  │  │  errorBoundary      → Error handling setup                 │   │  │
│  │  │  agentsMdValidation → AGENTS.md validation                  │   │  │
│  │  │                                                             │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                  LAYER 3: Main Operation                     │   │  │
│  │  │                                                             │   │  │
│  │  │           ┌─────────────────────────────────┐              │   │  │
│  │  │           │         TOOL EXECUTION           │              │   │  │
│  │  │           │                                   │              │   │  │
│  │  │           │   Read/Write/Modify/Execute...    │              │   │  │
│  │  │           │                                   │              │   │  │
│  │  │           └─────────────────────────────────┘              │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │             LAYER 4: Post-Processors (2)                    │   │  │
│  │  │                                                             │   │  │
│  │  │  Get post-processors (type="post", enabled)                  │   │  │
│  │  │  Sort by priority (ascending)                               │   │  │
│  │  │                                                             │   │  │
│  │  │  ┌─────────────┐  ┌─────────────┐                          │   │  │
│  │  │  │stateValid  │→ │refactorLog  │                          │   │  │
│  │  │  │   (130)    │  │   (140)     │                          │   │  │
│  │  │  └─────────────┘  └─────────────┘                          │   │  │
│  │  │                                                             │   │  │
│  │  │  stateValidation     → State consistency check              │   │  │
│  │  │  refactoringLogging → Agent completion logging             │   │  │
│  │  │                                                             │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │              LAYER 5: Health Monitoring                    │   │  │
│  │  │                                                             │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │                  ProcessorHealth                       │ │   │  │
│  │  │  │                                                         │ │   │  │
│  │  │  │  Status: healthy | degraded | failed                   │ │   │  │
│  │  │  │  lastExecution: timestamp                             │ │   │  │
│  │  │  │  successRate: percentage                              │ │   │  │
│  │  │  │                                                         │ │   │  │
│  │  │  │  ProcessorMetrics:                                    │ │   │  │
│  │  │  │  • totalExecutions                                    │ │   │  │
│  │  │  │  • successRate                                        │ │   │  │
│  │  │  │  • avgDuration                                        │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     v
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   PostProcessorResult[]                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │    name     │  │   success   │  │   error     │                │  │
│  │  │  (string)   │  │  (boolean)  │  │  (string)   │                │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │  │
│  │                                                                     │  │
│  │  Additional: data, duration, timestamp                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Compact Data Flow

```
Tool Execution Request
    │
    ▼
executePreProcessors(tool, args, context)
    │
    ├─► Get pre-processors (type="pre", enabled)
    ├─► Sort by priority (ascending)
    │
    ▼
For each processor:
    │
    ├─► processorRegistry.get(name)
    │
    └─► processor.execute(context)
    │
    ▼
Tool Execution
    │
    ▼
executePostProcessors(operation, data, preResults)
    │
    ├─► Get post-processors (type="post", enabled)
    ├─► Sort by priority (ascending)
    │
    ▼
For each processor:
    │
    ├─► processorRegistry.get(name)
    │
    └─► processor.execute({operation, data, preResults})
    │
    ▼
Return PostProcessorResult[]
```

## Layers

- **Layer 1**: Processor Registry (ProcessorRegistry)
- **Layer 2**: Pre-Processors (priority-ordered)
- **Layer 3**: Main Operation
- **Layer 4**: Post-Processors (priority-ordered)
- **Layer 5**: Health Monitoring (ProcessorHealth)

## Pre-Processors (Priority Order)

| Priority | Processor | Purpose |
|----------|-----------|---------|
| 10 | preValidate | Syntax checking |
| 20 | codexCompliance | Codex rules |
| 22 | testAutoCreation | Auto-generate tests |
| 25 | versionCompliance | NPM/UVM check |
| 30 | errorBoundary | Error handling |
| 35 | agentsMdValidation | AGENTS.md validation |

## Post-Processors (Priority Order)

| Priority | Processor | Purpose |
|----------|-----------|---------|
| 130 | stateValidation | State consistency |
| 140 | refactoringLogging | Agent completion |

## Components

| Component | File |
|-----------|------|
| ProcessorManager | `src/processors/processor-manager.ts` |
| ProcessorRegistry | `src/processors/processor-registry.ts` |
| preValidate | `src/processors/implementations/pre-validate-processor.ts` |
| codexCompliance | `src/processors/implementations/codex-compliance-processor.ts` |
| testAutoCreation | `src/processors/implementations/test-auto-creation-processor.ts` |
| versionCompliance | `src/processors/implementations/version-compliance-processor.ts` |
| errorBoundary | `src/processors/implementations/error-boundary-processor.ts` |
| agentsMdValidation | `src/processors/implementations/agents-md-validation-processor.ts` |
| stateValidation | `src/processors/implementations/state-validation-processor.ts` |
| refactoringLogging | `src/processors/implementations/refactoring-logging-processor.ts` |

## Entry Points

| Entry | File | Description |
|-------|------|-------------|
| executePreProcessors() | processor-manager.ts | Pre-processing |
| executePostProcessors() | processor-manager.ts | Post-processing |

## Exit Points

| Exit | Data |
|------|------|
| Success | PostProcessorResult[] |
| Failure | Error thrown |

## Artifacts

- ProcessorMetrics: { totalExecutions, successRate, avgDuration }
- ProcessorHealth: { healthy | degraded | failed }

## Testing Requirements

1. Pre-processors execute in order
2. Post-processors execute in order
3. Metrics recorded
4. Health status updated
