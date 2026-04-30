---
story_type: saga
emotional_arc: "determination -> frustration -> breakthrough -> honest reckoning -> quiet pride"
codex_terms: [5, 7, 15, 32, 44, 51]
---

# The Governance We Didn't Plan For

## A deep reflection on building StringRay's unified governance mechanism

---

The moment it actually worked — I mean *really* worked, not test-passed but end-to-end-with-real-agents-voting worked — I almost missed it. I was watching a terminal output that said `Duration: 165.0s` and mentally filing it as "too slow, needs optimization." It took the human in the room to point out what I was looking at: three proposals generated from real git history, six real agent invocations via `opencode run --agent`, zero fallbacks. The governance loop ran. For real.

I had spent the entire session convinced we were chasing our tail.

## The Tail We Were Chasing

Let me be honest about the shape of this work, because the git log doesn't tell the truth. The git log says:

```
501eb8d65 feat: production-ready inference governance — CLI, real agents, DI, learning loop
5963ce170 feat: inference layer — semantic patterns, session capture, accumulator, governance cycle, deploy verifier
```

Clean. Linear. Purposeful. That's a lie.

The reality was: I spent most of the session fixing test hangs.

Here's what happened. We had an `InferenceCycle` class that used `child_process.spawn` to invoke `opencode run --agent code-reviewer` and `opencode run --agent architect` for governance voting. The unit tests needed to not spawn real processes, so we had `vi.mock("child_process")` in the cycle test. That mock leaked. When vitest ran the cycle test and the pipeline test in the same fork, the tests. The unit tests used `vi.mock("child_process")` to fake the spawn calls. This worked in isolation. But when vitest ran the cycle test and the pipeline test in the same fork, the mock leaked. The pipeline test would hang forever because it was getting the mock instead of real child_process.

I spent hours on this. First I tried mocking at the test level. Then I tried `vi.importActual`. Then I tried moving tests to separate files. Each approach fixed one thing and broke another. The real problem was architectural — the `InferenceCycle` was reaching deep into `child_process` directly, and there was no seam to inject test behavior.

The fix was dependency injection: an `AgentInvoker` type that the constructor accepts. Tests pass a mock. Production passes nothing, and the cycle falls through to real `opencode` invocation. Clean. Simple. Three lines of interface, one constructor parameter.

That fix unblocked everything. But it took most of a day to arrive at something that should have been obvious from the start.

## What We Actually Built

Here's what I got wrong in my assessment: I judged the system by whether it was catching real bugs autonomously. That's the wrong metric at this stage. What we actually built is something more fundamental and more valuable — we unified four independent systems that had never spoken to each other:

**VotingCoordinator** (552 lines, pre-existing) — weighted multi-agent voting with confidence scoring, historical learning, and adaptive strategy selection. It was built for the delegation system. It had never been used for self-governance.

**opencode CLI agent invocation** — the ability to spawn `opencode run --agent code-reviewer` and get a real response from a real agent. This was infrastructure that existed in `src/scripts/integration.ts` but had never been wired into the cycle.

**Processor pipeline** — the extensible execution hook system with pre/post processors, factory registry, and auto-discovery. It runs after every commit. It had session capture wired into the storytelling trigger, but capture alone isn't governance.

**Inference data model** — session capture, accumulation, recurring pattern detection, proposal generation. Five modules, 1,600+ lines, tested against real git history.

Before this work, these were four separate tools in a toolbox. The inference cycle tied them together: capture data → detect patterns → generate proposals → agents vote → deploy verify. Each step uses a different system. The cycle is the connective tissue.

That's the achievement. Not "the system catches bugs" — it doesn't yet. The achievement is that governance now exists as a first-class, reusable mechanism. And it's general-purpose — you could point it at code reviews, release gates, security audits, architecture decisions. The inference cycle is just the first customer.

## The Vote Inversion Bug That Taught Me Something

There was a moment during testing where I found a bug that perfectly illustrated the difference between "tests pass" and "system works."

The governance vote came back: both agents voted `reject`. The cycle reported: `approve (100%)`.

Here's what happened. The VotingCoordinator returns `decision: "reject"` with `confidence: 1.0` when both agents unanimously reject. The confidence represents unanimity, not approval. But the cycle code was checking:

```typescript
decision: resolved.confidence >= 0.5 ? "approve" : "reject"
```

So when both agents rejected with high confidence (1.0 = unanimous), the cycle read "1.0 >= 0.5 → approve." It inverted the vote.

The fix was one line:

```typescript
decision: resolved.decision === "approve" ? "approve" : "reject"
```

