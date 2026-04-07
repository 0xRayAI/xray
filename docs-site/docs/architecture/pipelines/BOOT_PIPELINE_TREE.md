---
slug: "/docs/architecture/pipelines/boot-pipeline-tree"
title: "BOOT PIPELINE TREE"
sidebar_label: "BOOT PIPELINE TREE"
sidebar_position: 1
tags: ["architecture", "pipelines"]
---

# Boot Sequence

**Purpose**: Framework initialization and component startup orchestration

**Note**: This is an INITIALIZATION SEQUENCE, not a processing pipeline. Boot runs once at startup to initialize all framework components.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BOOT PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                           INPUT LAYER                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │   SIGINT/SIGTERM    │  │BootOrchestrator     │                          │
│  │   (signals)        │  │  constructor()      │                          │
│  │   boot-orchestrator │  │  boot-orchestrator   │                          │
│  │        :45,76       │  │        :133         │                          │
│  └──────────┬──────────┘  └──────────┬──────────┘                          │
└─────────────┼────────────────────────┼─────────────────────────────────────┘
              │                         │
              └─────────────┬───────────┘
                            │
                            v
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                   BOOT ENGINES (8 layers) ◄── UPDATED             │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                    LAYER 1: Configuration                   │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │            StringRayContextLoader                      │ │   │  │
│  │  │  │              context-loader.ts                         │ │   │  │
│  │  │  │              getInstance()                             │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                   LAYER 2: State Management                 │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │              StringRayStateManager                      │ │   │  │
│  │  │  │                state-manager.ts                         │ │   │  │
│  │  │  │                                                         │ │   │  │
│  │  │  │  Artifacts: memory:baseline, boot:errors, session:agents│ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │              LAYER 3: Delegation System                    │   │  │
│  │  │  ┌─────────────────────────┐  ┌──────────────────────────┐ │   │  │
│  │  │  │   createAgentDelegator  │  │ createSessionCoordinator │ │   │  │
│  │  │  │   delegation/index.ts   │  │  delegation/index.ts    │ │   │  │
│  │  │  └─────────────────────────┘  └──────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │               LAYER 4: Session Management                   │   │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐                 │   │  │
│  │  │  │SessionMonitor   │  │SessionStateManager│                 │   │  │
│  │  │  │session-monitor │  │session-state-    │                 │   │  │
│  │  │  │     .ts        │  │    manager.ts    │                 │   │  │
│  │  │  └─────────────────┘  └─────────────────┘                 │   │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐                 │   │  │
│  │  │  │SessionCleanupMgr│  │ SessionCoord    │                 │   │  │
│  │  │  │session-cleanup- │  │                 │                 │   │  │
│  │  │  │manager.ts      │  │                 │                 │   │  │
│  │  │  └─────────────────┘  └─────────────────┘                 │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                    LAYER 5: Processors                     │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │                ProcessorManager                          │ │   │  │
│  │  │  │             processor-manager.ts                        │ │   │  │
│  │  │  │                                                         │ │   │  │
│  │  │  │  preValidate → codexCompliance → versionCompliance      │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                    LAYER 6: Agents                          │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │                 enforcer, architect, ...               │ │   │  │
│  │  │  │              (7 agents loaded from registry)           │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                 LAYER 7: Plugin System ◄── NEW             │   │  │
│  │  │  ┌─────────────────────────┐  ┌─────────────────────────┐ │   │  │
│  │  │  │    PluginRegistry       │  │PluginServerConfigRegistry│ │   │  │
│  │  │  │ plugin-registry.ts      │  │plugin-server-registry.ts│ │   │  │
│  │  │  │  • discoverPlugins()    │  │ • registerPluginServer()│ │   │  │
│  │  │  │  • loadPlugin()         │  │ • registerAllPluginSrvs()│ │   │  │
│  │  │  │  • startMetrics()       │  │ • getServersByCapability│ │   │  │
│  │  │  └─────────────────────────┘  └─────────────────────────┘ │   │  │
│  │  │                                                                     │  │
│  │  │  Plugins dir: .strray/plugins/                                     │  │
│  │  │  MCP servers auto-registered                                       │  │
│  │  └──────────────────────────┬──────────────────────────────────┘   │  │
│  │                             │                                        │  │
│  │                             v                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │                    LAYER 8: Security                          │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │               SecurityHardener                           │ │   │  │
│  │  │  │            security-hardener.ts                          │ │   │  │
│  │  │  │             initialize()                                 │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │  │  │                 CodexInjector                            │ │   │  │
│  │  │  │              codex-injector.ts                           │ │   │  │
│  │  │  │            injectCodex()                               │ │   │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                            │                                               │
│                            v                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │              setupGracefulShutdown()                                 │  │
│  │                  boot-orchestrator.ts:45,76                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      v
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OUTPUT LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         BootResult                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │  │
│  │  │   success   │  │orchestrator │  │   errors     │                │  │
│  │  │  (boolean)  │  │  Loaded     │  │    []       │                │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │  │
│  │                                                                     │  │
│  │  State Entries Created:                                              │  │
│  │  • memory:baseline                                                  │  │
│  │  • boot:errors                                                      │  │
│  │  • session:agents                                                  │  │
│  │  • plugin:registry ◄── NEW                                          │  │
│  │  • plugin:serverRegistry ◄── NEW                                   │  │
│  │  • plugin:registered ◄── NEW                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Compact Data Flow

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
executeBootSequence()
    │
    ├─► loadStringRayConfiguration()
    │
    ├─► loadOrchestrator()
    │
    ├─► initializeDelegationSystem()
    │
    ├─► initializeSessionManagement()
    │
    ├─► activateProcessors()
    │
    ├─► loadRemainingAgents()
    │
    ├─► initializePluginSystem()     ◄── PHASE 4.5 (NEW)
    │   │                              
    │   ├─► PluginRegistry.initialize()
    │   │   │   └── discoverPlugins()
    │   │   │       └── loadPlugin()
    │   │   │
    │   │   └─► startMetricsCollection()
    │   │
    │   └─► PluginServerConfigRegistry.registerAllPluginServers()
    │       └── registerPluginServer() × N
    │
    ├─► enableEnforcement()
    │
    ├─► activateCodexCompliance()
    │
    └─► finalizeSecurityIntegration()
    │
    ▼
