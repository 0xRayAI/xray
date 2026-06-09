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

## Roadmap

### Phase 0 — Foundation (current)
**Recommended first attack (Phase 0.1): Extract / surface the pure kernel call as the shared `handleGovernRequest` (done) + align surfaces to the standards.**

MCP is the new standard (parallel to Dynamo as the governance standard). The canonical way to call the nucleus is therefore via the existing first-class MCP tools in the governance MCP server (`govern_proposals`, `govern_reflection`). That server already delegates directly to `getGovernanceService()` and already supports both stdio *and* Streamable HTTP (`/mcp` endpoint via the MCP SDK).

The thin semantic `POST /govern` (direct `GovernanceResponse` JSON, no full MCP protocol) is the valuable *convenience adapter* for non-MCP callers (curl, CI, simple agents, the 4 bridges in some paths). We landed the pure handler + small Express adapter in `src/nucleus/govern-http.ts` as the smallest validating slice — it reuses the exact same service/types and follows the APITrigger pattern.

- [x] Prototype direct semantic `POST /govern` convenience (handler + adapter in `src/nucleus/govern-http.ts`)
- [ ] Align / extract a minimal "nucleus governance MCP" (or keep the existing governance.server.ts as the standard bearer) so the kernel is obviously callable as MCP
- [ ] Harden e2e tolerances to zero (no skips in clean install)
- [ ] Generalize PostProcessor as metamorphosis engine skeleton
- [ ] Pipe activity.log into inference-cycle for self-proposals

(The MCP surface is the standard; the direct HTTP is the ergonomic adapter. Both must stay green under the consumer verification loop.)

### Phase 1 — Nucleus Extraction
- [ ] Extract kernel: governance-service + governance-core + thinDispatch + enforcer as standalone importable core
- [ ] Make skills load dynamically (leverage in-process skill registry + knowledge-skill-base)
- [ ] Promote the semantic HTTP convenience (`/govern`) and ensure the MCP (Streamable HTTP + stdio) surface is the obvious first-class standard for the nucleus
- [ ] Collapse CLI to `xray govern` as primary command

### Phase 2 — Closed Loop
- [ ] Metamorphosis resonance scoring on Dynamo
- [ ] First self-proposal: inference-cycle reads activity.log, proposes processor change
- [ ] Full governance pipeline gates self-evolution
- [ ] Verification substrate blocks any change that breaks the loop

### Phase 3 — v3 Kernel Release
- [ ] New docs, new Codex section on self-evolution
- [ ] Long-running governed agent session verification
- [ ] Third-party plugin API stable
- [ ] v2 ←→ v3 migration path documented

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