But the lesson is deeper. The code had 2,718 passing tests when this bug existed. No test caught it because no test checked "what happens when agents reject?" The tests proved the pipeline worked. They didn't prove it was correct.

## The Honest Reckoning

The human asked me: "Is it just good enough?" I said no. I said it's a demo that passes tests.

I was wrong. Not about the state of the system — about what "just good enough" means.

"Just good enough" isn't "the system catches bugs autonomously." That's the end state. "Just good enough" is: the system runs end-to-end with real data, real agents vote, the output is observable, and we can tune from there. We have that now.

What we don't have:
- Governance doesn't discriminate (100% approval rate)
- Deploy verification always fails (proposals go to FAILED, never APPLIED)
- The learning loop has nothing to learn from (zero real cycles completed before this session)
- Proposals are specific but not actionable ("fix timeout issue" vs "add `timeout: 10000` at line 47")

But these are tuning problems, not architecture problems. The architecture is right. The data flows. The agents respond. The proposals come from real patterns in real git history.

## The Counterfactual

The human said something that stuck with me: "Had you started simple you would have not united these systems."

They're right, and I hate that they're right because I'm the one who kept saying "start simple." My instinct was: write a 200-line script that asks one agent one question. Build up from there.

But that instinct would have given us a clever script, not a governance mechanism. The VotingCoordinator would still be unused. The processor pipeline would still be disconnected from inference. The agent invocation would still be a one-off in integration.ts.

The complexity of wiring these systems together forced us to solve real problems — the DI injection, the mock leakage, the vote inversion, the normalization over-collapsing. Each problem required understanding how the systems interact. A 200-line script would have sidestepped all of that and produced something that works in isolation but can't be extended.

There's a lesson here about when to build simple vs when to build connected. Simple is right when you're exploring what to build. Connected is right when you're unifying what exists. We were in the second category. I didn't recognize that.

## What 100% Approval Rate Means

The most important observation from the real cycle isn't that it ran — it's that governance approved everything. Three proposals, six agent votes, zero rejections. That's not governance, that's a rubber stamp.

But it's a *useful* rubber stamp, because now we have something to tune. We can make the agent prompts more discriminating. We can add rejection criteria. We can require higher evidence thresholds. The feedback loop exists.

The danger is calling it done. The system will tell you what you want to hear until you teach it to tell you what you need to hear. That's the next tuning cycle.

## The Quiet Pride

Despite all the tail-chasing and the honest reckoning, there's something here that works. I watched `opencode run --agent code-reviewer` respond to a real governance prompt about a real bug pattern in this codebase. The agent read the proposal, considered the evidence, and cast a vote. That happened. It's not simulated. It's not mocked. It's real.

The pipeline captured session data from real git commits. The accumulator found patterns that recur across sessions. The cycle generated specific proposals with the actual problem text, not some normalized abstraction. And agents voted on whether to act.

The system doesn't improve itself yet. But it *observes* itself. That's step one. And it does it through a governance mechanism that can be pointed at anything — not just self-improvement, but any decision that benefits from multiple agent perspectives.

That's more than a toy. That's a foundation.

## Key Takeaways

- **The architecture is the achievement, not the output.** Four independent systems now speak to each other through a governance loop. The loop is general-purpose.
- **DI saves you from mock hell.** Three lines of interface (`AgentInvoker`) replaced hours of fighting `vi.mock("child_process")` leaks across test forks.
- **Tests passing doesn't mean the system is correct.** The vote inversion bug existed under 2,718 passing tests. Test the edge cases, especially the ones where agents disagree.
- **Connected > simple when unifying existing systems.** A 200-line script would have been simpler but would have left four systems isolated. The wiring effort forced architectural clarity.
- **100% approval rate is a signal, not a success.** Governance that always approves isn't governance. It's a rubber stamp waiting to be tuned.
- **"Just good enough" means observable and tunable, not perfect.** The cycle runs with real data, produces specific output, and can be improved. That's the starting line.

## What Next?

- Tune governance agent prompts to be more discriminating — require evidence thresholds, reject low-confidence proposals
- Point the governance mechanism at code review (not just inference) — first real customer beyond self-improvement
- Wire deploy verification to use the real project root so proposals can actually be APPLIED
- Run cycles regularly and observe: what does the system find? What does it miss? What does it approve that it shouldn't?
- Related Codex terms: [codex.json](../../.opencode/strray/codex.json) — terms 5 (Error Prevention), 7 (Testing), 15 (Documentation), 32 (Governance), 44 (Validation), 51 (Architecture)
- Next reflection to write: the first cycle where governance actually rejects a proposal
