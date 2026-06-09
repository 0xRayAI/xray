# v3 Nucleus — xray as Governance Kernel

## Thesis

xray is the external governance kernel your AI agents call for a decision — not a platform they have to live inside.

v2 proved the federation works (2,847 tests, 4 plugin E2Es in isolated tmp dirs, 0 failures). v3 crystallizes it into its true shape: the **nucleus** (Dynamo pipeline + orchestrator routing + enforcer) surrounded by **dynamic adapters**.

v2.1.4 is the measured starting state (41 MCP servers / 25 knowledge-skill + XrayKnowledgeSkillBase, 162 files / 2,847 tests, 4 bridges proven via fresh published-package consumer verification in isolated tmp dirs). The federation is solid; v3 extracts the callable kernel from it.

## Architecture

```
v3 Nucleus ─────────────────────────────────────────────────────
│
├── 🧠 Kernel (the thing agents call) ──────────────────────────
│   ├── governance-service.ts        Dynamo deliberation
│   ├── governance-core.ts           core governance logic
│   ├── thinDispatch (orchestrator)  complexity-aware routing
│   └── enforcer                     Codex compliance
│
├── 🔌 Surfaces (MCP is the new standard, like Dynamo for governance)
│   ├── MCP (stdio + Streamable HTTP)  primary / canonical (govern_proposals etc.)
│   ├── HTTP/SSE → POST /govern        direct semantic convenience adapter
│   ├── MCP in-process                 fast path for internal skills
│   └── CLI → xray govern ...          thin wrapper
│
├── 🧩 Plugins (dynamic, loaded at runtime) ────────────────────
│   ├── knowledge-skill servers → default plugin set
│   │   (code-review, security-audit, researcher, etc.)
│   ├── processors → pipeline stages
│   ├── bridges → grok/hermes/opencode/openclaw
│   └── custom → third-party
│
├── 🔄 Metamorphosis Engine ────────────────────────────────────
│   ├── PostProcessor generalized     self-evolution loop
│   ├── activity.log → inference-cycle self-proposals
│   ├── 3-agent voting + Dynamo       governed change approval
│   └── deploy-verifier               safe application
│
└── 🧪 Verification Substrate ──────────────────────────────────
    ├── fresh `npm i 0xray@X.Y.Z` (published) in isolated tmp dirs
    ├── per-plugin installs + exact shipped E2Es (4 platforms)
    ├── persistent `logs/framework/activity.log` monitoring + sub-agents
    └── zero-tolerance consumer gate: 100% green (proven 2.1.4) or block
```

## Concrete Shifts from v2

### 1. Federation → Nucleus + Adapters
- **v2**: 41 MCP servers wired as the architecture. Every capability is an MCP server.
- **v3**: The kernel is governance pipeline + orchestrator + enforcer (the thing that delivers the *Dynamo* external signal). **MCP is the new standard** (just as Dynamo is the established standard for the external governance/resonance signal). The nucleus exposes its core decisions as first-class MCP tools (`govern_proposals`, etc.). Raw HTTP `POST /govern`, CLI, and in-process are valuable convenience adapters on top of the same kernel. MCP (stdio + Streamable HTTP transport) is the canonical surface agents use.

### 2. Baked → Dynamic Skills
- **v2**: 25 knowledge-skill servers ship as separate MCP processes. Long tail of boilerplate even with the base class.
- **v3**: Skills are plugins loaded at runtime via registry or on-demand. The 25 become the default plugin set. New skills don't require new server processes.

### 3. 18 CLI Commands (many thin wrappers) → One Command
- **v2**: `xray status`, `xray security-audit`, `xray skill-install`, `xray mcp-install`, `xray grok-install`, etc. (18 total).
- **v3**: `xray govern` is the primary (and eventually only) command. Everything else becomes `xray govern --status`, `xray plugin install`, etc. The surface collapses; the kernel does the work.

### 4. Processors → Pipeline Stages
- **v2**: 20+ processors as independent implementations with a manager.
- **v3**: Processors are pipeline stages in the metamorphosis engine. Each stage is a plugin. The PostProcessor core loop orchestrates them.

### 5. Manual → Self-Evolving
- **v2**: Changes are hand-coded. The governance pipeline governs external code only.
- **v3**: The inference cycle reads activity.log, proposes system changes, and subjects them to full 3-agent + Dynamo governance. The system evolves itself under external control.

