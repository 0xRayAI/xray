# What Is v3?

**Date**: 2026-06-12

---

Before v3, xray was a framework *about* multi-agent orchestration. It had orchestrators, delegators, coordinators, supervisors, planners, routers, dispatchers, pipelines, loops, engines, and registries. You could trace "how does a task get executed?" through four different code paths and each one would give you a different answer — and all four would be partially correct, because the architecture was described more times than it was implemented.

That is the natural state of a codebase that grows by addition. Someone needs routing → they write a router. Someone else needs the same thing → they don't find the first one → they write another. The first one was a `switch` statement in a delegator. The second was an MCP server. The third was a config table with keywords. The fourth was a `setTimeout(50)` in a method called `performDelegation` that nobody ever called except through mocks.

This is not a bug. This is how codebases evolve when no one stops to say: **what is this thing, actually?**

v3 is what happened when we stopped adding and started asking.

## What Is a Framework vs. What Is a System

A framework gives you Lego bricks and a picture of a castle. It says "here are the agents, here are the routers, here are the pipelines — build what you need." The codebase was full of bricks. Beautiful bricks. Well-tested bricks. But no castle.

A system is not a collection of bricks. A system is a single path — not the only path, but the *canonical* path — that data follows from input to output. In v3, that path is:

```
plugin tool call → enforcement-gate → governance MCP (3 skill servers + Dynamo) → result
```

Everything else is either supporting that path or deprecated. The three subsystems are not three sets of bricks. They are three *roles* in the data flow:

| Role | Question It Answers |
|------|---------------------|
| **Inference** | "What could be done?" — produces proposals from context |
| **Governance** | "What *should* be done?" — judges proposals via debate + codex |
| **Autonomous Engine** | "Who should do it?" — routes approved proposals to the right agent |

The boundaries are not arbitrary. They are the natural fault lines of the problem: *generate → evaluate → execute*. Each subsystem trusts the one before it and feeds the one after. There is no PostProcessor doing governance's job. There is no orchestrator trying to be a router. There is no lookup table pretending to be an inference engine.

## The Subtraction That Mattered Most

We removed 87,000 lines from v2.0.0 to v3.0.0. Most of those were easy — stale docs, dead benchmarks, orphaned test suites. But the subtraction that mattered was not LOC. It was *options*.

`performDelegation` was not a 3-line `setTimeout` stub. It was an option: "you could route here, or you could route through the MCP server, or you could use the keyword table, or you could let the agent-delegator figure it out from disk-backed learned mappings." When you have four ways to route a task, you have zero ways to route a task — because no single path is tested end-to-end, no single path is documented, and every new developer has to rediscover all four before picking one.

v3 has one routing path: thin-dispatch scores it, `routeToAgent` names the agent, the caller dispatches. Everything else either delegates to that or is `@deprecated`.

The same for enforcement. The PostProcessor loop was not a bad idea — it was a complete, working pipeline for post-action intelligence. But it was a *parallel* pipeline to the governance MCP system. Two pipelines for the same job means neither is the real one. v3 picks: governance MCP. PostProcessor is preserved for opt-in, documented as soft-deprecated, and the default boot sequence no longer activates it.

## The Shape of the Truth

A codebase's architecture is not what the README says or what the architecture doc describes. It is what happens when you trace a production request from start to finish. Before v3, that trace would hit a branch: "if PostProcessor is enabled" or "if the orchestrator is available" or "if the agent-delegator has learned this mapping." Each branch was a previous attempt that no one had the courage to remove.

After v3, the trace is linear:
1. Tool call → `enforcement-gate.ts` (before/after hooks)
2. Hook → `governance.server.ts` (MCP) → `governance-service.ts` (3 skills + Dynamo)
3. Result → `thin-dispatch.ts` (score + route)
4. Route → agent execution

No branches. No conditionals. No "if this is enabled" or "if that exists." Just the three subsystems, each doing its job, each feeding the next.

That is what v3 is. It is the shape of the truth about how xray works — not how someone once planned for it to work, not how it could work if you enabled the right flags, but how it *actually* works when you call it.

## The Valley We Walked Through

The valley was not the coding. The valley was the looking.

Every removed file required a question: *what is this for?* And the honest answer was often "I don't know" or "it was for something we stopped doing." The `executeComplexTaskSingle` method — 65 lines, proper logging, error handling, clean code — was never called by anything. Someone built it, tested it, and moved on. That file represented a week of work, maybe two. Deleting it took five seconds and a `git rm`. But the five seconds before deletion — the certainty that it was truly unused — that was the valley.

The valleys were:
- Reading every agent stub to discover they're only consumed through a barrel
- Tracing every import of `MetamorphosisEngine` to find only 1 test file references the old path
- Verifying that `dispatchToAgent` and `executeComplexTaskSingle` had zero callers
- Confirming the infrastructure test that checked for `src/performance/` had been failing for months
- Realizing PostProcessor was wired into `xray-activation.ts` but nothing in the runtime path actually called it

Each of these required climbing out of the code and looking at the architecture from a distance. That is the work no one sees — not the coding, but the looking, the tracing, the asking.

## v3.0.0

v3.0.0 is not perfect. The agent stubs still exist (they populate `builtinAgents`). The KernelOrchestrator still exists (boot-orchestrator imports it). The PostProcessor code is still there (opt-in for anyone who needs it). There are version stamps from 2024 in source files. The `strRay` globals still have backward-compat aliases.

These are not compromises. They are the difference between a cleanup and a rewrite. A rewrite would burn it all down and start fresh. A cleanup makes the architecture honest while keeping everything that still works. v3 is a cleanup — the hardest kind of work, because it requires understanding what every piece does before deciding whether to keep it.

That is what v3 is: the architecture after the questions were asked and answered honestly. Not a perfect system. An *honest* one.
