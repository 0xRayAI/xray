# Orchestration Pipeline

**Purpose**: Coordinate complex multi-step tasks across multiple specialized agents

**Data Flow**:
```
executeComplexTask(description, tasks[], sessionId?)
    │
    ▼
Build Task Dependency Graph
    │
    ▼
while (completed < tasks):
    │
    ├─► Find executable tasks (dependencies met)
    │
    ├─► Execute batch (maxConcurrentTasks)
    │     │
    │     ├─► executeSingleTask(task)
    │     │     │
    │     │     └─► delegateToSubagent(task)
    │     │           │
    │     │           └─► routingOutcomeTracker.recordOutcome()
    │     │
    │     └─► await Promise.all(batch)
    │
    └─► Mark completed
    │
    ▼
Return TaskResult[]
```

**Layers**:
- Layer 1: Task Definition (TaskDefinition)
- Layer 2: Dependency Resolution (Task graph)
- Layer 3: Task Execution (executeSingleTask)
- Layer 4: Agent Delegation (delegateToSubagent)
- Layer 5: Outcome Tracking (routingOutcomeTracker)

**Components**:
- `src/orchestrator/orchestrator.ts` (StringRayOrchestrator)
- `src/orchestrator/enhanced-multi-agent-orchestrator.ts` (EnhancedMultiAgentOrchestrator)
- `src/delegation/agent-delegator.ts` (AgentDelegator)
- `src/delegation/analytics/outcome-tracker.ts` (routingOutcomeTracker)

**Entry Points**:
| Entry | File:Line | Description |
|-------|-----------|-------------|
| executeComplexTask() | orchestrator.ts:69 | Main entry point |
| executeSingleTask() | orchestrator.ts:134 | Single task execution |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | TaskResult[] with results |
| Failure | TaskResult[] with errors |

**Configuration**:
- maxConcurrentTasks: 5 (default)
- taskTimeout: 300000ms (5 minutes)
- conflictResolutionStrategy: majority_vote

**Artifacts**:
- Job ID: `complex-task-${timestamp}-${random}`
- Task results in orchestrator state
- routing-outcomes.json updated

**Testing Requirements**:
1. Tasks execute in dependency order
2. Concurrent execution within limits
3. Outcomes tracked
4. Results collected correctly