## What Stays (The Federation as Rich Default)

- **25 knowledge-skill servers** — they are real tool providers (not just RAG shells). They become the default plugin set, not the architecture.
- **4 platform bridges** — grok/hermes/opencode/openclaw remain first-class. They call the kernel under the hood.
- **3-agent voting + Dynamo** — the moat. Undisturbed.
- **Codex** — 68 terms, SSOT, enforced.
- **Consumer verification loop** — fresh tmp dir + real published `npm i 0xray@X.Y.Z` (not tgz from cwd) + per-plugin installs + the exact shipped E2E scripts + persistent activity.log monitoring + sub-agent triage. Proven at 2.1.4 for all 4 bridges. Every v3 piece must pass this gate with zero tolerance (harden remaining parse tolerances in Phase 0).

## Build Plan

Worktree: `../xray-v3` (branch `v3-nucleus`)

### Dependency Graph

```
Phase 0 ─────────────────────────────────── (COMPLETE)
  0.1 ──[x] POST /govern convenience adapter
  0.2 ──[x] Tests for handleGovernRequest
  0.3 ──[x] MCP surface audit (governance.server.ts)
  0.4 ──[x] E2E tolerance hardening (Grok/Hermes)
  0.5 ──[x] PostProcessor MetamorphosisEngine interface
  0.6 ──[x] Self-proposal pipeline spec
  ├──────────────────────────────────────────────────────┘
  ▼
Phase 1 ───────────────────────────────────
  1.1 ──[x] Kernel facade (src/nucleus/kernel.ts)
  1.2 ──[x] Dynamic skill loading (in-process-skill-registry)
  1.3 ──[x] MCP Streamable HTTP migration
  1.4 ──[x] CLI collapse to xray govern
  ├──────────────────────────────────────────────────────┘
  ▼
Phase 2 ───────────────────────────────────
  2.1 ──[ ] Metamorphosis resonance scoring
  2.2 ──[ ] First self-proposal (activity.log → proposal)
  2.3 ──[ ] Verification substrate gate
  ├──────────────────────────────────────────────────────┘
  ▼
Phase 3 ───────────────────────────────────
  3.1-3.4 Release
```

### Phase 0 — Foundation

**Theme**: Validate the nucleus concept with real code. Zero risk to the federation. No architectural changes to existing subsystems.

---

#### 0.1 [x] `POST /govern` semantic convenience adapter

- **Files**: `src/nucleus/govern-http.ts`
- **Contents**: `handleGovernRequest()` pure handler + `GovernHTTPAdapter` Express wrapper
- **Integration**: Standalone file, not wired into any process yet. Compiles, zero consumers.
- **Done when**: Compiles, imports are clean, no lint errors. ✓

---

#### 0.2 [x] Unit tests for `handleGovernRequest`

- **Files**: `src/nucleus/__tests__/govern-http.test.ts`
- **What to test**:
  - Rejects missing/null/empty body with `"proposals" array is required`
  - Rejects body with non-array proposals
  - Calls `getGovernanceService().govern()` with correctly merged options
  - Caller-supplied `requireExternalDynamo` overrides request-level option
  - Logs `govern-request-received` and `govern-response` via frameworkLogger
- **What NOT to test**: Express listener, HTTP integration, health endpoint (those are integration-level)
- **Done when**: `npx vitest run src/nucleus/` passes, handler coverage > 80% (pure handler paths fully exercised; adapter class excluded per plan)
- **Estimate**: 0.5 day
- **Status**: 6 tests pass. All specified rejection, call, merge, override, and logging cases covered. `npx vitest run src/nucleus/` ✅

---

#### 0.3 [x] MCP surface audit

- **Files**: `src/mcps/governance.server.ts` (read-only audit)
- **Task**: Confirm the governance MCP server already exposes `govern_proposals` / `govern_reflection` tools that delegate to `getGovernanceService()`. Document the existing surface as the canonical MCP path.
- **If confirmed**: No code change. Mark done.
- **If gap found**: Extract shared handler or align import.
- **Done when**: A comment or doc note confirms the MCP surface is the standard, and the checklist item links to the relevant lines in `governance.server.ts`.
- **Estimate**: 0.25 day (audit only)

---

#### 0.4 [x] E2E tolerance hardening

- **Files**:
  - `scripts/test/test-grok-cli-e2e.mjs` (fix skip conditions)
  - `scripts/test/test-hermes-e2e.mjs` (fix skip conditions)
