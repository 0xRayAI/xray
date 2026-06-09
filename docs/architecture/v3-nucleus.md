# v3 Nucleus — xray as Governance Kernel

## Thesis

xray is the external governance kernel your AI agents call for a decision — not a platform they have to live inside.

v2 proved the federation works (2,847 tests, 4 plugin E2Es in isolated tmp dirs, 0 failures). v3 crystallizes it into its true shape: the **nucleus** (Dynamo pipeline + orchestrator routing + enforcer) surrounded by **dynamic adapters**.

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
├── 🔌 Adapters (surfaces, not architecture) ───────────────────
│   ├── HTTP/SSE → POST /govern       primary surface (new)
│   ├── MCP stdio → optional adapter  existing 4 platforms
│   ├── MCP in-process → skill call   fast path
│   └── CLI → xray govern ...         thin wrapper
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
    ├── fresh npm i in isolated tmp dir
    ├── all 4 plugin installs + E2Es
    ├── activity.log monitoring
    └── zero-tolerance: 100% green or block
```

## Concrete Shifts from v2

### 1. Federation → Nucleus + Adapters
- **v2**: 41 MCP servers wired as the architecture. Every capability is an MCP server.
- **v3**: The kernel is governance pipeline + orchestrator + enforcer. MCP is an adapter protocol, not the architecture. HTTP/SSE (`POST /govern`) becomes the primary surface.

### 2. Baked → Dynamic Skills
- **v2**: 25 knowledge-skill servers ship as separate MCP processes. Long tail of boilerplate even with the base class.
- **v3**: Skills are plugins loaded at runtime via registry or on-demand. The 25 become the default plugin set. New skills don't require new server processes.

### 3. 17 CLI Commands → One Command
- **v2**: `xray status`, `xray security-audit`, `xray skill-install`, `xray mcp-install`, etc.
- **v3**: `xray govern` is the primary command. Everything else is `xray govern --status`, `xray plugin install`, etc.

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
- **Consumer verification loop** — fresh tmp dir + npm i + E2Es + activity.log monitoring. Every v3 piece passes through this gate.

## Roadmap

### Phase 0 — Foundation (current)
- [ ] Harden e2e tolerances to zero (no skips in clean install)
- [ ] Generalize PostProcessor as metamorphosis engine skeleton
- [ ] Pipe activity.log into inference-cycle for self-proposals
- [ ] Prototype `POST /govern` as thin wrapper over GovernanceService

### Phase 1 — Nucleus Extraction
- [ ] Extract kernel: governance-service + governance-core + thinDispatch + enforcer as standalone importable core
- [ ] Make skills load dynamically (leverage in-process skill registry + knowledge-skill-base)
- [ ] Build HTTP/SSE adapter (`POST /govern`)
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
