---
slug: "/docs/reflections/routing-architecture-deep-analysis"
title: "Routing Architecture Deep Analysis"
sidebar_label: "Routing Architecture Deep Analysis"
sidebar_position: 71
tags: ["reflection"]
---

# StringRay Routing Architecture: Deep Analysis & Fit-for-Purpose Plan

## The Problem Statement

StringRay was built because LLMs are terrible at multi-faceted analysis and routing.
The framework should observe tool calls, learn what works, and improve routing over time.
Right now, **it doesn't** — and here's why.

---

## Architecture Audit: Three Layers, Zero Actual Routing

### Layer 1: The LLM Itself (Hermes / OpenCode)

**What happens**: The LLM receives the user prompt and decides which tool to call.
This is the PRIMARY routing decision — and StringRay has NO influence over it.

**Injection points**:
- OpenCode: `experimental.chat.system.transform` — replaces the system prompt with a lean StringRay identity (3K token budget). This injects awareness of the framework's existence but contains ZERO routing instructions. No "for security tasks, use @security-auditor" guidance. Nothing.
- Hermes: No system prompt injection at all. The Hermes plugin registers `pre_tool_call` and `post_tool_call` hooks, but these fire AFTER the LLM already decided which tool to call.

**Conclusion**: The LLM decides routing based purely on its own training and the tool descriptions in the function schema. StringRay is invisible to this decision.

### Layer 2: The Plugin Hooks (Quality Gate)

**What happens**: AFTER the LLM picks a tool, StringRay's hooks fire:
- `pre_tool_call`: Logs the event, runs quality gate (enforcer validation), runs pre-processors
- `post_tool_call`: Logs the event, runs post-processors, records outcome for analytics

**What it DOES NOT do**:
- It does NOT intercept and redirect the tool choice
- It does NOT suggest "hey, you picked `terminal` for a security scan, you should use `mcp_strray_security_scan_security_scan` instead"
- It only NUDGES via log messages — the LLM never sees these nudges because they go to the plugin log, not back into the conversation

**Conclusion**: The hooks are observability + quality enforcement, NOT routing. They see what happened but can't change what's about to happen.

### Layer 3: The Analytics Pipeline (Learning System)

**What exists**:
- `routingOutcomeTracker` — records tool outcomes to `routing-outcomes.json`
- `predictiveAnalytics` — keyword overlap scoring to predict optimal agent
- `routingRefiner` — generates suggestions for new keyword mappings
- `inference-tuner` — runs every 100 tool calls, applies refiner suggestions to `routing-mappings.json`

**The fatal flaw**: This entire pipeline is built around `determineAgents()` in `agent-delegator.ts`, which is NEVER called in the actual runtime path.

Here's the call chain that SHOULD work:
```
User prompt → LLM → tool.execute.before → agentDelegator.analyzeDelegation() → determineAgents() → route to specialist
```

Here's what ACTUALLY happens:
```
User prompt → LLM → tool.execute.before → quality gate check → tool executes → post_tool_call → record outcome
```

`determineAgents()` is dead code in the runtime path. It only runs in tests and when explicitly called by the orchestrator MCP server (which nobody uses).

---

## Evidence from Real Session Data (zigzag)

