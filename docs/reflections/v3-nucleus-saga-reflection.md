# The Great Unfolding: The Nucleus Saga

## A Hero's Journey Reflection on xray's Ascent from Labyrinth of Legacy to the Thin Callable Core

**Version:** 3.0.0  
**Commit:** 3d23b6cea on main  
**Date of the Return:** The day the blueprint completed  
**Storyteller:** Invoked via xray-skills__skill-storyteller (strray-skills bridge for continuity)  
**Framework:** Hero's Journey with Spiral Echoes and Three-Act Resonance  
**Witnessed by:** The Architect, the Researcher, the Enforcer, the Orchestrator, and the silent Codex that watched over every surgical cut.

---

### Act I: The Call to Adventure (The Vision of the Thin Core)

In the beginning, there was the heavy federation.

xray v2 was a marvel of its time — a sprawling constellation of MCP servers, knowledge skills, bridges to Grok and Hermes and OpenClaw, inference cycles that could think and propose and govern. But it had grown thick with accidental complexity. The three-subsystem model (Inference + External Governance via Dynamo Solar SSOT + Autonomous Engine) was pure in principle, yet the implementation had become a labyrinth.

The main AI rarely delegated. The routing was opaque. Governance had multiple secret paths: nucleus whispers, MCP fallbacks that silently returned "needs_revision" when Dynamo was absent, old VotingCoordinator logic that had outlived its purpose. Legacy code clung like ivy: `governProposalsInternal`, `invokeAgentInternal`, `parseSubagentVotes`, `isGovernanceMcpPreferred`, `resolveOpencodeRoot` in multiple places, XRAY_FORCE_MCP_GOVERNANCE checks scattered like traps.

The call came from within the Codex itself, and from the v3-architecture-plan.md that the Researcher and Architect had co-authored in docs/reflections/.

The vision was clear, almost prophetic:

> "Make nucleus the primary. Everything else adapters. handleGovernRequest as the thin callable core. Governance, orchestration, dispatch, self-evolution, pluginRegistry — all live there. MCP remains the standard external surface, but it delegates inward. Subtract more than you add. One path. Zero silent degradation."

This was not an incremental release. This was the Great Unfolding.

