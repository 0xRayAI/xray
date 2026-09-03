---
sidebar_label: 4.0 left
---

# 4.0 left

What is **done on the plant** vs what is **still open**. Vision: [4.0 vision](./v4-vision.md). Handoff: [4.0 now](./v4-now.md). Mill: [4.0 foundry](./v4-foundry.md).

Product **4.0.1** is on npm. Tag `v4.0.1` is on `0xRayAI/xray`. Do not run `release:major` (that becomes 5.0.0). Foundry mill lives in `scripts/foundry/` (`@0xray/foundry`).

## Done (worn and shipped as 4.0.0)

| Piece | Where |
|---|---|
| Constitution on four floors | Grok, OpenCode, Hermes, OpenClaw — one SSOT gate |
| Temperament | `frontier` / `guided` / `strict` / `auto`. Missing key stays guided |
| Stranger-install wear | pack → isolated install → Codex 11 blocks. Ephemeral e2e does not clobber machine markers |
| Factory memory organ | `@0xray/repertoire@0.2.0` vendored (8 seed primitives, no Bedrock). Isolated tarball wears it without `../repertoire`. Extra MCP `repertoire`, not an 8th `xray-*`. |
| Repertoire unprefix | companion `feat/mcp-unprefix`. Grok TUI sees `repertoire__*` |
| Enable-when-resolves | leftover `memory_routing` default-off turns on if the module is actually there (install **and** runtime). Explicit opt-out kept |
| Station card | `.xray/state/STATION.md` from `session-boot.json`. Intent, git, live plan, host, Repertoire working snapshot. Host change stamps `hotSwap` |
| Repertoire working state | `.xray/state/repertoire-working.json` at compact / host-swap / session heat. Card `Working:` line. Routing uses the registry; Bedrock names stay off the card |
| Grok Read contract | AGENTS.md Read. OpenCode injects. Grok does not — do not thicken the exo |
| Framework dogfood wear | `postinstall.cjs` always calls `installAllBridges`; non-consumer path patches `.grok/hooks/0xray.json` and enable-when-resolves |
| OpenClaw session heat | first PreToolUse with a **concrete** session id writes the card (install/init cards with no session id do not skip that heat) |
| Grok hook quoting | `grokHookShellCommand` and the shipped template quote `XRAY_AI_PATH` and the script path (Grok fail-opens if the shell never starts) |
| grok_postprocessor_light | `loadFeatures` forwards the flag; PostToolUse actually runs the light pipeline |
| Project Repertoire toml | `0xray grok install` writes `<project>/.grok/config.toml`, not the package copy |
| Compact persist | Grok `PreCompact` / `PostCompact` rewrite the card. Hermes compact session-start, OpenCode plugin boot, OpenClaw PreToolUse do the same cut. Memory (Working signals + `repertoire-working.json`) survives. SessionStart stdout is ignored — disk is the contract |
| Compact constitution | After the cut, every floor still denies Codex 11, Codex 69 new surface, and destructive `rm -rf /`. Frontier Grok **warns** spawn-without-plan; guided floors **deny**. |
| Live successor | `XRAY_LIVE_SUCCESSOR=1` — Grok `-p`, Hermes `xai-oauth`, OpenCode `run --dir`, OpenClaw gateway `agent --message` each **quoted** Host + Intent from the card. |
| Kernel copy | exo / survive the window, not 42/45/7 |
| Proof last pass | temperament-live green (gateway :18789 HTTP 200). Host e2e: OpenCode **42/0/0**, Grok **64/0/0**, Hermes **42/0/2**, OpenClaw **96/0/1**. Four-floor compact+constitution+memory+live-successor **passed**. All four on xAI OAuth (`xai-oauth` / `xai/oauth` / OpenCode `xAI oauth`). |

