---
sidebar_label: 4.0 now (handoff)
---

# 4.0 now — compaction handoff

Read [4.0 vision](./v4-vision.md) for why. This page is the **station card** so the next session is not born amnesiac.

## What 4.0 is

Exo skeleton: constitution always on, temperament scales ceremony, four host floors. **Not** a catalog of 42 agents. The job: a suit that **survives the context window** (compaction). Plan → build → review → ship are **linear** handoffs; each drop is high friction. Bite-sized work resumes from wear + git + **Repertoire**.

## Line (feat/v4-temperament)

npm still **3.5.5**. Product version **4.0.0**. **Still in development — do not npm publish, do not tag, do not merge to `main`.** Branch is the plant.

**Bone that is already worn (this machine + branch):**

- Constitution SSOT on Grok, OpenCode, Hermes, OpenClaw
- Grok hooks = command strings, timeout 30, no `args[]`
- OpenClaw handshake minProtocol 3 / maxProtocol 4; `xray-pre-tool` loaded
- Pickle = OpenCode CLI (`opencode run --pure`), not Zen/Go HTTP
- Hermes pack local 4.0; plugin id `xray-hermes`
- Repertoire `feat/mcp-unprefix` (Grok MCP names) — companion branch. Wired on this floor.
- **Harness (this station):** leftover `memory_routing` default-off auto-enables when the Repertoire module resolves; Grok session-start writes `repertoireResume`. Explicit opt-out preserved. No 8th MCP.
- **Hot-swap:** `.xray/state/STATION.md` is the card. Compaction (PreCompact) and host change write it. AGENTS.md: Read the card, continue, do not cold-start. Stranger without Repertoire still has git + intent + plan.
- Stranger-install wear: plugin in tarball, dist-then-src, postinstall PreToolUse, ephemeral markers not clobbering machine, OpenClaw `opencode-cli` backend when `opencode` is on PATH.

**Not 0xRay bugs:** Zen 429, glm billing, xAI chat key, `hermes update` 17k commits, OpenCode 1.17 vs 1.18.

## Next bites (in order)

1. Keep wearing on `feat/v4-temperament` + repertoire `feat/mcp-unprefix`. Per-suite tests green. No publish.
2. Host e2e only in isolated HOME — do not clobber machine markers.
3. **Ship later** — merge + tag + `npm publish 4.0.0` only when leaving dev.

Do not start a fifth MCP. Do not re-litigate Zen pickle. Do not thicken the Grok exo.

## One line for the next model

**Suit that survives the context window. The cut is the test: compact or change host, Read STATION.md, keep moving. Still in dev — no npm publish.**
