# xray — exo for coding agents

![0xRay 4.0.42 — Confer votes. Burst runs the swarm.](docs-site/static/img/readme-hero.jpg)

**4.0** — a suit that survives the context window

Confer votes. Burst runs the swarm.

0xRay is the exo a coding agent wears on Grok, OpenCode, Hermes, OpenClaw, or Cursor. Confer votes: the agents on a decision vote, and only a real yes carries the work. Burst runs the swarm, so the agents are in the work as it happens. When the window closes, the job, the page, and the laws are still there.

The product is the **skeleton you wear**.

## Your AI Power Suit

**Your AI Power ⚡️ Suit 🦾** — an exoskeleton that blocks AI slop from becoming real damage.

- **Bone** — three-subsystem OS: Inference · External Governance (Dynamo / Codex) · Autonomous Engine (thinDispatch)
- **Always on** — Codex 11 / 29 / 69, destructive shell, no new MCP/skill/handler surface
- **Temperament** — `frontier` | `guided` | `strict` | `auto` — how loud the engine is, not whether governance exists
- **Wear** — Grok, OpenCode, Hermes, OpenClaw, plus Cursor project hooks. One SSOT gate
- **Muscle** — **Repertoire is preferred.** Vendored 0.2.9 ships **on**. Dest is named laws, not hangar `repo-*` or git slugs. Station is the compact-survival ticket — not a substitute for Repertoire.

```bash
npm install 0xray
npx 0xray wear
```

`npm install 0xray` links vendored `@0xray/repertoire` and prints `npx 0xray wear`. It does not write `.mcp.json` or the chat bridges. Wear writes the consumer suit: managed `AGENTS.md`, `.xray` config, seven MCP servers, and the OpenCode, Grok, Hermes, and OpenClaw bridges (`install-bridges.cjs`). Inside a git checkout, wear also fastens Cursor project hooks. **Repertoire is preferred** — vendored **0.2.9** ships on: factory + stack laws, in-process routing, extra host MCP `repertoire`. Not an eighth `xray-*` server. Dest is a judgment index. Explicit opt-out only: `"enabled": false, "provider": "repertoire"`. Do not pin 0.1.8.

## Quick Start

```bash
npm install 0xray
npx 0xray wear
npx 0xray status
npx 0xray setup --git-hooks # optional: git hooks only
npx @0xray/foundry inspect --skip-live # mill receipt (chat is not a receipt)
```

Manual per-platform install (idempotent, same bridges wear writes):

```bash
npx 0xray opencode install
npx 0xray grok install # 7 MCPs servers + project .grok/plugins/0xray (not machine last-wins)
npx 0xray hermes install
npx 0xray openclaw install
npx 0xray skill:install # starter skills
```

## Autonomy command (default operating model)

When the suit is worn, **`autonomy-command`** is ON by default: lead dev takes helm, phased todos, best subagent per task, per-suite test triage, loop until green. No keywords required. Slash: `/autonomy-command`

Docs: [guides/autonomy-command](docs-site/docs/guides/autonomy-command.md) · Skill: `src/skills/autonomy-command/SKILL.md`

## What's New Since 3.1

