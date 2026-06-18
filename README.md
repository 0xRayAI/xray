# xray — MCP-Centric AI Governance OS

**v3.4.1** — 42 agents · 45 skills · 7 MCP servers · 68 codex terms · 3,226 tests

xray is the pure v2 three-subsystem AI orchestration framework — **MCP-centric**, governed by Dynamo, and autonomous via thinDispatch. Consumer `npm install 0xray` auto-wires all four platform bridges and seven MCP servers with zero manual config.

## Quick Start

```bash
npm install 0xray          # postinstall: 4 bridges + 7 MCP servers + AGENTS.md + .mcp.json
npx 0xray status          # verify install
npx 0xray setup            # optional: symlinks, hook extras
```

Manual per-platform install (idempotent, same result as postinstall):

```bash
npx 0xray opencode install
npx 0xray grok install     # 7 MCP servers + dual skill sync (~/.grok/plugins + ~/.grok/skills)
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install    # starter skills
```

## What's New Since 3.1

| Version | Highlights |
|---------|------------|
| **3.4.1** | Unified `install-bridges.cjs` on postinstall — OpenCode, Grok, Hermes, OpenClaw in one pass. All 7 MCP servers via `npx -y 0xray mcp <cmd>` (no `dist/` paths). Canonical `release.mjs` pipeline. |
| **3.3.1** | Orchestrator confidence gate wired into execution planning. |
| **3.3.0** | Pluggable **Memory Routing** (`features.json` → `memory_routing`). Repertoire is the default provider in the framework repo. |
| **3.2.0** | Typecheck hardening (58 errors fixed), orphan cleanup (5 deleted / ~39 integrated), full pre-tool-use hook, SelfProposalEngine + AsideContext restored, Hermes E2E 44/0/0, Grok CLI E2E green. |
| **3.1.1** | StringRay → **0xRay** rename. Marketplace files (`.mcp.json`, `.grok-plugin/plugin.json`). Postinstall ships `AGENTS.md`, `SKILLS.md`, `.gitignore.default`. ConfigLoader `mcpServers` format. |
| **3.1.0** | Pre-publish guard tolerates missing `features.json`. |

### Consolidations

- **One consumer install path** — `postinstall.cjs` → `installAllBridges()` replaces scattered per-platform setup.
- **7-server MCP surface** — `.mcp.json` SSOT; Grok plugin and all bridges share `XRAY_MCP_SERVERS`.
- **Dev vs consumer AGENTS** — `AGENTS.md` (framework) vs `AGENTS-consumer.md` (copied to consumer projects on install).
- **Release pipeline** — `npm run release:patch|minor|major` → reconcile → gate → artifacts → tag → publish.

### Removals / Deprecations

- **StringRay / strray-ai** branding retired (3.1.1).
- **`hermes bridge`** CLI removed — use `npx 0xray hermes install`.
- **`.opencode/xray/` fallback** removed from auto-reflection-generator (3.1.1).
- **~180 stale `@version` JSDoc tags** and **"xray 2.0" command doc strings** cleaned (3.2.0).
- **`advanced-features/`** decoupled from core boot — not on the consumer install path.
- **PostProcessor** soft-deprecated since 3.0 (`enablePostProcessor: false` default).

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│                  Inference                       │
│  Proposals · Reflection · Memory routing        │
├─────────────────────────────────────────────────┤
│           External Governance (Dynamo)           │
│  Codex enforcement · Resonance/Isotopic · SSOT    │
│  3 deliberation MCPs: code-review, security,     │
│  researcher (within 7-server consumer surface)  │
├─────────────────────────────────────────────────┤
│          Autonomous Engine (thinDispatch)        │
│  7-flow MCP · Delegation · Confidence gate      │
└─────────────────────────────────────────────────┘
```

- **Inference** — proposals, reflection, execution planning. Optional memory-routing enrichment (v3.3).
- **External Governance** — Dynamo Solar SSOT; CodexPolicyService; weighted PHI/TAU deliberation.
- **Autonomous Engine** — thinDispatch 7-flow routing; orchestrator confidence gate (v3.3.1).

## Consumer Install (postinstall)

On `npm install 0xray` in a consumer project, postinstall automatically:

1. Copies **`AGENTS-consumer.md` → `AGENTS.md`**
2. Seeds **`.gitignore`** from `.gitignore.default` (if absent)
3. Deploys **`.xray/`** config (`codex.json`, `features.json`, `config.json`)
4. Writes project **`.mcp.json`** with 7 MCP servers (`npx -y 0xray mcp …`)
5. Installs **4 bridges**: OpenCode (agents + `opencode.json`), Grok (plugin + global skills), Hermes (`~/.hermes/plugins/xray-hermes`), OpenClaw (config + skills)
6. Syncs **45 framework skills** to platform skill dirs
7. Installs git pre-commit hook (non-blocking if not a git repo)

## Seven MCP Servers (consumer)

All registered via `npx -y 0xray mcp <cmd>` — no brittle `dist/` paths:

| Server | Command | Role |
|--------|---------|------|
| `xray-governance` | `mcp governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | `mcp skills` | 45 knowledge skills + skill invocation |
| `xray-orchestrator` | `mcp orchestrator` | thinDispatch 7-flow, task delegation |
| `xray-enforcer` | `mcp enforcer` | Codex compliance, rule validation |
| `xray-researcher` | `mcp researcher` | Codebase exploration, implementation lookup |
| `xray-code-review` | `mcp code-review` | Proposal quality, best practices |
| `xray-architect-tools` | `mcp architect-tools` | System design, architecture decisions |