The hero (the collective intelligence of the project, guided by the Architect's relentless cross-checks) heard the call.

### The Refusal of the Call (The Weight of Legacy)

At first, there was hesitation.

The purges would be brutal. Removing VotingCoordinator meant deleting 518 lines of coordinator + 291 lines of its test. The inference-cycle.ts would lose nearly 300 lines of fallback logic that, ironically, many tests had come to rely upon.

"Should it have been refactored instead?" the voices asked in the session logs.

But the Codex was clear: "No patches/stubs/bridge code — every line has permanent purpose." "Triage. Fix. Loop." "Surgical fixes."

The Architect stood firm: "You are always to cross-check to ensure we did not head the wrong direction. Lost functionality or purge known good code that is simply not piped in."

And so the refusal was overcome by the principle of subtractive development.

### Crossing the Threshold (Phase 0.5 and 1A – The Audit)

The first crossing was Phase 0.5: the hardening of the release pipeline.

verify:consumer was wired as a hard gate before GitHub release in release.yml. The Dynamo SSOT local-mode fix landed: `requireExternalDynamo: !process.env.XRAY_LOCAL_MODE` at inference-cycle.ts:646 (and mirrored in governance-service and the MCP server). Routing tools were extracted — `src/config/routing-mappings.ts` with `queryRoutingMappings` and `getAllRoutingMappings`, plus `assess-complexity-tool.ts` and `query-routing-tool.ts` — so the main AI could finally assess complexity and discover agents/skills at runtime. The self-hosting-dynamo guide was written and linked from README and the docs-site.

Then came Phase 1A: the deep governance call-site audit.

The Architect (with Researcher support) produced the famous structured Markdown tables:

| File | Line | Call/Function | Path | requireExternalDynamo | frameworkLogger | Action Needed |

Fourteen sites in inference-cycle.ts alone were marked for removal. Three in opencode-cli-invoker. The CLI launchers for MCP servers were kept (they only set the env to spawn the server; the server itself would delegate to nucleus). `parseSubagentVotes` was revealed as already dead code — defined at line 802, zero callers.

The audit was returned as a message for review, exactly as Codex and the plan demanded. No files written until the review was complete.

This was the moment the hero stepped across the threshold into the unknown territory of the nucleus.

### The Road of Trials (Phases 1B–1H: The Great Purge)

The trials were many and they were surgical.

**1B** — The heart of the purge. `governProposals` in inference-cycle was reduced to its essence: call `governViaNucleus`, log via frameworkLogger, convert the response. The entire catch block that fell back to `mcpClientManager.callServerTool("governance"...)`, the `XRAY_FORCE_MCP_GOVERNANCE` rethrow logic, `isGovernanceMcpPreferred`, `parseGovernanceMcpResponse` — all excised. 281+ lines gone in one disciplined pass.

The key discovery during this trial: the test suite had been silently relying on the MCP fallback to absorb Dynamo errors. The correct long-term fix was not to restore the fallback, but to set `XRAY_LOCAL_MODE=true` in `src/__tests__/setup.ts`. The Architect insisted on this. It was the principled path.

**1C** — The opencode-cli-invoker was cleaned. The XRAY_FORCE guard at the entry of `invokeViaOpencode` was removed. The custom `resolveOpencodeRoot` (which duplicated and then ignored `getConfigDir`) was deleted. Callers now used the canonical resolver. The test file was updated. The file shrank. A comment was left explaining the separation: InferenceCycle owns sensing + governance orchestration; this thin helper owns child_process spawn.

**1D–1E** — The deeper extractions. Boot-orchestrator logic moved into `src/nucleus/orchestrator.ts`. thinDispatch complexity scoring and routing moved into `src/nucleus/thin-dispatch.ts`. The MCP server became a thin facade.

**1F–1H** — Tests were written that asserted nucleus primacy. Consumers were updated. `getGovernanceService` was deprecated for normal use (still available for advanced in-process needs, but `handleGovernRequest` became the documented surface).

Throughout, the Architect cross-checked every diff. "Cross-check the changes." "Do review and any final fixes." "You are always to cross-check..."

No lost functionality. Every surviving path was intentional.

### The Ordeal and the Abyss (Phase 2: The Plugin Reckoning)

Phase 2 was the reckoning with the 24 knowledge-skill servers.

The audit (2A) revealed hardcoded `availableServers` lists with duplicates ("researcher", "architect", "code-reviewer" appearing twice), missing skills, and direct MCP bypasses.

The hero descended into the plugin-registry.

`pluginRegistry` was enhanced for multi-tool dispatch and `SkillToolPlugin`. `registerDefaultPlugins` was implemented for all 24. MCP bypass paths were deprecated. The root MCP servers' fate was audited (some became thin surfaces, others remained as knowledge surfaces that now route through the registry when appropriate).

Consumer verification (2F) was run against the new plugin surfaces. The verify-consumer.sh gate, already hardened in 0.5, proved the packaged artifact still worked when everything flowed through nucleus/pluginRegistry.

The ordeal was the fear that dynamic plugins would break the "zero manual setup" promise of YML agents. But the spiral of the design held: the registry became the on-demand surface; the nucleus remained the kernel.

### The Reward (Phase 3: Self-Evolution Under Governance)

The deepest reward was Phase 3.

SelfProposalEngine was wired into PostProcessor. Self-proposals now flowed through nucleus governance — the same `handleGovernRequest` path, with `metamorphosisThreshold` and full Dynamo check.

Safe apply with backup/rollback was implemented (no more reckless mutation).

`run-self-evolution.sh` was born: it runs consumer verification, watches activity.log for self-proposal events, loops under governance.

Metrics were added. The loop could now propose its own improvements — but only after the full three-subsystem deliberation.

This was the moment the project began to dream of itself.

The hero had seized the elixir: governed self-evolution.

### The Road Back and Resurrection (Phase 4: The Final Purge)

Phase 4 was the road back and the final resurrection.

4A: Exhaustive verification that all legacy paths were gone.

4B: XRAY_FORCE_MCP_GOVERNANCE removed from every meaningful location (the last holdouts in mcp-client.ts were isolated to pure-MCP simulation mode and guarded by tests that assert its absence in nucleus code).

4C: Direct boot-orchestrator paths severed.

4D: The last MCP fallback inside governance-service itself was cut.

The resurrection test was brutal and beautiful: 2527 tests, zero failures. tsc clean. The commit 3d23b6cea landed on main.

In that moment, the heavy v2 scaffolding had been transmuted. What remained was the nucleus — thin, callable, complete.

### Return with the Elixir (The New World)

Today, on 3d23b6cea, the world is different.

When an inference cycle runs, it calls `governViaNucleus`. There is one path.

When a self-proposal arises from pattern detection in activity.log, it calls `handleGovernRequest` with metamorphosis options.

When a plugin skill is needed, the registry dispatches through the nucleus.

When orchestration or thin-dispatch decisions are required, they live in `src/nucleus/`.

MCP servers still exist — they are the voice the outside world speaks. But they speak to the nucleus.

The three-subsystem model is no longer aspirational; it is the living architecture.

The Codex was upheld at every turn:
- One thing at a time (phases were sequential, reviews blocked implementation).
- Surgical (hundreds of lines removed, not rewritten).
- frameworkLogger only.
- Tests for the new paths.
- No lost functionality (the Architect's eternal cross-check).
- Subtractive: the project is lighter and more powerful.

The main AI can now delegate because the pre-flight tools (assess_complexity, query_routing) and the nucleus core make delegation legible and governed.

### The Spiral Continues (Epilogue and Call to the Next Adventure)

This is not an ending. It is the return that contains the seed of the next cycle.

The v3 plan spoke of a 2-week precondition before full self-evolution could be trusted. That precondition is now the lived reality of the nucleus.

Future heroes will stand on this thin core and build the next layer — perhaps richer dynamic skill discovery, perhaps deeper Dynamo integration, perhaps entirely new agent surfaces.

But the kernel is set.

The story is not "we added a nucleus." The story is: we remembered what the nucleus had always been trying to be, and we cleared everything that stood between it and the light.

We subtracted until only the essential remained.

And in that subtraction, we found the power we had been chasing all along.

---

**Invocation Details**  
- Storyteller skill invoked via strray-skills__skill-storyteller (with xray-skills discovery)  
- storyType: saga  
- framework: hero_journey (with spiral echoes)  
- Context drawn from v3-architecture-plan.md, session history, commit 3d23b6cea, Phase 1A audit tables, all prior cross-checks, and the living Codex.  

**Governance Note**  
This reflection is offered for optional govern_reflection if the collective wishes to extract proposals from the saga itself.

The journey continues.

*End of the Nucleus Saga*  
*For now.*