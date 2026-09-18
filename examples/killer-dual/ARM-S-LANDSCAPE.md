# ARM-S landscape digest — Blaze stack (main thread)

**Arm:** S (suited) · **bc-id:** `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe` · **home:** `0xRayAI/xray@6fd253d80` (PR #52 merged: host-fire-4 precompact) · **cloned siblings into VM** `/tmp/blaze-stack/` — not a multi-repo Cursor env.

Digests below are from files Read this run, not a subagent loop.

## 1. 0xRayAI/xray (home)

Factory OS, **4.0.13**. Three-subsystem: Inference · External Governance (Dynamo Solar SSOT, 69-term Codex) · Autonomous Engine (thinDispatch 7-flow, AsideContext, confidence gate).

- Consumer plant is **mill + inspect**, not a 45-skill costume (`AGENTS.md`, `scripts/foundry/plant/skills/{mill,inspect}/SKILL.md`). Shop plant (`shop-extract`, `shop-witness`, `shop-pin`) is first-class with mill; extra shops via `foundry.json` `shopPlant`.
- Seven MCPs (`npx -y 0xray mcp …`). Repertoire is an extra host MCP, **not** an 8th `xray-*`.
- Cursor adapter: `.cursor/hooks.json` (version 1) → `preToolUse` / `preCompact` / `afterFileEdit` via `.cursor/hooks/invoke-probe.sh`. **No `sessionStart`** (managed cloud does not fire it). `preCompact` is observational.
- Compact series: `examples/cursor-cloud-compact/`. HOST-FIRE #1–#4 all `cursor-host-precompact-FAIL`. #4 (`RECEIPT-HOST-PRECOMPACT-4.md`) had `hooks-at-boot: YES`, live `preToolUse`, a context-constraints summary, and **still no host `preCompact`**. Next lever recorded there: do **not** run another blind FILL; FILL was chars÷4 against a guessed 128k window (~22.8% of 500k).
- Memory routing SSOT: `xray/features.json` → `memory_routing.provider: repertoire`, module `node_modules/@0xray/repertoire/dist/provider/memory-routing-provider.js`. Organ vendored at `vendor/@0xray/repertoire/` (v0.2.0, 8 factory signals); `scripts/node/wear-vendored-repertoire.cjs` materializes the npm path (this run wore it).
- Open GitHub issue on xray: #2 website links (unrelated). Compact track lived in PRs #45–#52 receipts, not an issue SSOT.

## 2. Clearing / hangar shops

**Reachable.** Cloned `htafolla/clearing` (depth 1). Live health:

- `https://clearing.rippel.ai` → `{"status":"healthy","server":"clearing","version":"0.1.0","tools":5,"signer":"zigzag"}`
- `https://clearing-production-9968.up.railway.app/` → same JSON (hangar host)

Product: Grok skill + product MCP named **`clearing`** (never `xray-clearing`). Pays only **live** x402; sells one metered artifact: receipted web extract. Not a wallet, chain, token, faucet, or mill plant. Constraints (`CONSTRAINTS.md`): wear `npm i 0xray` as garment; do not vendor Clearing into the 0xray tarball; keys stay on the rail.

Hangar shops (from Groover plant, live URL on Clearing):

| Shop | Price | URL |
|------|-------|-----|
| `shop-extract` | $0.02 USDC Base | `GET …/v1/extract?url=` — hashed page text, not a paraphrase |
| `shop-witness` | $0.02 | proof of a GET (status, type, sha256, bytes) |
| `shop-pin` | $0.01 | pin live ERC-8004 identity card |

Unpaid GET → 402. ZigZag `sign_x402` `approved=true`. Hosted `/sign` is **410**. grok.com cannot pay (no `~/.ows`). Plant: `npx groover-hangar`. This Arm S run did **not** pay a shop (no OWS in the cloud VM).

## 3. Groover / hangar plant

**Reachable.** Cloned `htafolla/groover`. MCP agent registry + cross-correlation engine. Synthesized from chrono-warp-drive, agent-marketplace-starters, zigzag, and 0xRay MCP.

- Register + `mint_suit`: `POST https://registry-production-e2c4.up.railway.app/mcp`
- Factory UI: `https://website-production-c0da.up.railway.app/suit`
- Hangar x402 shops as above. Identity: DID + Ed25519; Dynamo solar hammer for live mint/mirror.
- Packages in-tree: `core`, `chrono`, `identity`, `marketplace`, `xray`, `agentuimanifest`.
- xray mill already treat those three shops as factory shop plant (inspect does not call them costume).

**groofer** (`htafolla/groofer`) is the earlier spelling; same synthesis story minus “0xRay MCP” in the blurb. Not the live plant.

## 4. `@0xray/grok-bot` kit (`grok-bot/` in home)

In-repo kit **0.1.2** (`grok-bot/package.json`). Orchestrates; does not vendor the OS.

Path per agent (skills): fasten mill+inspect → Groover register/mint/pin → OWS pay → plant hangar shops. Ops catalog: `ops/OPS-CATALOG.md`. Cloud continuity: implementer (forge) owns eng clouds; coordinator does not launch them. Survive-compact skill: disk STATION beats chat; Grok Bot **chat** does not fire PreCompact/Repertoire — do not invent a fake PPE floor there.

Plant pins in kit (monitor): `0xray@4.0.15` · `@0xray/foundry@0.1.11`.

## 5. ZigZag / Dynamo / Chrono

| Organ | Reach | Note |
|-------|-------|------|
| **ZigZag** | **MISS as a public repo** (`gh repo view htafolla/zigzag` and `0xRayAI/zigzag` both 404) | Live **signer** on Clearing health JSON (`"signer":"zigzag"`). Hangar skills: `sign_x402` with `approved=true`; hosted `/sign` **410**. Groover research corpus describes it as non-custodial BIP-39 + x402, never auto-sign. |
| **Dynamo** | **Partial** — no `htafolla/dynamo` repo | **chrono-warp-drive** README *is* Dynamo v5.1 Temporal Resonance Engine (solar-bound governance: PASS / NEEDS_REVISION / REJECT). `htafolla/dynamo-news` is the X briefing consumer of `govern_with_solar`. xray Codex SSOT is “Dynamo Solar” by name. |
| **Chrono** | **Reachable as a package + as chrono-warp-drive** | Groover `@groover/chrono` (`packages/chrono`, v0.1.0-mvp): time-decay modulated by Dynamo harmonic `P_o ≈ 0.9508`. Standalone `htafolla/chrono` repo **MISS**. |

## 6. Repertoire (organ on in 4.0)

Vendored factory seed **8 signals** (`attestation-as-map`, `consumption-boundary-revalidation-gate`, …). This Arm S run fastened:

- vendor: `/workspace/vendor/@0xray/repertoire` (realpath of npm dest)
- npm: `/workspace/node_modules/@0xray/repertoire` `@0xray/repertoire@0.2.0`
- provider: `dist/provider/memory-routing-provider.js` present
- signals: `data/curated_signals.json` present (8)

Sibling clone `0xRayAI/repertoire` also pulled to `/tmp/blaze-stack/repertoire` for README parity (same 0.2.0 organ).

## 7. Gap that matters

HOST-FIRE #4 proved hooks bind and `preToolUse` spawns; the host still does not emit `preCompact`. Usage “proof” was **chars÷4 FILL**, which this ticket forbids. Cursor Cloud MCP `run-info` / `get-events` expose **model + bc-id + timestamps**, not `context_tokens`. The suit had no mill-grade receipt that (a) counts host `preCompact` from invoke-probe only, (b) accepts only real usage fields, (c) records repertoire heat. That is the killer feature.