HEAD: `feat/v4-temperament` (PR #3). Repertoire factory seed: `htafolla/repertoire#2` (`feat/factory-seed-0.2`, includes unprefix).

**Not 0xRay bugs:** Zen 429, glm billing, xAI chat key, `hermes update` 17k commits, OpenCode 1.17 vs 1.18.

## Proof (the cut) — done on this plant

The job is hot-swap / multiplicity. A stranger’s proof is: **compact or change host, and the work is still moving.**

1. **Live compact — done.** TUI `/compact` on this Grok floor. PreCompact `18:44:37Z` and PostCompact `18:45:43Z` rewrote `.xray/state/STATION.md`. Same session `01a03ecd-…`. Intent clipped (no `<user_query>`). git `feat/v4-temperament@2d43f51`. Same-host rewrite **kept** `hotSwap: opencode → grok`. Successor Read the card; did not cold-start.
2. **Live host swap — done.** Same repo, OpenCode CLI (1.16.2) `opencode run` **Read** `.xray/state/STATION.md` and answered `Hot-swap: grok → opencode` / `Host: opencode (guided)`. Did not cold-start. Intent and git unchanged. Return to this Grok floor stamps `Hot-swap: opencode → grok`.
3. **Isolated HOME host e2e — OpenCode done.** `HOME=/tmp/xray-isolated-home-*` `test-opencode-e2e.mjs` **42/0/0** on local `0xray-4.0.0.tgz`. Machine OpenClaw consumer marker held after that isolated run.
4. **CLIs now on PATH (this plant).** Hermes Agent **0.19.0** via `uv tool install` (Python 3.12, not the 17k-commit git installer). OpenClaw **2026.8.2** via Node **24.20.0** (system Node 25.6.1 is outside OpenClaw engines). OpenCode **1.16.2** already present. `xray-hermes` enabled with tool override. Machine OpenClaw gateway HTTP 200 on :18789. `openclaw agent` is the live pickle (token-only WS still lacks `operator.write`).
5. **Four-floor compact + live successor — done.** Hook binaries keep intent, Repertoire working signals, and constitution (11 / 69 / destructive) after the cut. `XRAY_LIVE_SUCCESSOR=1`: Grok, Hermes, OpenCode, and OpenClaw each quoted Host + Intent from the card.

(1)–(5) were *done*, not only unit-tested. Compact persist across a same-host rewrite **kept** the last `hotSwap` stamp.

## Left — product gaps

Closed on this plant and shipped as **0xray@4.0.0**:

- **Grok Read contract.** AGENTS.md + the card. OpenCode injects. Do not thicken the Grok exo.
- **Framework dogfood wear.** `postinstall` always calls `installAllBridges`. Consumer vs dogfood is decided inside it. `.grok/` stays gitignored.
- **Repertoire working state.** Leftover default-off + module → routing **on**. Station snapshot at `.xray/state/repertoire-working.json`. Registry primitives are not the session; the working file is.
- **Live plan line.** First incomplete lead-dev todo, else `git log -1` subject. Stale descriptions do not stick.
- **OpenClaw session heat.** Skip only when host + concrete session id already match a live card. Install without a session id is not a live session.
- **Wear review P0.** Quoted Grok hook commands; postprocessor flag forwarded; Repertoire toml on the project.

## Left — ship (maintainer)

`npm view 0xray version` is **4.0.1**. Tag `v4.0.1` is on `0xRayAI/xray`. Repertoire lives at `0xRayAI/repertoire`.

Still open:

1. **Foundry mill** — extracted to `scripts/foundry/` (`@0xray/foundry`). Overlay mints their constitution, features, skills, and agents. Do not add a mill MCP. Do not `release:major`.
2. Optional: `npm publish @0xray/repertoire@0.2.0` (4.0 already vendors 0.2).

## Do not

- 8th MCP / new skill / new handler (Codex 69)
- Thicken the Grok exo
- Re-litigate Zen pickle or `hermes update`
- Dump Bedrock content into the suit
- Treat unit tests of `STATION.md` as the stranger demo

## One line

**Suit is worn and attested. npm is 4.0.1. Foundry is named. Remaining: one bumper, docs verify-not-write; do not extract a mill package.**
