# @0xray/foundry

The **mill**, not the worn exo. Reconcile, stamp JSON/CHANGELOG, verify docs, gate, publish, overlay their suit params.

PPE (`evaluatePreToolGate`) stays worn. The mill **fastens** their constitution, features, skills, and agents as the suit. It is not a fifth MCP. The suit is [`0xray`](https://www.npmjs.com/package/0xray).

## Install

```bash
npm i -D @0xray/foundry
```

## Commands

```bash
npx @0xray/foundry reconcile [patch|minor|major] [--apply] [--check]
npx @0xray/foundry stamp
npx @0xray/foundry docs-check
npx @0xray/foundry docs-build
npx @0xray/foundry gate [--verify-only]
npx @0xray/foundry release [patch|minor|major] --dry-run
npx @0xray/foundry release [patch|minor|major] --i-mean-it
npx @0xray/foundry release --publish-only --dry-run
npx @0xray/foundry release --publish-only --i-mean-it
npx @0xray/foundry mint
npx @0xray/foundry inspect [--skip-live] [--go] [--go-out PATH] [--require-harness=bare|suited|partial]
npx @0xray/foundry sound render [--brief TEXT] [--genre ambient|techno|jazz]
npx @0xray/foundry sound inspect
npx @0xray/foundry sound mix
npx @0xray/foundry blip render --brief TEXT --mode still|motion:<id> [--look focus|cage] [--body mill|rippel] [--genre ambient|techno|phonk|jazz|rock|timeless] [--camera front|three-quarter|top|low|dutch|side] [--bed PATH] [--engine rippel|wireframe]
npx @0xray/foundry blip inspect
npx @0xray/foundry blip vibe
npx @0xray/foundry blip look
npx @0xray/foundry ci [--commit SHA] [--report]
npx @0xray/foundry hooks
```

`release` without `--dry-run` requires `--i-mean-it` or `FOUNDRY_RELEASE=1`. It is a bump/commit/push/publish bot for the **milled cwd**, not a casual command.

`FOUNDRY_ROOT` overrides cwd (the repo being milled).

`gate` is build + test + docs-check. `docs-build` runs Docusaurus on the 0xray exo (`docs-site/`); stranger mills skip. `inspect` runs the six mill checks (diff, plant vs worn, receipt, CI, live tarball GET, isolated HOME) plus observational harness (Cursor/Grok hooks bound, Repertoire fastened, Station present). `--go` emits a shop-style forge GO receipt; `--require-harness=bare|suited|partial` turns that observation into a gate. Mint fails on a costume dump. Isolated HOME skips machine `~/.grok`. Shared HOME last-mile dest is project `.grok/plugins/0xray` (no last-wins machine plugin). `ci` reports GitHub Actions (no auto-push). `hooks` installs git pre/post hooks. GitHub `0xRay CI/CD` is the mill gate on `main`. `Deploy Docs` is the mill Pages put.

`docs-check` and `gate` run **full** 0xRay corpus only when the milled `package.json` name is `0xray` and `docs-site/` exists. Otherwise **light**: `package.json` + CHANGELOG.

`hooks` installs git hooks via `scripts/hooks/install-hooks.cjs` (dogfood) or `node_modules/0xray/scripts/hooks/install-hooks.cjs` (published mill + worn suit). It does not look for `@0xray/hooks`.

## Suit params (`mint`)

After mill plant is fastened, overlay their plant (defaults; remap in `foundry.json` or `.xray/foundry.json`):

| Facet | Default plant | Worn |
|---|---|---|
| Constitution | `xray/codex.json` | `.xray/codex.json` |
| Features / temperament | `xray/features.json` | `.xray/features.json` |
| Config | `xray/config.json` | `.xray/config.json` |
| Skills | `src/skills/<name>/SKILL.md` | project `.opencode/skills`, `.grok/plugins/0xray/skills`, `.hermes/plugins/xray-hermes/skills`, `.openclaw/skills` (created on fasten; never machine home) |
| Agents | `src/opencode/agents/*.yml` | `.opencode/agents/` (OpenCode wear dir; other floors do not read mill YML agents) |
| Agents card | `xray/AGENTS.md` | `AGENTS.md` if mill-managed |

**Mill-fill is law:** their keys/files win; mill names they did not plant stay unless they overlay the same name. JSON facets always merge. Skill overlay is project dirs on every TUI floor (OpenCode, Grok, Hermes, OpenClaw). YML agents stay OpenCode. CLI re-wear calls mint **once** after mill copies. Isolated HOME is passwd home, not `os.homedir()`. CI report is `.xray/foundry-ci-report.json` (`.opencode/logs` shim).

**Default mill plant:** `mill` + `inspect` (inspect AI work). Fasten is **foundry-plant/0**: builtin plant is mill+inspect only (files from this package `plant/`). Fastens a suit, not an empty one. Not 45/42 costume. `foundry.json` `"costume": true` copies that dump. **Repertoire is preferred** (vendored, dest = laws). PPE stays worn.

**foundry-plant/0:** `foundry.json` `"plant": "@0xray/blip"` (aliases `"plant": "blip"` / `"plant": "sound"`) fastens whatever that mill package declares and ships in its own `plant/`. Organs (looker, vibe, mixer) live in the mill. Adding an organ is a mill publish, not a foundry catalog PR. CLI shims `foundry blip|sound` still exist on foundry 0.1.11+; fasten is the new cut. Foundry **0.1.12**.

**Sound plant (factory-sound):** mill `@0xray/blip`. Alias `"plant": "sound"` fastens what that mill declares (`sound` + `sound-inspect` + `sound-mixer` today) and turns mill off. Spine: brief → checksum seed → genre (`ambient` | `techno` | `jazz` | `phonk`) → crystal-clear headless wav (Rippel membrane + metal + mixer, not a 3-sine toy) → metrics gate → `.xray/sound-bed-receipt.json`. `npx @0xray/foundry sound mix` levels every genre × tempo × motif (hats / plate / glue). Tone.Offline is blocked in Node (no `OfflineAudioContext`). Mixer organ lives in `@0xray/blip`; this package shims `foundry sound`. Inspect reports the mill-declared plant plus last bed `PASS`/`FAIL`. Not costume.

A 4.44s lock is a Short: seed motif (hook cell → turn answer → tag stamps hook[0]). The crash lands on the jewel cut.

A friend would hear: the sound mill mills Dist beds like Rippel’s prototype grew up — kick membranes, metal hats, and a crystal-clear mixer, not a muddy toy and not a 3-sine pad.

**Blip plant (factory-blip):** mill `@0xray/blip` — sibling factory to mill + sound, not a mill copy. Alias `"plant": "blip"` fastens what that mill declares (`blip` + `blip-inspect` + `blip-vibe` + `blip-looker` today) and turns mill off. `npx @0xray/foundry blip vibe` scores stamp density. `npx @0xray/foundry blip look` is the friend hitting replay (appeal 0–10, ship bar 8). Motions live in `plant/motions/registry.json` (not a frozen Rippel enum). v0: `still` + Rippel five (`orb` `swirl` `snap` `waves` `spark`). `kapow` is a design opt — two-tier comic stamp on the same stanza (outer burst winds, inner burst + word slam the jewel cut). Unknown id FAIL. Rippel v2 default motion path is the Rippel converter (`VisualConfig.circles` → canvas / 3d-sacred / neural / waveform / particles) at ≥720p — one mill suit (Wu, Power Plant, hook → turn → tag) on `--look` / `--body` / `--genre` / `--camera` (seed picks). Audio syncopates to the motion grid (same seed, tempo, phase0=0). Each mint wears a sparse seed mesh plus a seed camera (front / three-quarter / top / low / dutch / side) plus field accents (stars, grids, gradients, blinkers) so 4.44s is unique blip art; the turn ruptures cage and snap, and looker wears one large eclipse moon the noun eats. Receipt `visualConfig.mesh` + `visualConfig.field` are the fingerprints. ffmpeg wireframe is `--engine wireframe` only. `still` is the Power Plant ident (void `#08090B` · ink `#F5F7FA` · cyan `#3DE0E8` · gold `#F5C518` · agent blue `#4A7FD4`) — titlecard / corridor / rain / endcard dissolve over 4.44s at ≥720p, not a frozen poster. Every 4.44s mp4 muxes a stereo AAC bed (`--bed` or auto sound mill) → `.xray/blip/receipt.json`. Missing stream or inaudible bed = inspect FAIL. Inspect reports the mill-declared plant, live ids, plus last blip `PASS`/`FAIL`. Organs live in `@0xray/blip`; this package shims `foundry blip`. Not costume.

A friend would hear: Blips should look like Rippel living motions with sound, not a silent wireframe box.

**Shop plant:** `shop-extract`, `shop-witness`, `shop-pin` are first-class with mill plant. Inspect does not treat those worn names as a costume dump. `foundry.json` `"shopPlant"` names more shops (array), a plant dir (string), or `{ "skills": [...], "dir": "..." }`. This is not `"costume": true` and does not copy 45/42.

**Mill target (0xray postinstall, not this mill package):** `install-bridges.cjs` does not mill npm global prefix or npx `_npx` as a consumer. Isolated HOME skips machine `~/.grok`. Shared HOME Grok last-mile is project `.grok/plugins/0xray` (two seats do not clobber machine plugin). Nested mill ships in the 0xray tarball (foundry-plant/0; blip/sound drawers in `@0xray/blip`; inspect dest matches `resolveGrokPluginDests`).

## Publish this mill

From **this directory**, not the 0xray repo root:

```bash
cd scripts/foundry && npm publish --access public
```

Repo-root `npm publish` is `0xray`. `npx @0xray/foundry release --i-mean-it` publishes the **milled cwd** package (their `publishConfig`; `--access public` only for `0xray` and `@0xray/foundry`).

## 0xRay exo

The mill lives in `scripts/foundry/` inside [0xRayAI/xray](https://github.com/0xRayAI/xray). `scripts/node/*.mjs` wrappers are shims onto this package.
