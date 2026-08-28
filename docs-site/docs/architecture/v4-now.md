---
sidebar_label: 4.0 now (handoff)
---

# 4.0 now — compaction handoff

Read [4.0 vision](./v4-vision.md) for why. This page is the **station card** so the next session is not born amnesiac.

## What 4.0 is

Exo skeleton: constitution always on, temperament scales ceremony, four host floors, Repertoire as muscle. **Not** a catalog of 42 agents. Factory lens: plan → build → review → ship as **testable handoffs**. Bite-sized work must survive the next compaction from wear + git + Repertoire.

## Line (feat/v4-temperament)

npm still **3.5.5**. Product version **4.0.0**. Branch is the plant, not `main`.

**Bone that is already worn (this machine + branch):**

- Constitution SSOT on Grok, OpenCode, Hermes, OpenClaw
- Grok hooks = command strings, timeout 30, no `args[]`
- OpenClaw handshake minProtocol 3 / maxProtocol 4; `xray-pre-tool` loaded
- Pickle = OpenCode CLI (`opencode run --pure`), not Zen/Go HTTP
- Hermes pack local 4.0; plugin id `xray-hermes`
- Repertoire `feat/mcp-unprefix` (Grok MCP names) — companion branch, pushed
- Stranger-install wear commit: plugin in tarball, dist-then-src, postinstall PreToolUse, ephemeral markers not clobbering machine, OpenClaw `opencode-cli` backend when `opencode` is on PATH (`4bbdef610` and follow-ons)

**Not 0xRay bugs:** Zen 429, glm billing, xAI chat key, `hermes update` 17k commits, OpenCode 1.17 vs 1.18.

## Next bites (in order)

1. **Stranger install** — `npm pack` 4.0 from this branch → empty dirs → `npx 0xray {grok,hermes,opencode,openclaw} install`. Assert constitution blocks Codex 11. Ephemeral e2e must not rewrite machine markers.
2. **Repertoire unprefix with 4.0** — merge or document as required on the Grok floor when memory routing is on.
3. **Ship** — merge `feat/v4-temperament` → `npm publish 4.0.0` only after (1).

Do not start a fifth MCP. Do not re-litigate Zen pickle. Do not thicken the Grok exo.

## One line for the next model

**Kernel wear, factory handoffs, bite-sized so compaction does not kill the plant. Next proof is stranger install, not another manifesto.**
