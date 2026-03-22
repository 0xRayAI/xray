# Routing Pipeline

**Purpose**: Intelligent routing of tasks to appropriate agents and skills

**Data Flow**:
```
routeTask(taskDescription, options)
    │
    ▼
RouterCore.route()
    │
    ├─► KeywordMatcher.match() [if keywords found]
    │
    ├─► HistoryMatcher.match() [if taskId provided]
    │
    ├─► ComplexityRouter.route() [if complexity provided]
    │
    └─► DEFAULT_ROUTING [fallback]
    │
    ▼
RoutingResult { agent, skill, confidence }
    │
    ▼
outcomeTracker.recordOutcome() [AUTO]
    │
    ▼
Return to caller
```

**Layers**:
- Layer 1: Keyword Matching (KeywordMatcher)
- Layer 2: History Matching (HistoryMatcher)
- Layer 3: Complexity Routing (ComplexityRouter)
- Layer 4: Router Core (RouterCore - orchestration)
- Layer 5: Analytics (OutcomeTracker, PatternTracker)

**Components**:
- `src/delegation/task-skill-router.ts` (TaskSkillRouter - facade)
- `src/delegation/routing/router-core.ts` (RouterCore)
- `src/delegation/routing/keyword-matcher.ts` (KeywordMatcher)
- `src/delegation/routing/history-matcher.ts` (HistoryMatcher)
- `src/delegation/routing/complexity-router.ts` (ComplexityRouter)
- `src/delegation/analytics/outcome-tracker.ts` (OutcomeTracker)
- `src/analytics/pattern-performance-tracker.ts` (PatternTracker)

**Entry Points**:
| Entry | File:Line | Description |
|-------|-----------|-------------|
| routeTask() | task-skill-router.ts:267 | Main routing entry |
| preprocess() | task-skill-router.ts:240 | Pre-process with context |
| routeTaskToAgent() | task-skill-router.ts:473 | Convenience export |

**Exit Points**:
| Exit | Data |
|------|------|
| Success | RoutingResult { agent, skill, confidence, matchedKeyword? } |
| Fallback | DEFAULT_ROUTING → enforcer, 0.5 confidence |

**Artifacts**:
- `logs/framework/routing-outcomes.json` - Outcome persistence
- `routing_history` in StateManager - Historical routing data

**Testing Requirements**:
1. Route task → verify correct agent selected
2. Route task → verify outcome recorded
3. Route task → verify pattern tracked
4. Full flow: route → analytics → output
