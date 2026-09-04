---
sidebar_label: 4.0 foundry
---

# 4.0 foundry — mill vs exo

The suit is what an agent **wears**. The foundry is how a team **gets** a suit.

4.0 shipped **wear**. The mill that cut that garment has been in this repo the whole time, unpublished as a product. This page is the inventory. It is not a new MCP, skill, or handler.

Vision: [4.0 vision](./v4-vision.md). Handoff: [4.0 now](./v4-now.md). Open list: [4.0 left](./v4-left.md).

## Law

| | **Exo (worn)** | **Foundry (mill)** |
|---|---|---|
| When | Every tool call, compact, host swap | Install, mint, stamp, gate, publish, attest |
| What | Constitution, temperament, 7 MCP, station, thinDispatch, Repertoire muscle | Bridges, templates, version, changelog, docs facts, pack, smoke |
| Who | The model on the job | The team that wants an OS on a repo |
| Failure if confused | Thick exo, agents nuke README, ceremony fights the host | Magic stays internal; strangers get a copy of *our* suit |

**Do not extract constitution with the mill.** `evaluatePreToolGate` is PPE. `install-bridges.cjs` is the hanger.

**Codex 69.** Naming the mill is not a new surface. A fifth CLI (`0xray foundry`, `0xray grokbot install`) would be.

## What a stranger actually gets

`npm install 0xray` **copies the 0xRay garment**, **generates host wiring**, then **overlays their mill SSOT** onto the hanger: constitution (`xray/codex.json`), features/temperament (`xray/features.json`), config, skills, agents. Remap with `foundry.json`. PPE stays worn. Their repo is a hanger cut to their params.

```
npm i 0xray
  → postinstall.cjs
      → AGENTS-consumer.md → AGENTS.md (if managed)
      → .gitignore merge
      → installAllBridges()
          → .xray/ from xray/ templates (merge; leftover temperament stays guided)
          → generated .mcp.json (7 × npx 0xray mcp)
          → four floors: OpenCode, Grok, Hermes, OpenClaw
```

Wear copies the garment. Overlay mints constitution, features, skills, and agents that already exist in their tree. The mill does not invent skills from source. Nested mill lives at `scripts/foundry/` inside the **0xray tarball** (postinstall + CLI re-wear `require` it). `npx @0xray/foundry mint` is the standalone mill CLI and reapplies overlay without re-wearing bridges.

## Mills (inventory)

### 1. Release / version / docs stamp

Canonical path: `reconcile-version --apply` → `version-manager --artifacts-only` → `release-gate` → commit → `--verify-only` → PUT → tag.

| Piece | Role |
|---|---|
| `scripts/foundry/reconcile-version.mjs` | **One bumper.** npm + tag vs `package.json` |
| `scripts/foundry/version-manager.mjs` | Stamper. `--artifacts-only` only (JSON + CHANGELOG). Bump/`--tag` refused |
| `scripts/foundry/release.mjs` | Canonical conductor; `--publish-only` is the old `release:npm`. Live run needs `--i-mean-it` or `FOUNDRY_RELEASE=1` |
| `scripts/foundry/release-gate.mjs` | Build, test, **docs**, smoke. `--verify-only` is the post-push path |
| `scripts/foundry/validate-release-docs.mjs` | Read-only freshness (kernel header, CHANGELOG top, counts) |
| `scripts/foundry/ci-monitor.mjs` | GitHub Actions report (`npx @0xray/foundry ci`). No auto-push |
| `scripts/foundry/hooks.mjs` | Install git pre/post hooks (`npx @0xray/foundry hooks`). Dogfood `scripts/hooks`; published mill uses `node_modules/0xray/scripts/hooks` |
| `scripts/foundry/docs-build.mjs` | Docusaurus build on the 0xray exo (`npx @0xray/foundry docs-build`) |
| `.github/workflows/mill-ci.yml` | Mill gate on `main`: typecheck, lint, mill tests, build, curated tests, consumer smoke, Docusaurus |
| `.github/workflows/deploy-docs.yml` | Mill Pages put |
| `scripts/node/pre-publish-guard.js` | Git + reconcile |
| `scripts/node/prepare-consumer.cjs` | Tarball path rewrite (not version) |