The framework repo also ships additional internal `.server.ts` implementations for orchestration pipelines — these are not part of the 7-server consumer `.mcp.json` surface.

## Agents

**42 YML agent surfaces** in `src/opencode/agents/*.yml` — zero manual registration. Invoke via `@agent-name` in OpenCode.

Core governance agents:

| Agent | Purpose |
|-------|---------|
| `@enforcer` | Codex compliance & error prevention |
| `@orchestrator` | Multi-step task coordination |
| `@architect` | System design & technical decisions |
| `@security-auditor` | Vulnerability detection |
| `@code-reviewer` | Quality assessment |
| `@refactorer` | Technical debt elimination |
| `@testing-lead` | Testing strategy |
| `@bug-triage-specialist` | Error investigation |
| `@researcher` | Codebase exploration |

See [AGENTS.md](AGENTS.md) and [SKILLS.md](SKILLS.md) for the full agent and skill catalog.

## Memory Routing + Repertoire (v3.3+)

Pluggable `memory_routing` block in `features.json` (validated by `features.schema.json`):

```json
"memory_routing": {
  "enabled": true,
  "provider": "repertoire",
  "module_path": "../repertoire/dist/provider/memory-routing-provider.js",
  "config": {
    "dataDir": "../repertoire/data",
    "signalsPath": "../repertoire/data/curated_signals.json",
    "logDir": "../repertoire/logs/groover-inference"
  }
}
```

| Integration | What it does |
|-------------|--------------|
| **ExecutionPlanner** (v3.3.1) | `getTaskConfidence()` → complexity boost, trap hints, signal-aware `selectAgent()` |
| **thinDispatch** | `resolveThinDispatch()` adjusts score; architect override on high-confidence traps |
| **Researcher** | `researcher-confidence.ts` appends `MEMORY_ROUTING:` block to governance output |
| **Feedback** | Per-task `ingestFeedback()` closes the learning loop |

**External hosts** (Hermes/Grok): add `repertoire-mcp` to `.mcp.json` — see Repertoire docs.

Consumers without Repertoire: `"memory_routing": { "enabled": false, "provider": "null" }`.

Docs: [memory routing](docs-site/docs/guides/memory-routing.md) · [Repertoire](docs-site/docs/guides/repertoire.md) · [features.json](docs-site/docs/guides/features-json.md) · [all features since 3.1](docs-site/docs/guides/features-since-3.1.md)

## Integrations

| Platform | Install | Postinstall behavior |
|----------|---------|----------------------|
| **OpenCode** | `npx 0xray opencode install` | Merges `opencode.json`, copies agent YML surfaces |
| **Grok CLI / Build** | `npx 0xray grok install` | Plugin + `~/.grok/skills/` sync, 7 MCP servers |
| **Hermes Agent** | `npx 0xray hermes install` | `~/.hermes/plugins/xray-hermes`, consumer root marker |
| **OpenClaw** | `npx 0xray openclaw install` | `.xray/config/openclaw.json`, skill sync |

## Governance & Codex

- **68 terms** in `.xray/codex.json` — core, architecture, testing, performance, security, operations, governance
- CodexPolicyService — Governance-owned SSOT for codex loading
- Pre-governance gate blocks non-compliant proposals
- Active codex snapshot via `get_active_codex` MCP tool
- frameworkLogger structured logging (never `console.*`)

## Testing

| Suite | Status (v3.4.1) |
|-------|-----------------|
| Unit / Integration | 185 files, **3,226 passed** |
| OpenCode E2E | 42/42 solo, 34/34 orchestrator |
| Grok CLI E2E | 62/0 failures (v3.2.0 verified) |
| OpenClaw E2E | 9/9 (v3.2.0 verified) |
| Hermes E2E | 44/0/0 (v3.2.0 verified) |
| Consumer smoke | `npm run release:gate` — pack → clean install → 7 MCP + 4 bridges |

```bash
npm test
npm run release:gate    # full release gate
```

## Release

```bash
npm run release:patch   # canonical pipeline
npm run release:minor
npm run release:major
npm run release:patch -- --dry-run
```

Pipeline: reconcile-version → release-gate (build + test + consumer smoke) → CHANGELOG/README/AGENTS artifacts → commit → tag → npm publish.

## License

MIT — see [LICENSE](LICENSE)

---

*xray — MCP-centric, governed, autonomous. Pure v2 three-subsystem.*