### Routing Outcomes (20 recorded events)
- 17 routed to `testing-lead` (85%)
- 3 routed to `researcher` (15%)
- 100% success rate (meaningless — all tool calls "succeed" from the plugin's perspective)
- All confidence = 0.8 (hardcoded in `_TOOL_AGENT_MAP`)
- All routing method = "keyword" (but it's just a static map lookup, not actual keyword analysis)

### The Static Map (Hermes plugin)
```
write_file    → code-reviewer/write
patch         → code-reviewer/patch
execute_code  → testing-lead/execution
terminal      → testing-lead/execution
search_files  → researcher/search
read_file     → researcher/read
browser_*     → researcher/browser
delegate_task → orchestrator/delegation
```

This is a flat, static mapping. It maps every `terminal` call to `testing-lead/execution` — whether you're running `npm test` or `rm -rf /`. Same for `write_file` always being `code-reviewer`.

### Activity Log (412K lines)
- Almost entirely framework boot logs, MCP server init, state manager ops
- Routing decisions appear as `rule-validation-start` with `"routedTo":"enforcer"` and `"routingConfidence":0.5`
- The routing-debug.log from the dev dir showed everything defaulting to `architect` at 0.6 confidence

### routing-mappings.json
Does not exist. The inference tuner has the code to create it but never has enough data to trigger (needs 5+ samples per pattern with 70%+ success rate, but the outcome data is all identical — 20 copies of "terminal call succeeded").

---

## Root Cause: Fundamental Architecture Mismatch

The problem isn't a bug — it's architectural. StringRay has three separate systems that don't connect:

1. **Observation system** (plugin hooks) — watches what happens, records it
2. **Analysis system** (analytics pipeline) — processes observations, generates insights
3. **Action system** (agent delegator) — has routing logic but is never invoked

The observation and analysis systems are connected (outcomes → analytics). But the action system is disconnected from both.

Why? Because **the LLM is the router, not StringRay**. And that was a deliberate decision — someone (correctly) observed that OpenCode/Hermes already handles routing via tool selection. So StringRay stepped back from routing.

But then nobody filled the gap. The LLM's routing capability is limited to:
1. Reading tool descriptions in the function schema
2. Picking one tool based on what it thinks is appropriate
3. That's it — no multi-step analysis, no "I should use security scanner first, then code reviewer, then enforcer"

---

## What "Learning Over Time" Actually Requires

For StringRay to genuinely improve routing over time, it needs:

### A. The feedback loop must be CLOSED
Currently: observe → analyze → suggest → (nothing)
Needed: observe → analyze → suggest → INJECT → observe impact → adjust

The missing link is INJECT — taking the analytics insights and feeding them back into the LLM's decision-making context.

### B. The routing signal must reach the LLM
The LLM makes routing decisions based on:
- System prompt content
- Tool descriptions in the function schema
- Conversation history

StringRay can influence routing by:
1. **System prompt injection** — "For security-related tasks, prefer mcp_strray_security_scan_security_scan over terminal commands" — but the current system prompt is just a 3K identity banner
2. **Dynamic tool descriptions** — If the plugin could modify tool descriptions based on learned patterns, the LLM would pick better tools
3. **Context injection in conversation** — Before the LLM responds, inject "Last 5 similar tasks used X tool with Y% success rate" — but this requires a hook that fires BEFORE the LLM generates, not after

### C. The data must be meaningful
Currently 20 outcomes all say "terminal → testing-lead → success". This data is worthless for learning because:
- There's no concept of "task type" — a `terminal` call to `ls` is treated the same as `npm test`
- Success is binary — tool didn't throw an error ≠ task was completed well
- No feedback from the USER — the system doesn't know if the human was satisfied with the result
- No outcomes from the most important routing decisions (which skill to use, which subagent to delegate to)

---

## Fit-for-Purpose Plan

### Phase 1: Make the existing data pipeline actually useful (small, high-impact)

**Problem**: Outcome data is meaningless because success=true means "tool didn't crash"
**Fix**: 
- Add task-type classification to `_record_tool_outcome()` based on command content (not just tool name)
- `terminal("npm test")` → task_type="testing", `terminal("grep -r TODO")` → task_type="search"
- Record user intent when detectable from conversation context
- Track completion, not just non-error: did the task ACTUALLY get done?

**Problem**: routing-mappings.json doesn't exist because the tuner has no data to work with
**Fix**:
- Bootstrap with the existing static `_TOOL_AGENT_MAP` as initial mappings
- Lower the minimum sample threshold (5 → 3) so the tuner can start working sooner
- Add a manual "seed mappings" command so you can kickstart the learning

### Phase 2: Close the feedback loop (the critical missing piece)

**Problem**: Analytics insights never reach the LLM
**Fix**: Add a `pre_response` hook (or equivalent) that:
1. Analyzes the user's intent from the current message
2. Looks up historical routing outcomes for similar intents
3. Injects a routing hint into the LLM's context: "Similar tasks have used skill X (success rate Y%)"
4. The LLM sees this and makes a better routing decision

This is the key architectural change. Instead of trying to override the LLM's routing (which fights against OpenCode/Hermes design), we GUIDE it by enriching the context.

**Implementation**:
- Hermes: Add to the system prompt or as a context injection before LLM call
- OpenCode: Enhance the `experimental.chat.system.transform` to include dynamic routing hints based on recent session activity
- Keep it lightweight — 1-2 sentences, not a giant routing table

### Phase 3: Multi-faceted routing (the original vision)

**Problem**: The LLM picks ONE tool/skill per turn. StringRay's multi-agent orchestration exists but is never triggered.
**Fix**: 
- When the routing hint detects a complex task (multiple facets), suggest a skill chain: "This task involves security + testing. Consider running security scan first, then tests."
- The orchestrator MCP server should be invoked via tool call for complex tasks
- The `determineAgents()` logic should be promoted from dead code to the routing hint generator

**Key insight**: Don't try to make StringRay the router. Make StringRay the ADVISOR. The LLM still makes the final call, but it now has better information.

### Phase 4: Cross-instance learning

**Problem**: Each session starts from zero. The zigzag project has 20 outcomes from one session. All that learning evaporates.
**Fix**:
- Persist routing outcomes and insights in `.opencode/strray/routing-mappings.json` (already designed for this)
- On session start, load the accumulated mappings and use them to seed routing hints
- Add a `strray routing:learn` command that shows what the system has learned and lets the user approve/reject suggestions

---

## Architecture Diagram: Before vs After

### Before (Current State)
```
User → LLM → [picks tool] → Plugin hook (observe only) → Record outcome
                                 ↓
                            Quality gate (block/allow)
                                 ↓
                          Analytics pipeline (generate insights nobody reads)
```

### After (Proposed)
```
User → LLM → [Routing hint injected] → [picks better tool] → Plugin hook
              ↑                                                      ↓
              └──── Context enrichment ←─── Analytics insights ←──────┘
                   "similar tasks used X"
                                               ↓
                                          Record rich outcome
                                               ↓
                                          Update mappings
                                               ↓
                                          Persist for next session
```

---

## Concrete Next Steps

1. **Immediate**: Enrich `_record_tool_outcome()` with task-type classification (2 hours)
2. **Immediate**: Bootstrap `routing-mappings.json` from the static map (30 min)  
3. **Short-term**: Add context injection hook that feeds routing hints to LLM (4 hours)
4. **Short-term**: Lower analytics thresholds so the tuner starts working with less data (1 hour)
5. **Medium-term**: Promote `determineAgents()` logic into the context injection layer (3 hours)
6. **Medium-term**: Add user feedback mechanism — `/strray feedback good/bad` (2 hours)
7. **Long-term**: Cross-project routing knowledge sharing (architecture work)