- **Task**: Identify and fix the parse tolerances that cause skips in fresh consumer envs. The Grok/Hermes E2Es have minor env-specific parse issues that prevent 100% pass rate.
- **Done when**: All 4 bridge E2Es pass 100% with 0 skips in a fresh `npm i 0xray@latest` in an isolated tmp dir.
- **Estimate**: 1-2 days

---

#### 0.5 [x] PostProcessor MetamorphosisEngine interface

- **Files**:
  - `src/postprocessor/metamorphosis/MetamorphosisEngine.ts`
  - `src/postprocessor/metamorphosis/index.ts`
  - `src/postprocessor/PostProcessor.ts` (amend constructor, optional engine param)
- **Interface**:
  ```ts
  export interface MetamorphosisEngine {
    name: string;
    onPhase?(phase: string, context: unknown): Promise<void>;
    onProposal?(proposal: MetamorphosisProposal): Promise<void>;
  }
  ```
- **Integration**: PostProcessor accepts optional `MetamorphosisEngine[]` in constructor. Each engine gets lifecycle hooks (`onPhase`, `onProposal`). No-op when none configured.
- **Done when**: Interface exists, PostProcessor compiles with optional engine array, no behavioral change.
- **Estimate**: 0.5 day

---

#### 0.6 [x] Self-proposal pipeline spec

- **Files**: `docs/architecture/self-proposal-pipeline.md`
- **What it defines**:
  - **Reader**: How activity.log entries are consumed (tail, batch, interval?)
  - **Analyzer**: How entries map to semantic patterns (existing `semantic-patterns.ts`? New?)
  - **Generator**: How patterns become GovernanceProposals (format, metadata)
  - **Governance gate**: Full 3-agent + Dynamo deliberation
  - **Apply**: Deploy-verifier applies approved self-changes
  - **Safety**: Rollback strategy, max-change-rate limits, human override
- **Done when**: Spec filed and reviewed by at least one other developer
- **Estimate**: 1 day

---

### Phase 1 — Nucleus Extraction

**Theme**: Make the kernel importable as a standalone unit. Surfaces become adapters. Federation becomes plugin set.

**Pre-requisite**: All Phase 0 items closed. Consumer E2Es green at 100%.

---

#### 1.1 [ ] Kernel facade (`src/nucleus/kernel.ts`)

- **Goal**: A single entry point that exports the kernel's capabilities without pulling in the federation.
- **Challenge**: `governance-service.ts` directly imports `mcpClientManager`, `callInProcessSkill`, and `getGovernanceIntegration` — all federation-coupled.
- **Approach**: Create `src/nucleus/kernel.ts` that wraps the facade pattern:
  ```ts
  // src/nucleus/kernel.ts
  export async function govern(req: GovernanceRequest): Promise<GovernanceResponse>
  export async function orchestrate(task: OrchestrationRequest): Promise<OrchestrationResult>
  export async function enforce(code: EnforcementRequest): Promise<EnforcementResult>
  ```
  Initially delegates to existing services. Later, extract dependencies behind interfaces.
- **Done when**: `src/nucleus/kernel.ts` exports these three functions with clean types, can be imported without pulling in `src/mcps/` tree.
- **Estimate**: 2-3 days (dependency untangling is the work)

---

#### 1.2 [x] Dynamic skill loading

- **Files**: `src/mcps/in-process-skill-registry.ts` (refactor), `src/nucleus/plugin-registry.ts` (new)
- **Goal**: Skills can be registered after boot, loaded from config, or discovered at runtime.
- **Current state**: 3 skills hard-coded (code-review, security-audit, researcher). Lazy singleton pattern. Fixed at compile time.
- **Target state**:
  - `PluginRegistry` class with `register(skill: SkillPlugin)`, `load(path: string)`, `get(name: string)`
  - Default plugin set loaded from config (the 25 knowledge-skill servers)
  - Skills are discoverable by the thinDispatch orchestrator without importing server constructors
- **Done when**: A new skill can be registered post-boot, and the default set loads from a config file instead of hard-coded imports.
- **Estimate**: 3-5 days

---

#### 1.3 [x] MCP Streamable HTTP migration

