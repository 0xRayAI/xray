# User Asides — Engineering Roadmap

**Status:** Living backlog for `feat/user-asides` and Grok Build integration gaps.  
**Consumer guide:** [Parallel Work Tracks](./parallel-work-tracks.md)  
**API reference:** [User Asides](./user-asides.md)

Items below are **known shortcomings** accepted for initial ship (see review quorum 2026-06-20). Each row is a tracked todo for framework work — not user workarounds.

**Second quorum (2026-06-20, session `019ed808-af9b-73d0-a115-c626ebd23d69`):** Researcher, architect-tools, and code-review — **CONDITIONAL PASS**. State **enforcement** in Grok Build is correct (disk SSOT + PreToolUse reads live plan/aside on every tool call). Roadmap items about `session-boot.json` are **awareness ergonomics**, not broken state management. Reprioritized below.

### Two layers (do not conflate)

| Layer | SSOT | Consumed by | Status |
|-------|------|-------------|--------|
| **Enforcement** | `_active.json`, `asides/*.json`, `lead-dev-plan.json` | `resolveSpawnPlan()` on every PreToolUse | **Shipped** — `verify:user-aside` 9/9 |
| **Awareness** | `session-boot.json` hints | Lead agent (manual Read; Grok ignores hook stdout) | **Partial** — summaries optional |

---

## Priority legend

| Priority | Meaning |
|----------|---------|
| **P0** | Breaks correct parallel-work UX or causes wrong-file / wrong-plan mistakes |
| **P1** | Reliability, resume, or multi-session correctness |
| **P2** | Polish, automation, observability |

---

## P0 — Must fix for trustworthy parallel work

- [x] **Enforce worktree cwd on aside spawns** (2026-06-20)  
  PreToolUse **denies** aside spawns when `aside.worktree` is set, project root ≠ worktree, and spawn lacks `cwd` / `working_directory` / `isolation:worktree` matching the aside path.  
  **Files:** `aside-worktree.ts`, `delegation-gate.ts`, `verify-user-aside-core.mjs` step 10.

- [x] **Optional git worktree provisioning from aside intake** (2026-06-20)  
  `analyze-complexity` with `worktree` + `branch` runs guarded `git worktree add` when `user_asides.auto_provision_worktree: true`.  
  **Files:** `aside-worktree.ts`, `complexity-handler.ts`, `features.schema.json`.

---

## P1 — Awareness, resume ergonomics, and session correctness

- [ ] **Inject plan summaries into session-boot**  
  **Gap:** `session-boot.json` carries aside *hints* (`activeAside`, `asideWorktree`) but not `leadDevPlanSummary` / `activeAsidePlanSummary` (next todo, phase, completion counts). **Enforcement is unaffected** — spawn gate reads disk SSOT. This improves cold-resume awareness without MCP/Read.  
  **Target:** `buildSessionBootPayload` adds summaries via `getNextRequiredTodo` + `formatUserAsideSummary` patterns.  
  **Files:** `grok-hook-utils.js`, `lead-dev-plan-persistence.ts`, `user-aside.ts`.

- [ ] **Refresh session-boot on aside activate/clear**  
  **Gap:** `setActiveAsideId` / `clearActiveAside` update `_active.json` immediately (spawn routing is live). `session-boot.json` hints may lag until next UserPromptSubmit.  
  **Target:** Call `writeSessionBoot(buildSessionBootPayload(...))` from activate/clear paths.  
  **Files:** `user-aside.ts`, `complexity-handler.ts`, `task-handler.ts`.

- [ ] **Clarify Grok hook contract in consumer docs**  
  **Gap:** Users may think hooks auto-inject boot into agent context. Grok **ignores** SessionStart/UserPromptSubmit stdout — side effects (disk writes) are the contract.  
  **Target:** Document three channels: persistence, enforcement (always live), awareness (optional Read).  
  **Files:** `parallel-work-tracks.md`, `AGENTS-consumer.md`.

- [ ] **Session-scoped `_active.json` by default**
  **Gap:** If `setActiveAsideId` runs without `sessionId`, any Grok session in the workspace routes spawns to that aside until cleared.  
  **Target:** Require `sessionId` on activation; store `{ asideId, sessionId }`; spawn gate ignores active pointer when `sessionId` mismatches.  
  **Files:** `user-aside.ts`, `delegation-gate.ts`, `ActiveAsidePointer` schema bump.

