---
sidebar_label: 4.0 now (handoff)
---

# 4.0 now — compaction handoff

Read [4.0 vision](./v4-vision.md) for why. This page is the **station card** so the next session is not born amnesiac. What's still open: [4.0 left](./v4-left.md).

## What 4.0 is

Exo skeleton: constitution always on, temperament scales ceremony, four host floors. **Not** a catalog of 42 agents. The job: a suit that **survives the context window** (compaction). Plan → build → review → ship are **linear** handoffs; each drop is high friction. Bite-sized work resumes from wear + git + **Repertoire**.

## Line (feat/v4-temperament)

npm **4.0.0** (`https://www.npmjs.com/package/0xray`). Tag `v4.0.0` on `0xRayAI/xray` `main` (`f80b42c`). Next 4.x fix is `npm run release:npm` — never `release:major` (that becomes 5.0.0).

**Bone that is already worn (this machine + branch):**

- Constitution SSOT on Grok, OpenCode, Hermes, OpenClaw
- Grok hooks = command strings, timeout 30, no `args[]`
- OpenClaw handshake minProtocol 3 / maxProtocol 4; `xray-pre-tool` loaded
- Pickle = OpenCode CLI (`opencode run --pure`), not Zen/Go HTTP
- Hermes pack local 4.0; plugin id `xray-hermes`
- Repertoire factory seed **0.2** vendored (`htafolla/repertoire#2`). Grok MCP names unprefixed. Not an 8th 0xRay MCP.
- **Memory:** shipped `memory_routing` is **on**. Station heat matches seed signals on every host. Compact ingest is shared. Working state: `.xray/state/repertoire-working.json`. Explicit opt-out: `enabled: false` + `provider: "repertoire"`.
- **Hot-swap:** `.xray/state/STATION.md` is the card. Compaction (PreCompact), host change, and OpenClaw first-tool write it. AGENTS.md: Read the card (Grok does not inject). Live plan line. Stranger without Repertoire still has git + intent + plan.
- **Wear review P0:** quoted Grok hook commands; `postinstall` dogfood actually runs; OpenClaw heat skips only on a concrete session; `grok_postprocessor_light` forwarded; Repertoire `config.toml` on the project.
- Stranger-install wear: plugin in tarball, dist-then-src, postinstall PreToolUse, ephemeral markers not clobbering machine, OpenClaw `opencode-cli` backend when `opencode` is on PATH.

**Not 0xRay bugs:** Zen 429, glm billing, xAI chat key, `hermes update` 17k commits, OpenCode 1.17 vs 1.18.

## Next bites

Open list: [4.0 left](./v4-left.md). npm is **4.0.0**. Remaining: land the release-gate follow-up (smoke + `scripts.publish` lifecycle + reconcile), optional `@0xray/repertoire@0.2.0` npm.

Do not start a fifth MCP. Do not re-litigate Zen pickle. Do not thicken the Grok exo.

## One line for the next model

**Suit that survives the context window. Four floors attested. npm 4.0.0. Gate follow-up: smoke matches organ-on; do not re-run the gate after the registry PUT.**