| Version | Highlights |
|---------|------------|
| **4.0.42** | Confer votes. Burst runs the swarm. |
| **4.0.41** | Wake cascade stays on the station module. A fresh wear fastens mill and inspect. Goggles records the worn package path. The live page plays the mesh in the browser. |
| **4.0.40** | Live mesh runs the full loop: feed watch, render, direction, deploy, health, and the ledger both ways. |
| **4.0.39** | The seven stack laws stay worn. Repertoire in the suit is 0.2.9. |
| **4.0.38** | Codex term 70 requires the current source and the worn npm package. Dynamo's recommendation is honored. |
| **4.0.37** | A naked checkout wakes with repertoire on. |
| **4.0.36** | Goggles holds the stop through search, read, and a dist wipe. |
| **4.0.35** | Wear rewrites a checkout `dist/cli` launch to `node_modules/0xray`. |
| **4.0.34** | The lens stays on the worn build when the source is not packed. |
| **4.0.33** | Version bump. |
| **4.0.32** | `0xray look` opens one plane. Digest and triage return the card. Calling and confer stay off. |
| **4.0.31** | Goggles looks at one pipeline. Kind 0 stays quiet when the worn list matches the map. Calling and confer stay off. |
| **4.0.30** | Fixes 4.0.29: `npx 0xray wear` and `setup` work outside a git checkout again. They write the 4.0.28 project setup, skip only Cursor hooks, and print one warning. Inside a git checkout they restore the 4.0.28 project setup, and `wear` adds Cursor hooks plus the unwear snapshot. Companion `@0xray/grok-bot` 0.1.8. Released 2026-09-28. |
| **4.0.29** | `npm install` only creates the relative `node_modules/@0xray/repertoire` link to the vendored repertoire and prints `npx 0xray wear`. Run `npx 0xray wear` after install. Wear writes only the consumer project's `.cursor/hooks.json` (installed dist hooks, beside user entries); `npx 0xray unwear` restores the snapshot. Companion `@0xray/grok-bot` 0.1.8. Released 2026-09-28. |
| **4.0.28** | MCP servers start through `scripts/node/mcp-launch.cjs` and only see PATH, HOME, XRAY_ROOT, plus names on their keep list. Tokens such as NPM_TOKEN are not inherited. User env values stay out of argv. Postinstall keeps user edits to AGENTS.md, .mcp.json, and opencode.json. `house init` does not copy EXAMPLE.md; doctor FAILs while `house/EXAMPLE.md` exists. Inspect adds a machinePlugin check. The Cursor hook defaults XRAY_ROOT to the suit. Companion `@0xray/grok-bot` 0.1.7. Released 2026-09-27. |
| **4.0.27** | Host compact proof needs a generation id and a numeric usage percent, and the same preCompact receipt is mirrored to nested consumer wear roots. Memory scoring: [docs/memory-scoring.md](docs/memory-scoring.md) (orchestrator links it). Companion `@0xray/grok-bot` 0.1.6: general page vs `house/` overlay, `templates/house/`, `grok-bot house init`, doctor `GROK_BOT_HOUSE` or walk-up. Released 2026-09-26. |
| **4.0.26** | A lesson is stored when the task matches no signal. A Cursor compact cut is proved with a session log and a per-session receipt. |
| **4.0.25** | Plate schematics ship in the package. A worn suit resolves them from `dist/integrations/hooks/plates.cjs`. |
| **4.0.24** | Compaction and a host change are the same cut. The station card is the handoff. Repertoire in that suit is 0.2.8. |
| **4.0.23** | The Dynamo client starts when external governance is required. Proposals score locally when that governance is off. |
| **4.0.22** | The stamper strips present-tense patch pins from shipped prose. The cursor gate follows the suit mill. |
| **4.0.21** | Dest is named laws, not hangar slugs. Cleanup heat grows the project copy when Repertoire is on. |
| **4.0.20** | Heat grows the project copy. Session boot rewrites when HEAD moves. |
| **4.0.19** | Vendored Repertoire 0.2.5. Wear replaces older leftovers. |
| **4.0.18** | Wake heat joins bookmark, index, and mind. |
| **4.0.17** | Cursor heat writes session files when HEAD moves. |
| **4.0.16** | `npx 0xray validate` is a wear check. |
| **4.0.15** | Fasten is **foundry-plant/0**: builtin plant is mill+inspect only. `foundry.json` `"plant": "@0xray/blip"` (aliases `"plant": "blip"` / `"plant": "sound"`) fastens whatever that mill declares (looker / vibe / mixer live in the mill). Nested mill `@0xray/foundry@0.1.12`. CLI shims `foundry blip\|sound` remain (0.1.11+). Shop plant first-class (`shop-extract`, `shop-witness`, `shop-pin` + `foundry.json` `shopPlant`). |
| **4.0.14** | Factory-blip beds stamp the hook cell and keep six tellable bodies. |
| **4.0.13** | Station PreCompact merge keeps custom STATION.md keys. |
| **4.0.12** | Project-scoped Grok plugin dest so multi-seat wear does not clobber the machine plugin. |
| **4.0.11** | The npm pack includes `.grok-plugin/` so the Grok marketplace manifest ships. |
| **4.0.10** | Version bump. |
| **4.0.9** | Mill target: postinstall does not mill npm global prefix or `_npx` as a consumer. Isolated HOME skips machine `~/.grok`. |
| **4.0.8** | Confer abstains locally instead of rubber-stamping a proposal. |
| **4.0.7** | Nested mill 0.1.9. Inventory writes `dna`. The mill does not mint on chain. |
| **4.0.6** | Nested mill 0.1.8. Isolated HOME skips machine Hermes and OpenClaw. |
| **4.0.5** | Inspect is a mill command. A costume dump fails mint. Mill plant stays mill + inspect. |
| **4.0.4** | Mill fastens an inspect suit. Costume is opt-in with `foundry.json` `"costume": true`. |
| **4.0.3** | Their plant is the suit. The mill plant is the factory discipline on the hanger. |
| **4.0.2** | The nested mill ships in the 0xray tarball. `@0xray/foundry` stays the standalone mill CLI. |
| **4.0.1** | CLI `--version` no longer dumps a Commander stack. The release gate smokes the organ and does not run another publish from a lifecycle script. |
| **4.0.0** | Exo + temperament. Constitution always on; ceremony by host. Repertoire organ on (vendored 0.2). Station card survives compact/host-swap. **On npm.** [vision](docs-site/docs/architecture/v4-vision.md) · [now](docs-site/docs/architecture/v4-now.md) |
| **3.4.1** | Unified `install-bridges.cjs` on postinstall — OpenCode, Grok, Hermes, OpenClaw in one pass. All 7 MCPs servers via `npx -y 0xray mcp <cmd>` (no `dist/` paths). Canonical `release.mjs` pipeline. |
| **3.3.1** | Orchestrator confidence gate wired into execution planning. |
| **3.3.0** | Pluggable **Memory Routing** (`features.json` → `memory_routing`). Repertoire is the default provider in the framework repo. |
| **3.2.0** | Typecheck hardening (58 errors fixed), orphan cleanup (5 deleted / ~39 integrated), full pre-tool-use hook, SelfProposalEngine + AsideContext restored, Hermes E2E 44/0/0, Grok CLI E2E green. |
| **3.1.1** | StringRay → **0xRay** rename. Marketplace files (`.mcp.json`, `.grok-plugin/plugin.json`). Postinstall ships `AGENTS.md`, `SKILLS.md`, `.gitignore.default`. ConfigLoader `mcpServers` format. |
| **3.1.0** | Pre-publish guard tolerates missing `features.json`. |

