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

`npm install 0xray` **copies the 0xRay garment** and **generates host wiring**. It does not mint agents/skills/codex from the consumer's code. Their repo is a hanger (root path, merge-safe JSON, git hooks).

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

That is mill **wear**, not mill **mint-from-their-SSOT**. The product gap is the second one.

## Mills (inventory)

### 1. Release / version / docs stamp

Canonical path: `reconcile-version --apply` → `version-manager --artifacts-only` → `release-gate` → commit → `--verify-only` → PUT → tag.

| Piece | Role |
|---|---|
| `scripts/node/reconcile-version.mjs` | **One bumper.** npm + tag vs `package.json` |
| `scripts/node/version-manager.mjs` | Stamper. `--artifacts-only` only (JSON + CHANGELOG). Bump/`--tag` refused |
| `scripts/node/release.mjs` | Canonical conductor (reconcile → artifacts → gate → PUT → tag) |
| `scripts/node/release-gate.mjs` | Build, test, **docs**, smoke. `--verify-only` is the post-push path |
| `scripts/node/validate-release-docs.mjs` | Read-only freshness (kernel header, CHANGELOG top, counts) |
| `scripts/node/pre-publish-guard.js` | Git + reconcile |
| `scripts/node/prepare-consumer.cjs` | Tarball path rewrite (not version) |

**Museum (frozen, still on disk):**

- `universal-version-manager.js` — writes short-circuited
- `sync-versions.mjs`, `release.js` — deprecated wrappers
- `release:npm` — gate + PUT, no bump (use after reconcile, or use `release.mjs`)
- `publish.yml` — extra GHA door; now runs the docs mill before PUT

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

**Not minted from their repo.** `SKILLS.md` is **not** written to the consumer root (docs claim it is).

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

Do not publish `@0xray/foundry` tonight. Do not add a mill MCP. Name, then cut conductors that cross the line.

1. **Name (this page).** Exo stays thin. Mill stays scripts + templates.
2. **One bumper — landed.** `reconcile-version` only. `version-manager` refuses bump/`--tag`. UVM writes stay short-circuited. `executeReleaseWorkflow` is blocked.
3. **Docs mill — landed.** CI **verifies**; it does not rewrite prose. Kernel slogan is era (`4.0`). CHANGELOG is the only patch-versioned prose (`[Unreleased]` allowed above current).
4. **Mint honesty.** Postinstall copies **our** garment. A later mill that mints from *their* SSOT is a product, not a stamper.
5. **Processors.** Do not move ProcessorManager into the Grok exo. Do not call it the OS. Optional later: slim OpenCode/Hermes so constitution is the only pre-tool path on every floor.
6. **Museum — in progress.** UVM file remains frozen. CI mill workflow is on `main`. `features-since-3.1` no longer requires the patch string.

Order: (2) and (3) make 4.0.x ships cheap. (4) is the foundry product. (5)–(6) are trim.

## Not this mill

- Grok Bot as a fifth floor (no PreToolUse deny — not wear).
- An agent that “updates all the docs.”
- An 8th `xray-*` server.
- `release:major` (that is 5.0.0).