- **Files**: `src/mcps/governance.server.ts`
- **Already implemented**: `runHttp()` uses `StreamableHTTPServerTransport` + `createMcpExpressApp()` on `/mcp`, with API key auth and `/health` endpoint. `run()` uses stdio. Both transports are live and tested.
- **No code change needed**: The governance MCP server already serves `govern_proposals` and `govern_reflection` over both stdio and Streamable HTTP. Start with `--port=3100` or `MCP_PORT=3100` for HTTP, or without for stdio.
- **Documentation update**: v3-nucleus.md now explicitly notes MCP Streamable HTTP as the primary canonical surface.

---

#### 1.4 [x] CLI collapse to `xray govern`

- **Files**:
  - `src/cli/commands/govern.ts` (new, primary command)
  - `src/cli/index.ts` (amend to add `govern` as primary)
- **Alias map**:
  - `xray govern` → runs governance pipeline (shows help + available subcommands)
  - `xray govern --status` → `xray status`
  - `xray govern --audit` → `xray security-audit`
  - `xray govern --mcp governance` → `xray mcp governance`
  - `xray govern --plugin-install <name>` → `xray plugin install <name>`
  - `xray govern --proposals '<json>'` → runs `handleGovernRequest` directly
  - Old commands still work directly (backward compat)
- **Done when**: `xray govern --help` shows available subcommands, all old commands work as both direct calls and `--flag` aliases. ✓

---

### Phase 2 — Closed Loop

**Theme**: The system proposes and applies its own evolution under full governance.

**Pre-requisite**: Phase 1 complete. Kernel facade, dynamic skills, Streamable HTTP, collapsed CLI all shipping.

---

#### 2.1 [ ] Metamorphosis resonance scoring

- **Files**: `src/governance/governance-service.ts` (amend), `src/governance/governance-core.ts` (amend)
- **What it adds**: When `GovernanceRequest.proposals[i].metamorphosis: true`, Dynamo evaluates a new dimension: "Does this change increase the system's ability to govern complex future states?"
- **Score**: `metamorphosisScore?: number` (0-1) added to `GovernanceResult`
- **Threshold**: Only proposals with `metamorphosisScore >= 0.7` AND `overallDecision === 'approve'` can proceed to self-apply
- **Done when**: A metamorphosis proposal receives a score, and low-scored proposals are rejected even if they pass the standard governance vote.
- **Estimate**: 3-5 days (Dynamo integration is the variable)

---

#### 2.2 [ ] First self-proposal

- **Files**: `src/inference/inference-cycle.ts` (amend), `src/postprocessor/metamorphosis/` (use skeleton from 0.5)
- **Flow**:
  1. Inference cycle reads recent activity.log entries via `MetamorphosisEngine.onPhase`
  2. Maps entries to existing semantic patterns (`semantic-patterns.ts`)
  3. Generates a `GovernanceProposal` (e.g., "add processor type X", "modify Y timeout")
  4. Submits through full `govern()` pipeline with `metamorphosis: true`
  5. If approved + score >= 0.7, applies via deploy-verifier
- **Done when**: A real self-proposal is generated, passes governance, and is applied (or correctly rejected).
- **Estimate**: 5-10 days (first-of-its-kind, discovery-driven)

---

#### 2.3 [ ] Verification substrate gate

- **Files**: `scripts/verify-consumer.sh` (new), `xray/features.json` or similar config
- **What it does**: Pre-commit / CI script that runs the full consumer verification loop:
  1. `npm pack`
  2. Fresh tmp dir
  3. `npm i <tarball>`
  4. Install all 4 bridges
  5. Run all 4 E2E suites
  6. Check activity.log for expected entries
  7. Exit non-zero if any step fails
- **Done when**: `npm run verify:consumer` exists, runs in < 5 min, blocks commits/E2Es that break the consumer gate.
- **Estimate**: 1-2 days

---

### Phase 3 — v3 Kernel Release

**Theme**: Ship v3 as the stable kernel release. New docs, new verification, migration path.

**Pre-requisite**: Phase 2 complete. Self-evolution loop running under governance in production-like conditions for ≥ 2 weeks.

#### 3.1 [ ] Codex section on self-evolution
- Add Codex terms 69-72 covering self-evolution constraints
- **Done when**: `xray/codex.json` has 72 terms, AGENTS.md references them

#### 3.2 [ ] Long-running governed agent session verification
- New E2E suite: run a governed agent session for 60+ minutes, verify the self-evolution loop produces valid proposals
- **Done when**: Suite exists, passes in CI