### Consolidations

- **Install, then wear, then setup where needed** — `npm install` runs `postinstall.cjs`, which writes nothing and prints one line: `npx 0xray wear`. `wear` and `unwear` set up or remove the Cursor suit. `npx 0xray setup` writes `.mcp.json` and the OpenCode, Grok, Hermes, and OpenClaw bridges (`install-bridges.cjs`); git hooks only with `--git-hooks`. Mill target is the consumer project, not npm global prefix or `_npx`.
- **7-server MCP surface** — `.mcp.json` SSOT; Grok plugin and all bridges share `XRAY_MCP_SERVERS`.
- **Dev vs consumer AGENTS** — `AGENTS.md` (framework) vs `AGENTS-consumer.md` (copied to consumer projects on install).
- **Release pipeline** — `npm run release:patch|minor|major` → reconcile → gate → artifacts → tag → publish.

### Removals / Deprecations

- **StringRay / strray-ai** branding retired (3.1.1).
- **`hermes bridge`** CLI removed — use `npx 0xray hermes install`.
- **`.opencode/xray/` fallback** removed from auto-reflection-generator (3.1.1).
- **~180 stale `@version` JSDoc tags** and **"xray 2.0" command doc strings** cleaned (3.2.0).
- **`advanced-features/`** removed. The live Grok hook is `pre-tool-use.js`.
- **PostProcessor** soft-deprecated since 3.0 (`enablePostProcessor: false` default).