- [ ] **Lead agent resume ritual in AGENTS.md / orchestrator skill**  
  **Gap:** Enforcement state is always loaded by hooks; lead **awareness** on resume is opt-in. Suit docs do not spell out the first-turn ritual.  
  **Target:** *"On resume: Read `.xray/state/session-boot.json`; if `activeAside`, read `asides/{id}.json`; else read `lead-dev-plan.json` — or call `get-orchestration-status`."*  
  **Files:** `AGENTS-consumer.md`, orchestrator `SKILL.md`.

- [ ] **Surface `get-orchestration-status` in consumer docs as resume step**  
  **Gap:** Users returning after a break may not know plan persisted without MCP status call.  
  **Target:** Document mandatory resume ritual in [Parallel Work Tracks](./parallel-work-tracks.md) once boot summary ships; until then, explicit MCP step.  
  **Files:** docs (done partially), `status-handler.ts` aside fields.

- [ ] **Auto-run confer for `conferOnPhaseStart` aside governance**  
  **Gap:** `conferOnPhaseStart` and `trapSignals` are session-boot hints only — no automatic `orchestrate-task { confer: true }`.  
  **Target:** Optional auto-confer on aside phase boundary when governance flag set (respect `no_new_surface` — rewire existing confer path).  
  **Files:** `confer.ts`, `complexity-handler.ts`, `getUserAsideBootHints`.

- [ ] **Synthesis write-block clarity when aside active**  
  **Gap:** Aside **spawns** bypass main synthesis checkpoint; main-track **writes** remain blocked. Easy to misread deny messages.  
  **Target:** PreToolUse deny reason cites `clearActiveAside` when write blocked due to main synthesis while aside active.  
  **Files:** `delegation-gate.ts`, synthesis hook runtime.

---

## P2 — Scale and ergonomics

- [ ] **Multiple paused asides, single active**  
  **Gap:** Only one `_active.json` pointer; paused asides exist as files but switching requires explicit activate/clear dance.  
  **Target:** `listUserAsides` MCP surface via existing `get-orchestration-status` rewire (no new handler file — codex 69).  
  **Files:** `status-handler.ts`, `user-aside.ts`.

- [ ] **Aside completion / archive lifecycle**  
  **Gap:** `status: completed | archived` exists in schema but consumer path for marking done and archiving is underspecified.  
  **Target:** `orchestrate-task` with `userAsideId` + `markAsideCompleted: true`; move to `asides/archived/`.  
  **Files:** `user-aside.ts`, `task-handler.ts`.

- [ ] **Worktree health check on aside activate**  
  **Gap:** No validation that `aside.worktree` exists and is on `aside.branch`.  
  **Target:** Boot warning `asideWorktreeMissing: true` when path absent or branch mismatch.  
  **Files:** `getUserAsideBootHints`, verify script extension.

- [ ] **Grok `isolation: worktree` bridge to aside metadata**  
  **Gap:** Grok-native worktree path and aside `worktree` hint are disconnected — two sources of truth.  
  **Target:** On aside spawn with `isolation: worktree`, assert Grok worktree path matches aside record or update aside SSOT.  
  **Files:** post-tool hook, `pending-delegations.ts`.

- [ ] **Docusaurus + CHANGELOG sync on ship**  
  **Gap:** `parallel-work-tracks.md` and this roadmap ship on branch; older npm 3.5.x consumers lack user asides.  
  **Target:** Release gate includes `verify:user-aside`; docs linked from `index.md` and sidebars on the 4.0.0 ship.  
  **Files:** `release-gate.mjs`, `CHANGELOG.md`, `sidebars.ts`.

---

## Verification checklist (per item)

When closing a roadmap item:

1. Unit test in `user-aside.test.ts` or `delegation-gate.test.ts`
2. Entry in `scripts/mjs/verify-user-aside-core.mjs` if behavior is consumer-facing
3. Update [User Asides](./user-asides.md) *Accepted limitations* — remove row when fixed
4. Update [Parallel Work Tracks](./parallel-work-tracks.md) if user workflow changes

---

## Related

- [Parallel Work Tracks](./parallel-work-tracks.md) — end-user guide
- [User Asides](./user-asides.md) — MCP API + current limitations
- [AsideContext](./aside-context.md) — internal subcontext (out of scope for this roadmap)