BootResult { success, orchestratorLoaded, ... }
```

## Layers

- **Layer 1**: Configuration (StringRayContextLoader)
- **Layer 2**: State Management (StringRayStateManager)
- **Layer 3**: Delegation System (AgentDelegator, SessionCoordinator)
- **Layer 4**: Session Management (SessionMonitor, SessionStateManager)
- **Layer 5**: Processors (ProcessorManager)
- **Layer 6**: Agents (enforcer, architect, bug-triage, etc.)
- **Layer 7**: Plugin System (PluginRegistry, PluginServerConfigRegistry) ◄── NEW
- **Layer 8**: Security & Compliance (SecurityHardener, CodexInjector)

## Components

| Component | File |
|-----------|------|
| BootOrchestrator | `src/core/boot-orchestrator.ts` |
| StringRayContextLoader | `src/core/context-loader.ts` |
| StringRayStateManager | `src/state/state-manager.ts` |
| AgentDelegator | `src/delegation/agent-delegator.ts` |
| SessionCoordinator | `src/delegation/session-coordinator.ts` |
| SessionMonitor | `src/session/session-monitor.ts` |
| SessionStateManager | `src/session/session-state-manager.ts` |
| SessionCleanupManager | `src/session/session-cleanup-manager.ts` |
| ProcessorManager | `src/processors/processor-manager.ts` |
| SecurityHardener | `src/security/security-hardener.ts` |
| InferenceTuner | `src/services/inference-tuner.ts` |
| **PluginRegistry** | `src/integrations/plugins/plugin-registry.ts` |
| **PluginServerConfigRegistry** | `src/mcps/config/plugin-server-registry.ts` |

## Entry Points

| Entry | File:Line | Description |
|-------|-----------|-------------|
| BootOrchestrator constructor | boot-orchestrator.ts:133 | Main entry point |
| SIGINT/SIGTERM | boot-orchestrator.ts:45,76 | Graceful shutdown |

## Exit Points

| Exit | Data |
|------|------|
| Success | BootResult &#123; success: true, ... &#125; |
| Failure | BootResult &#123; success: false, errors: [...] &#125; |

## Artifacts

- `memory:baseline` in StateManager
- `boot:errors` in StateManager
- `session:agents` in StateManager
- `plugin:registry` in StateManager ◄── NEW
- `plugin:serverRegistry` in StateManager ◄── NEW
- `plugin:registered` in StateManager ◄── NEW

## Testing Requirements

1. Boot completes without errors
2. All components initialized
3. State entries created
4. Graceful shutdown works
