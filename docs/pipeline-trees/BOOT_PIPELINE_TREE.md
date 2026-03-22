# Boot Pipeline

**Purpose**: Framework initialization and component startup orchestration

**Data Flow**:
```
SIGINT/SIGTERM Signal
    │
    ▼
BootOrchestrator constructor()
    │
    ├─► setupGracefulShutdown()
    │
    ├─► StringRayContextLoader.getInstance()
    │
    ├─► StringRayStateManager()
    │
    ├─► ProcessorManager(stateManager)
    │
    ├─► createAgentDelegator()
    │
    ├─► createSessionCoordinator()
    │
    ├─► createSessionStateManager()
    │
    ├─► createSessionMonitor()
    │
    ├─► createSessionCleanupManager()
    │
    ├─► securityHardener.initialize()
    │
    ├─► inferenceTuner.initialize()
    │
    ▼
BootResult { success, orchestratorLoaded, ... }
```

**Layers**:
- Layer 1: Configuration (StringRayContextLoader)
- Layer 2: State Management (StringRayStateManager)
- Layer 3: Delegation System (AgentDelegator, SessionCoordinator)
- Layer 4: Session Management (SessionMonitor, SessionStateManager)
- Layer 5: Processors (ProcessorManager)
- Layer 6: Security (SecurityHardener)
- Layer 7: Inference (InferenceTuner)

**Components**:
- `src/core/boot-orchestrator.ts` (BootOrchestrator)
- `src/core/context-loader.ts` (StringRayContextLoader)
- `src/state/state-manager.ts` (StringRayStateManager)
- `src/delegation/index.ts` (createAgentDelegator, createSessionCoordinator)
- `src/session/session-*.ts` (Session managers)
- `src/processors/processor-manager.ts` (ProcessorManager)
- `src/security/security-hardener.ts` (SecurityHardener)
- `src/services/inference-tuner.ts` (InferenceTuner)

**Entry Points**:
| Entry | File | Description |
|-------|------|-------------|
| BootOrchestrator constructor | boot-orchestrator.ts:133 | Main entry point |
| SIGINT/SIGTERM | boot-orchestrator.ts:45,76 | Graceful shutdown |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | BootResult { success: true, ... } |
| Failure | BootResult { success: false, errors: [...] } |

**Artifacts**:
- `memory:baseline` in StateManager
- `boot:errors` in StateManager
- `session:agents` in StateManager

**Testing Requirements**:
1. Boot completes without errors
2. All components initialized
3. State entries created
4. Graceful shutdown works