#### 3.3 [ ] Third-party plugin API stable
- Document and freeze `PluginRegistry`, `SkillPlugin`, `MetamorphosisEngine` interfaces
- **Done when**: Interfaces documented, changelog notes API stability

#### 3.4 [ ] v2 → v3 migration path documented
- What breaks: removed CLI commands, MCP server renames, config path changes
- How to migrate: npm update, config migration script, deprecated command aliases
- **Done when**: Migration guide filed at `docs/migration/v2-to-v3.md`

---

## Integration Points Summary

| Component | Connects to | Mechanism |
|-----------|-------------|-----------|
| `src/nucleus/kernel.ts` | `governance-service.ts`, `thinDispatch`, `enforcer` | Direct import (Phase 1.1) |
| `src/nucleus/govern-http.ts` | `getGovernanceService()` singleton | Direct import |
| `src/nucleus/kernel.ts` (facade) | Everything above + MetamorphosisEngine | Single recommended import for callers |
| `governance.server.ts` (MCP) | `getGovernanceService()` singleton | Direct import (already wired) |
| `MetamorphosisEngine[]` | `PostProcessor` lifecycle hooks | Constructor injection (Phase 0.5) |
| `self-proposal pipeline` | `inference-cycle.ts` + `govern()` | Full governance flow (Phase 2.2) |
| Plugin registry | `in-process-skill-registry.ts` + config | Dynamic registration (Phase 1.2) |
| Consumer verification | All 4 bridges + E2Es + activity.log | Shell script + CI (Phase 2.3) |

## What We Are NOT Doing (Anti-Goals)

- Not rewriting the 25 knowledge-skill servers — they become the default plugin set
- Not removing MCP — it becomes the standard surface
- Not changing the Dynamo integration — it stays the external moat
- Not breaking backward compat until Phase 3 (and even then, aliases)
- Not adding a new process or daemon — the nucleus is a library you import

## Guiding Constraints (Codex-Compliant)
- Every new capability must delete at least as much as it adds
- External Dynamo signal always overrides local heuristics
- Consumer verification loop must stay green at every step
- Self-evolution requires 3-agent voting + Dynamo approval + deploy-verifier
- No ground-up rewrite — the federation is the rich default, the nucleus is what you call from anywhere

## One-Line Pitch

> xray is the governance kernel your AI agents call for an external signal — not a platform they have to live inside.

## Related

- Detailed v2 shape (the federation being transformed): [v2-tree.md](./v2-tree.md)
- Governance (Dynamo Solar SSOT + 3 MCP voters + strict requirement model): [governance-model.md](./governance-model.md)
- Metamorphosis vision & derivation (post-2.1.4 verification loop): `docs/reflections/0xray-metamorphosis-vision.md`, `0xray-v2-solid-metamorphosis.md`, `0xray-after-2.1.4-verification.md`
- Three-subsystem model, Codex (68 terms), YML SSOT, MCP surfaces: [AGENTS.md](../../AGENTS.md), [Claude.md](../../Claude.md)

### v2.1.4 Baseline (the measured starting state)
- 41 MCP servers (25 knowledge-skill + 16 root) + XrayKnowledgeSkillBase (61 LOC).
- 162 test files, 2,847 tests, 0 failures at release.
- 4 platform bridges (grok, hermes, opencode, openclaw) verified via the exact procedure: `npm pack` → 4 isolated `/tmp` dirs → real published `npm i 0xray@2.1.4` (not local tgz) → per-plugin `npx 0xray <p> install` → run the shipped `scripts/test/test-*-e2e.mjs` → persistent `logs/framework/activity.log` monitoring + sub-agents → triage/fix/retest until green.
- Opencode + OpenClaw: 100% green in fresh consumer trees. Grok/Hermes: core governance, hooks, processors, and activity.log paths solid (minor parse tolerances for consumer envs hardened post-verification).
- activity.log, pre/post processors, quality-gates, 3-agent + Dynamo, and frameworkLogger-only discipline all observed live.
- Baseline counts also: 18 CLI commands, 24 processors, 42 opencode/agents/*.yml.
- This is the federation we are metamorphosing from. All v3 work must continue to pass the same consumer gate.

v3 keeps the kernel (Dynamo external signal + thinDispatch 7-flow + generalized PostProcessor + consumer verification) and exposes it as a callable nucleus. The 25 knowledge-skill servers + 4 bridges become the rich default plugin set, not the architecture.
