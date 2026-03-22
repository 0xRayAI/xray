# Processor Pipeline

**Purpose**: Execute validation, compliance, and enhancement processors before/after operations

**Data Flow**:
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

**Layers**:
- Layer 1: Processor Registry (ProcessorRegistry)
- Layer 2: Pre-Processors (priority-ordered)
- Layer 3: Main Operation
- Layer 4: Post-Processors (priority-ordered)
- Layer 5: Health Monitoring (ProcessorHealth)

**Pre-Processors** (priority order):
1. preValidate (10) - Syntax checking
2. codexCompliance (20) - Codex rules
3. testAutoCreation (22) - Auto-generate tests
4. versionCompliance (25) - NPM/UVM check
5. errorBoundary (30) - Error handling
6. agentsMdValidation (35) - AGENTS.md validation

**Post-Processors** (priority order):
- stateValidation (130) - State consistency
- refactoringLogging (140) - Agent completion

**Components**:
- `src/processors/processor-manager.ts` (ProcessorManager)
- `src/processors/processor-registry.ts` (ProcessorRegistry)
- `src/processors/implementations/*.ts` (12 implementations)

**Entry Points**:
| Entry | File | Description |
|-------|------|-------------|
| executePreProcessors() | processor-manager.ts | Pre-processing |
| executePostProcessors() | processor-manager.ts | Post-processing |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | PostProcessorResult[] |
| Failure | Error thrown |

**Artifacts**:
- ProcessorMetrics: { totalExecutions, successRate, avgDuration }
- ProcessorHealth: { healthy | degraded | failed }

**Testing Requirements**:
1. Pre-processors execute in order
2. Post-processors execute in order
3. Metrics recorded
4. Health status updated