**Mill home:** `scripts/foundry/` (`@0xray/foundry`, publishable). Old `scripts/node/*.mjs` paths are shims. Mill root is `FOUNDRY_ROOT` or cwd.

**Museum:**

- `sync-versions.mjs`, `release.js` — deleted
- `publish.yml` — extra GHA door; docs mill runs before PUT

**Live vs archive docs:** Docusaurus `docs-site/docs/` is live; `docs-site/docs/archive/**` is excluded from the build. Kernel headers are era (`**4.0** — a suit that survives the context window`). Patch lives in CHANGELOG + `package.json`.

### 2. Consumer mint / four-floor hangers

| Piece | Role |
|---|---|
| `scripts/node/postinstall.cjs` | Entry. Consumer vs dogfood |
| `scripts/node/install-bridges.cjs` | Unified 4-floor copy + hook patch |
| `scripts/node/bridge-mcp-wiring.cjs` | Generated MCP / Hermes yaml / OpenClaw hooks |
| `src/cli/commands/{grok,hermes,opencode,openclaw}-install.ts` | Idempotent re-wear |
| `src/cli/commands/skill-install.ts` `syncBuiltinSkills` | Copy 45 `SKILL.md` into host skill dirs |
| `AGENTS-consumer.md` | Slim card copied to consumer `AGENTS.md` |
| `xray/{codex,features,config}.json` | Plant templates → consumer `.xray/` |

**Copied garment:** YML agents, skills, Codex, features, Grok `hooks.json` template, Hermes plugin tree, OpenClaw pre-tool plugin.

**Generated wiring:** `.mcp.json`, hook command strings with `XRAY_AI_PATH`, consumer-root markers, Repertoire enable-when-resolves.

**Minted from their tree (overlay).** Default SSOT: `xray/codex.json`, `xray/features.json`, `xray/config.json`, `src/skills/<name>/SKILL.md`, `src/opencode/agents/*.yml`. Postinstall copies those onto `.xray/` and **project** skill hangers (`.opencode/skills`, project `.grok/plugins/0xray/skills` if present). JSON facets always merge (mill-fill). YML agents are the OpenCode hangar. Mill-managed `AGENTS.md` overlays from `xray/AGENTS.md`. `foundry.json` remaps paths only. CLI re-wear mints once after mill copies. `SKILLS.md` is still **not** written to the consumer root. Inventory garment is `overlay` when any facet came from their tree, else `copied-onto-hanger`. Dogfood writes no inventory.

### 3. Pre / post processors (two stacks)

**Constitution is not a processor.** Live deny is `evaluatePreToolGate` (`src/nucleus/delegation-gate.ts`).

| Stack | Where it runs | Foundry or exo |
|---|---|---|
| Grok PreToolUse / PostToolUse / SessionStart / compact | `src/integrations/grok/hooks/*.js` | **EXO** |
| Station heat | `station-hook-runtime.cjs` | **EXO** |
| `grok_postprocessor_light` | Grok PostToolUse write tools | **EXO light** (not constitution) |
| ProcessorManager (25 implementations) | OpenCode plugin + Hermes `pre-process`/`post-process` | **Worn mill catalog** on those floors; Grok live hooks do **not** run this loop |
| `enforcement-gate.ts` ValidatorRegistry | Public API / e2e | **Not** the OS gate |
| Git pre-commit / post-commit | `scripts/hooks/` | **EXO git**, installed by mill |
| `inference/session-capture.ts` | post-commit | **EXO git** |
| `hooks.json` template + `patchGrokHooks` | postinstall | **FOUNDRY** |

If you extract the mill and leave exo: already-worn machines keep denying `any`. New `npm i` stops pinning `.grok/hooks/0xray.json`.

If you extract exo with the mill: mill still copies a costume; the host fail-opens.

### 4. Inference plant, organ, attest