## Three-Subsystem Architecture

```
┌─────────────────────────────────────────────────┐
│ Inference │
│ Proposals · Reflection · Memory routing │
├─────────────────────────────────────────────────┤
│ External Governance (Dynamo) │
│ Codex enforcement · Resonance/Isotopic · SSOT │
│ 3 deliberation MCPs: code-review, security, │
│ researcher (within 7-server consumer surface) │
├─────────────────────────────────────────────────┤
│ Autonomous Engine (thinDispatch) │
│ 7-flow · AsideContext · Confidence gate │
└─────────────────────────────────────────────────┘
```

- **Inference** — proposals, reflection, execution planning. Optional memory-routing enrichment (v3.3).
- **External Governance** — Dynamo Solar SSOT; CodexPolicyService; weighted PHI/TAU deliberation.
- **Autonomous Engine** — thinDispatch 7-flow routing; orchestrator confidence gate (v3.3.1).

## Consumer Install (wear)

`npm install 0xray` links the vendored repertoire and prints `npx 0xray wear`. Wear then:

1. Copies **`AGENTS-consumer.md` → `AGENTS.md`**. Does **not** write consumer-root **`SKILLS.md`**.
2. Fastens **mill plant** (`mill` + `inspect`). Fasten is **foundry-plant/0**: builtin plant is mill+inspect only. `foundry.json` `"plant": "@0xray/blip"` (aliases `"plant": "blip"` / `"plant": "sound"`) fastens whatever that mill package declares — organs (looker, vibe, mixer) live in the mill, not an xray catalog. Nested mill `@0xray/foundry@0.1.12`. CLI shims `foundry blip|sound` still exist on foundry 0.1.11+; fasten is the new cut. Not a 45-skill / 42-agent costume dump. `foundry.json` `"costume": true` is the opt-in dump.
3. Seeds **`.gitignore`** from `.gitignore.default` (if absent)
4. Deploys **`.xray/`** config (`codex.json`, `features.json`, `config.json`) then overlays **their** plant
5. Writes project **`.mcp.json`** with 7 MCPs servers (`npx -y 0xray mcp …`)
6. Installs **4 chat bridges**: OpenCode, Grok, Hermes, OpenClaw, plus **Cursor** `.cursor/hooks.json` (PPE + wiring; mill plant, not costume)
7. Factory shop plant (`shop-extract`, `shop-witness`, `shop-pin` from groover-hangar) may coexist when worn. Extra shops: `foundry.json` `shopPlant`. Not costume.
8. Inside a git checkout, fastens Cursor `.cursor/hooks.json` and the hook scripts, and keeps an unwear snapshot. Outside a git checkout, skips those hooks and prints one warning. `npx 0xray setup --git-hooks` is what installs git hooks.

See [llms.txt](llms.txt) for the agent map. Catalog of 45 skills lives in [SKILLS.md](SKILLS.md) — that is the exo catalog, not default consumer wear.

## Seven MCP Servers (consumer)

All registered via `npx -y 0xray mcp <cmd>` — no brittle `dist/` paths:

| Server | Command | Role |
|--------|---------|------|
| `xray-governance` | `mcp governance` | Proposal governance, codex snapshot, quality gates |
| `xray-skills` | `mcp skills` | 45 knowledge skills + skill invocation |
| `xray-orchestrator` | `mcp orchestrator` | Complexity analysis, lead-dev plan, task delegation |
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

## Memory Routing + Repertoire (preferred, v3.3+)

**Wear Repertoire.** It is the long-term judgment organ. Station holds the ticket across compact. Dest is named invariants, not keywords. Pluggable `memory_routing` in `features.json` (validated by `features.schema.json`) ships **on**:

```json
"memory_routing": {
 "enabled": true,
 "provider": "repertoire",
 "module_path": "node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js",
 "config": {
 "signalsPath": ".xray/state/repertoire/curated_signals.json",
 "statePath": ".xray/state/repertoire/inference-state.json",
 "feedbackDir": ".xray/state/repertoire/feedback"
 }
}
```

