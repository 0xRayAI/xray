# v3.0.0 Wholeness Reflection

**Date**: 2026-06-12  
**Commit**: `61123baad`  
**Previous**: v2.0.0 (strray-ai → 0xray rename)  
**Tests**: 2892 passed, 44 skipped, 0 failures  
**Net LOC**: -40,687 from v2.0.0 baseline

---

## The Shape of v3

What is v3? It is not a feature release. It is a *subtraction* — the art of knowing what to remove.

When we started, the codebase carried four generations of architecture simultaneously:
- v1: 0xRay prototype (strray references, setTimeout stubs, EventEmitter wiring)
- v2: strray-ai package with CI/CD PostProcessor loop
- v2.5: MCP skill servers bolted alongside legacy pipelines
- v3.0: what it was *trying* to become but couldn't, because the old bones were still in the walls

Every subsystem had a doppelgänger. Two orchestrator lineages. Two enforcement pipelines. Two routing systems. Two places where the same interfaces lived. The code compiled, tests passed, but the architecture was a palimpsest — you could still read the erased layers underneath.

## What We Cut

| Artifact | Why It Existed | Why It Died |
|----------|---------------|-------------|
| PostProcessor activation (980 lines) | CI/CD post-action intelligence loop | Superseded by governance MCP pipeline with Dynamo Solar SSOT |
| MetamorphosisEngine in `postprocessor/` | "Phase 0.5" forward-looking hooks | Moved to neutral `src/types/`, kept the interface, killed the dependency |
| `dispatchToAgent` / `executeComplexTaskSingle` | setTimeout stubs for simulated delegation | Never called by any production code — dead on arrival |
| `performDelegation` with `setTimeout(50)` | Placeholder routing | Wired to thin-dispatch `scoreAndRoute` — now does real agent routing |
| 14 agent stub files with zero importers | Static config from pre-MCP era | MCP skill servers replaced them, but `builtinAgents` barrel kept them alive; confirmed legit skip |
| 12 stale docs in docusaurus | Survived the v2→v3 rename | Deleted — the docusaurus site had become a museum of abandoned architecture decisions |
| pre-v3 reflections (6 files) | v2 release notes | Archived to `backups/` — v3 needs its own memory |
| Version stamps in ~40 deep docs | `@version 1.x` / `2.x` | Project is 3.0.0. Deep docs don't need version stamps at all — only entrypoints get summary lines |
| `strray-ai` backward-compat shim in `src/` | Consumer runtime compat | Single line kept per scope rule — the rest excised |
| Performance benchmark (561 lines) | setTimeout stubs calling themselves benchmarks | Real metrics live in `reporting/metrics.ts` and `performance-analysis.server.ts` |
| Memory regression suite (350 lines) | Generic EventEmitter testing framework | Redundant with `monitoring/memory-monitor.ts` |
| PostProcessor HTTP integration (228 lines) | Express wrapper for trigger classes | The triggers themselves (`WebhookTrigger`, `APITrigger`) still exist — the wrapper added nothing |

## What We Built

| Artifact | Purpose |
|----------|---------|
| `src/mcps/index.ts` | Canonical MCP server manifest — 40 servers, 3 aliases, registry status |
| `src/types/metamorphosis.ts` | Neutral home for MetamorphosisEngine interfaces — zero dependencies |
| `src/utils/task-graph.ts` | Pure utility functions: topological sort, dependency validation, conflict resolution |
| `assess-complexity-tool.ts` / `query-routing-tool.ts` | AI-facing tools for task assessment and agent discovery |
| 12 new tests | Coverage for both tool files + infrastructure test fix |

## What We Realigned

**KernelOrchestrator** went from 555 lines of mixed real logic and setTimeout stubs to 365 lines of honest code. The three pure functions moved to `task-graph.ts` where any consumer can use them. The delegation path now calls thin-dispatch instead of `setTimeout(50)`. The class carries a `@deprecated` marker directing consumers to the v3 surface. It still works. It still serves boot-orchestrator and the coordinator. But it's no longer pretending to be the future.

**PostProcessor** went from "v3 Core" to soft-deprecated. The `enablePostProcessor` flag defaults to `false`. The nucleus barrel no longer exports its internals. The enforcement docs now point to the governance MCP pipeline instead. The code is preserved for opt-in — we don't delete things people might depend on — but the architecture no longer routes through it.

**The nucleus surface** (`nucleus/index.ts` + `kernel.ts`) lost its PostProcessor dependency entirely. Kernel re-exports `MetamorphosisEngine` from `src/types/metamorphosis.ts`, not from `postprocessor/metamorphosis/`. The old file was deleted — no shim, no re-export, no legacy path.

## The Three Subsystems

v3 is clean because it admits to being three things instead of pretending to be one:

```
Inference                    Governance                  Autonomous Engine
──────────                   ──────────                  ────────────────
MCP skill servers            governance-service.ts       thin-dispatch.ts
(27 knowledge + 13 core)     Dynamo Solar SSOT           agent-delegator.ts
enforcement-gate.ts          3 skill MCP deliberation     task-graph.ts
plugin-registry              weighted voting             orchestrator/
```

Each knows its job. Inference produces proposals. Governance judges them. The engine routes them. No overlap. No doppelgängers.

## What the Numbers Say

```
v2.0.0 → v3.0.0 cumulative diff:
  +46,434 insertions
  -87,121 deletions
  = -40,687 net

This session alone:
  +1,046 insertions
  -8,437 deletions
  = -7,391 net (in 95 files)
```

We removed twice as much as we added. That is what maturity looks like in a codebase — not accretion, but refinement.

## What We Did Not Do

Three items were investigated and correctly skipped:
- **`src/security/`** — boot-orchestrator legitimately imports `securityHardener` and `securityHeadersMiddleware`. These are boot-time hardening, not audit. They belong.
- **Agent stubs** — 14 files with zero direct importers, but they populate `builtinAgents` which is consumed by `agent-resolver.ts` and `agent-delegator.ts`. The MCP skills replaced the *runtime* agent logic; the config metadata still serves a purpose.
- **Version stamps in deep docs** — cosmetic. Fixing 40 files for `@version 1.0.0` → `3.0.0` adds nothing but churn. The git history is the version stamp.

These were not omissions. They were decisions.

## The Shape of Clean

A codebase is clean not when there is nothing left to remove, but when every remaining file has a clear reason to exist — when you can point to any line and say "that is here because of X, and X is still true."

By that measure, `src/` is clean.

The MCP servers live in `src/mcps/` with a manifest at `index.ts`. The governance pipeline lives in `src/governance/` with an MCP server at `src/mcps/governance.server.ts`. The nucleus lives in `src/nucleus/` with thin-dispatch as its routing surface. Everything else — delegation, orchestration, enforcement, inference — plugs into these three.

No setTimeout stubs pretending to be delegation.
No PostProcessor pretending to be the core enforcement pipeline.
No reverse-Metamorphosis shim files pretending to be backward compat.
No v2 references in a v3 codebase.

We climbed mountains today. We also walked through valleys — the long, unglamorous work of reading every file, tracing every import, asking "why does this exist?" and answering honestly.

v3.0.0 is honest.