| Surface | Mill | Exo |
|---|---|---|
| Inference engine | `src/inference`, `inference:run` (0xRay package only) | `.xray/inference/*` heat (**gitignored**) |
| Organ | `vendor/@0xray/repertoire`, postinstall enable, MCP launcher | `memory_routing` + `.xray/state/repertoire/` |
| Suit attest | `vendor/.../verify-*-suit.mjs`, `scripts/mjs/verify-*`, `release-gate` | worn `.xray` + 7 MCP + 4 bridges |
| Agents/skills SSOT | `src/opencode/agents/*.yml` (42), `src/skills/*/SKILL.md` (45) | `.opencode/`, host skill dirs |
| Config | `xray/*.json` | `.xray/*.json` (runtime reads only this) |

TS `AGENT_REGISTRY` is a parallel mill muscle. It is **not** checked against YML. Drift risk.

## Split (surgical — not a rebuild)

Do not add a mill MCP. Name, then cut conductors that cross the line. `@0xray/foundry` is the mill package (independent version, not 0xray's).

1. **Name (this page).** Exo stays thin. Mill stays scripts + templates.
2. **One bumper — landed.** `reconcile-version` only. `version-manager` refuses bump/`--tag`. UVM writes stay short-circuited. `executeReleaseWorkflow` is blocked.
3. **Docs mill — landed.** CI **verifies**; it does not rewrite prose. Kernel slogan is era (`4.0`). CHANGELOG is the only patch-versioned prose (`[Unreleased]` allowed above current).
4. **Mint-from-their-SSOT — overlay (landed).** Consumer postinstall writes `.xray/foundry-inventory.json` from **their** `package.json`, fills `{{CONSUMER_NAME}}` on the managed AGENTS card, then overlays constitution, features, skills, and agents from their plant (or `foundry.json` paths). Mill-fill is law. Live `npx @0xray/foundry release` is opt-in. Packed mill tarball mint is executed in tests.
5. **Processors.** Do not move ProcessorManager into the Grok exo. Do not call it the OS. Optional later: slim OpenCode/Hermes so constitution is the only pre-tool path on every floor.
6. **Museum.** UVM file is gone. CI mill workflow is on `main`. Wrappers `sync-versions.mjs` / `release.js` deleted. `features-since-3.1` no longer requires the patch string.

Order: (2) and (3) make 4.0.x ships cheap. (4) is the foundry product. (5)–(6) are trim.

## GitHub pipelines — mill vs exo

The mill **plants and gates**. The exo **wears**. GitHub Actions is mill-time.

| Workflow | Owner | Keep? |
|---|---|---|
| `0xRay CI/CD` (`mill-ci.yml`) | **Mill** — typecheck, lint, mill tests, build, curated tests, smoke, Docusaurus | Yes |
| `Foundry mill (version + docs)` | **Mill** — kernel headers + mill tests | Yes |
| `Deploy Docs` | **Mill** — Docusaurus → GitHub Pages | Yes |
| `Foundry mill (CI report)` (`mill-monitor.yml`) | **Mill** — report only, no auto-push | Yes |
| `Enforce AGENTS.md` | **Mill** — consumer card | Yes |
| `Processor Tests` | **Mill CI** of exo processors | Yes |
| `Hermes Plugin Tests` | **Mill CI** of the Hermes floor, path-gated | Yes |
| `Publish to NPM` / `Release` | **Mill** ship doors (`workflow_dispatch`, live `release` opt-in) | Yes |
| `CodeQL` | Mill skip stub (not a scan) | Yes, skip |
| `Code Quality` (`lint.yml`) | Folded into `0xRay CI/CD` | Dispatch-only |
| `Security Audit` (`security-audit.yml`) | Optional weekly mill | Optional |
| `Security Audit` (`security.yml`) | Duplicate | Stay disabled |
| `Security Monitoring Dashboard` | Not mill | Stay disabled |
| `Auto-Report Generation` | Exo inference reports, not mill | Stay disabled |

**Stay exo (not mill, not a fifth CLI):** PPE (`evaluatePreToolGate`), station card, 7 MCP, four-floor live hooks, ProcessorManager, Repertoire routing, inference heat.

## Not this mill

- Grok Bot as a fifth floor (no PreToolUse deny — not wear).
- An agent that “updates all the docs.”
- An 8th `xray-*` server.
- `release:major` (that is 5.0.0).
- Copying a static 3.x landing over the Docusaurus homepage.