| Integration | What it does |
|-------------|--------------|
| **ExecutionPlanner** (v3.3.1) | `getTaskConfidence()` → complexity boost, trap hints, signal-aware `selectAgent()` |
| **thinDispatch** | Nucleus `scoreAndRoute()` (`0xray/nucleus`); memory provider `resolveThinDispatch()` when routing enabled |
| **Researcher** | `researcher-confidence.ts` appends `MEMORY_ROUTING:` block to governance output |
| **AsideContext** (v3.2) | `buildInheritedContext` → `inheritedContext.memoryRouting` on orchestrator `spawnAside` |
| **Feedback** | Per-task `ingestFeedback()` closes the learning loop |

**External hosts** (Hermes/Grok): add `repertoire-mcp` to `.mcp.json` — see Repertoire docs. Preferred. Not optional flavor.

Explicit opt-out only: `"memory_routing": { "enabled": false, "provider": "repertoire" }`.

Docs: [memory routing](docs-site/docs/guides/memory-routing.md) · [Repertoire](docs-site/docs/guides/repertoire.md) · [features.json](docs-site/docs/guides/features-json.md) · [all features since 3.1](docs-site/docs/guides/features-since-3.1.md)

## Integrations

| Platform | Install | What that command writes |
|----------|---------|----------------------|
| **OpenCode** | `npx 0xray opencode install` | Merges `opencode.json`, copies agent YML surfaces |
| **Grok CLI / Build** | `npx 0xray grok install` | Project `.grok/plugins/0xray` (shared HOME does not clobber machine plugin), 7 MCPs servers |
| **Hermes Agent** | `npx 0xray hermes install` | `~/.hermes/plugins/xray-hermes`, consumer root marker |
| **OpenClaw** | `npx 0xray openclaw install` | `.xray/config/openclaw.json`, skill sync |
| **Cursor** | `npx 0xray wear` inside a git checkout | Fastens `.cursor/hooks.json` + relative `.cursor/hooks/*.sh`. Rewrites leftover env-assignment one-liners. Not a fifth chat TUI. |

## Governance & Codex

- **70 terms** in `.xray/codex.json` — core, architecture, testing, performance, security, operations, governance (Codex 69: no new MCP/skill/handler surface; Codex 70: current copy before edits)
- CodexPolicyService — Governance-owned SSOT for codex loading
- Pre-governance gate blocks non-compliant proposals
- Active codex snapshot via `get_active_codex` MCP tool
- frameworkLogger structured logging (never `console.*`)

## Testing

| Suite | Status |
|-------|--------|
| Four-floor consumer e2e | OpenCode 34/0 · Grok 63/0 · Hermes 39/0/2 · OpenClaw 96/0/1 |
| Consumer smoke | `npm run release:gate` — pack → clean install → 7 MCPs + 4 chat bridges + Cursor hooks + organ on |
| Pack → tmp proof | `npm run pack:tmp-proof` — tgz install + `foundry mint --skip-live` + hangar shops + inspect (no costume dump). Playwright n/a (CLI). |

```bash
npm test
npm run pack:tmp-proof # pack → tmp fasten + hangar inspect
npm run release:gate # full release gate (before upload)
npm run release:npm # gate + prepare + npm publish --access public
```

## Release

The **4.0** line is on npm. Do **not** run `release:major` to ship a 4.x fix (that becomes 5.0.0). Do **not** put a `scripts.publish` lifecycle that re-runs the gate after the registry PUT. Patch number lives in `package.json` + CHANGELOG.

```bash
npm run release:gate
npm run release:npm # after gate is green; uses npm publish --access public
npm run release:patch # version bump pipeline (not for an already-bumped package.json)
```

Pipeline: reconcile-version → release-gate (build + test + consumer smoke) → CHANGELOG/README/AGENTS artifacts → commit → tag → npm publish.

## License

MIT — see [LICENSE](LICENSE)

---

*xray — MCP-centric, governed, autonomous. Pure v2 three-subsystem.*