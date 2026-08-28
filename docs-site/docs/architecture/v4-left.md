---
sidebar_label: 4.0 left
---

# 4.0 left

What is **done on the plant** vs what is **still open**. Vision: [4.0 vision](./v4-vision.md). Handoff: [4.0 now](./v4-now.md).

**Still in development.** Product **4.0.0** on `feat/v4-temperament`. npm is **3.5.5**. Do not merge to `main`, do not tag, do not `npm publish` until leaving dev. Do not run `release:major` (that becomes 5.0.0). Push feat only when asked.

## Done (worn, not shipped)

| Piece | Where |
|---|---|
| Constitution on four floors | Grok, OpenCode, Hermes, OpenClaw — one SSOT gate |
| Temperament | `frontier` / `guided` / `strict` / `auto`. Missing key stays guided |
| Stranger-install wear | pack → isolated install → Codex 11 blocks. Ephemeral e2e does not clobber machine markers |
| Repertoire unprefix | companion `feat/mcp-unprefix`. Grok TUI sees `repertoire__*` |
| Enable-when-resolves | leftover `memory_routing` default-off turns on only if the module is actually there. Explicit opt-out kept |
| Station card | `.xray/state/STATION.md` from `session-boot.json`. Intent, git, plan, host, Repertoire. Host change stamps `hotSwap` |
| Compact persist | Grok `PreCompact` / `PostCompact` rewrite the card. SessionStart stdout is ignored — disk is the contract |
| Kernel copy | exo / survive the window, not 42/45/7 |
| Proof last pass | temperament-live green; consumer smoke green; vitest 3423 passed (one researcher smoke flake under parallel load, green alone) |

HEAD: `76b13e414`. Repertoire HEAD: `4e1e05f` on `feat/mcp-unprefix`.

**Not 0xRay bugs:** Zen 429, glm billing, xAI chat key, `hermes update` 17k commits, OpenCode 1.17 vs 1.18.

## Left — proof (the cut)

The job is hot-swap / multiplicity. A stranger’s proof is: **compact or change host, and the work is still moving.**

1. **Live compact.** `/compact` (or auto-compact) on a worn Grok floor. First move after the cut: Read `.xray/state/STATION.md`. Intent and git still match. Do not restart the job.
2. **Live host swap.** Same repo on OpenCode or Hermes or OpenClaw. Card shows `Hot-swap: grok → …`. Continue, do not cold-start.
3. **Isolated HOME host e2e.** Hermes / OpenClaw / OpenCode in a throwaway `HOME`. Do not rewrite machine `xray-consumer-root.txt`.

Until (1) and (2) have been *done*, not unit-tested, do not tell a stranger the switch is on.

## Left — product gaps

These are why the card is not yet a finished bus.

- **Grok does not inject the card.** AGENTS.md says Read it. Project rules survive compact. If the model skips the Read, the cut is still cold.
- **Repertoire is present, not harnessed as working state.** This checkout: `Repertoire: present, memory_routing off — 188 signals`. Signals are not the session’s memory. Auto-enable only fires when leftover default-off meets a resolvable module at deploy — `.xray/features.json` here is still off.
- **Plan line is empty unless a lead-dev plan exists.** Intent comes from the last captured prompt. No plan file → `Plan: (none)`.
- **OpenClaw heat is install/init + gate, not every session-start.** Grok/Hermes/OpenCode write more often.
- **Two feat branches.** `feat/v4-temperament` and repertoire `feat/mcp-unprefix` are not on `main`. A stranger `npm i 0xray` still gets 3.5.5.

## Left — ship (only when leaving dev)

1. Merge `feat/v4-temperament` → `main`.
2. Merge repertoire `feat/mcp-unprefix` → `main`.
3. Tag `v4.0.0`.
4. `npm publish` 4.0.0 — **not** `npm run release:major`.
5. Confirm `npm view 0xray version` is `4.0.0`.
6. Mark [4.0 now](./v4-now.md) shipped.

## Do not

- 8th MCP / new skill / new handler (Codex 69)
- Thicken the Grok exo
- Re-litigate Zen pickle or `hermes update`
- Dump Bedrock content into the suit
- Treat unit tests of `STATION.md` as the stranger demo

## One line

**Card is written. Cut is not yet proven in the wild. npm is still 3.5.5.**
