# Changelog

## [Unreleased]

Factory-blip orb nucleus is orb-only (disc / eclipse / pulse, color + size on the grid). Swirl / snap / spark no longer stamp the same double circle.

Factory-blip audio syncopates to the motion grid: same seed + tempo + phase0=0. Downbeat kick locks to `kickAccent`; AND hat locks to `andAccent`. Not a flat bed under unrelated LFOs.

Factory-blip auto bed is the music — same seed / tempo / phase0 as the picture. 4.44s beds hit on the first downbeat (no 0.5s duck). Kick + AND hat + bass/rhodes on the grid. Pad sits under.

Factory-blip lines: Wu hairline (solid 1px core, coverage AA as the only glow). Cyan/gold/blue along the stroke. Vertex beads gone.

Factory-blip lines iridesce: cyan/gold/blue travel + glow + beat fireflies on the sparse cage. Field stars / grids / gradients / blinkers are luminous, not CAD ticks. Not more wire. Not a strobe.

Factory-blip field accents: uniqueness is stars / grids (`floor` `meridian` `ticks`) / gradients / blinkers around one sparse seed cage. Receipt `visualConfig.mesh` + `visualConfig.field`. Not more wire in the middle.

Factory-blip meshes: every mint gets a seed-unique polyhedron (12 families + gait). Worn by all five viz and the Power Plant ident.

Factory-blip Power Plant is a living ident (`look: power-plant-blip`) — hard-cut titlecard / corridor / rain / endcard over 4.44s at ≥720p. Not a frozen 320×180 poster.

Factory-blip Rippel v2: the sharp orb look (`stampFocusDisc` opaque body + crisp rim + short glow) is now the look on **all five** viz — swirl / snap / waves / spark were still Phase 1 bokeh strokes. Animation is the complex Rippel set, paced as a 4.44s blip (fast abstract travel, soft gold tints — no hard strobe). Video LFOs share the crystal-mill genre tempo + `CircleConfig.frequency` with the audio bed. Mandatory 4.44s mux unchanged. No version bump.

Factory-blip Phase 1 (TICKET-BLIP-RENDERER-UPGRADE): default motion path is the Rippel converter spine (`VisualConfig.circles` → SimplifiedVisualConverter viz ids) at ≥720p, not ffmpeg geometry labeled as orb. `htafolla/rippel-synapse-flow@e5014cd`. Every Blip muxes a 4.44s audio bed (`--bed` or auto sound mill); silent mp4 = inspect FAIL. ffmpeg wireframe is `--engine wireframe` only. Still stays the Power Plant plate until Phase 2. No `@0xray/foundry` bump.

Factory-blip plant (`blip` + `blip-inspect`) — sibling to mill + sound, not a mill copy. `foundry.json` `"plant": "blip"` fastens the tiny-video factory and turns mill off. Dynamic motion registry (not a frozen Rippel enum). v0: still + Rippel five. `kapow` is a growth stub. Still generator wears the Power Plant intro plate (`#08090B` `#F5F7FA` `#3DE0E8` `#F5C518` `#4A7FD4`). Headless 4.44s mp4 + receipt. Inspect reports last blip PASS/FAIL. Not costume. No version bump — dogfood from branch / pack.

Sound plant retool: crystal-clear mill of Rippel SSOT chains (membrane / metal / duo-bass / mixer), not the Lovable volume-hack soup and not #62 sine beds. Tone.Offline blocked in Node. `phonk` first-class. No version bump.

Factory-sound plant (`sound` + `sound-inspect`). `foundry.json` `"plant": "sound"` fastens the bed factory and turns mill off. Headless render + metrics receipt. Inspect reports last bed PASS/FAIL. Not a mill copy. Not costume. No version bump — dogfood from branch / pack.

## [0.1.10] - 2026-09-12

Inspect isolated-home `dest` is `resolveGrokPluginDests` — on shared HOME that is project `.grok/plugins/0xray`, not machine `$HOME/.grok/plugins/0xray`. Published 0.1.9 still joined dest from `$HOME` (report/CLI lag after 0xray@4.0.12 / #29 wear). Shop plant is first-class with mill plant. `shop-extract`, `shop-witness`, `shop-pin` (and `foundry.json` `shopPlant`) are not a costume dump. `"costume": true` still required for 45/42. Isolated HOME must not write the passwd machine plugin. Not an 8th MCP. Not 5.0.

## [0.1.9] - 2026-09-09

Inventory writes `dna` (keccak256 of canonical JSON without `mintedAt`). Inspect receipt echoes `dna` + pack `0xray-suit` for Groover GRVR. Mill does not mint on chain. Not an 8th MCP. Not 5.0.

## [0.1.8] - 2026-09-09

Isolated HOME skips machine `~/.hermes` and `~/.openclaw` (passwd home, same gate as Grok). Inspect GETs a public consumer tarball (`@0xray/review-suit`). CLI `mint` runs inspect after overlay; postinstall does not. Not an 8th MCP. Not 5.0.

## [0.1.7] - 2026-09-04

Inspect is mill flesh: `npx @0xray/foundry inspect` runs diff, plant vs worn (mint fails costume dump), mill receipt, CI, GET the `.tgz` (HTTP 200), isolated HOME vs passwd home. Four project skill floors created on fasten (OpenCode, Grok, Hermes, OpenClaw). CI report is `.xray/foundry-ci-report.json`. Not an 8th MCP. Not 5.0.

## [0.1.6] - 2026-09-04

Mill plant fastens an **inspect** suit: inspect AI work (diffs, traces, mill receipts, CI). Not empty. `mill` + `inspect` skills. Costume dump still opt-in.

Inventory field is `suit` (`fastened` / `overlay` / `costume` / `dogfood`). Not `garment`. `foundry.json` `"costume": true` is the 45/42 dump.

## [0.1.5] - 2026-09-04

Mill plant (`plant/skills/mill`) fastened by default, not 45/42 costume. `foundry.json` `"costume": true` restores the dump. Plant overlay still mill-fill.

## [0.1.4] - 2026-09-04

`npx @0xray/foundry hooks` on a published mill uses the worn 0xray installer
`node_modules/0xray/scripts/hooks/install-hooks.cjs`. Dogfood still uses
`scripts/hooks` next to `scripts/foundry`. Missing installer fails honestly
(no spawn of `node_modules/@0xray/hooks/...`).

## [0.1.3] - 2026-09-04

Pages homepage is a baseUrl meta refresh to `/docs/`, not a client redirect to `/docs/introduction` (org-root 404).

Docusaurus is mill: `npx @0xray/foundry docs-build` (exo only). GitHub Pages no longer clobbers the generated homepage with a stale 3.x `static/index.html`.

## [0.1.2] - 2026-09-04

Mill owns GitHub CI, git hooks, and CI report. `npx @0xray/foundry ci` reports Actions (no auto-push). `npx @0xray/foundry hooks` installs pre/post git hooks. `0xRay CI/CD` is the mill gate on main.

## [0.1.1] - 2026-09-04

Live `release` (bump/commit/push/publish of the milled cwd) requires `--i-mean-it` or `FOUNDRY_RELEASE=1`. `--dry-run` stays free. Packed mill tarball mints overlay. Stamp keeps `[Unreleased]` and inserts the version under it.

## [0.1.0] - 2026-09-03

First mill package. Overlay their constitution, features, skills, and agents onto **project** hangers. Stamp/gate/docs-check mill `FOUNDRY_ROOT` or cwd. Not the worn exo.

Publish this package from this directory:

```bash
cd scripts/foundry && npm publish --access public
```

Do not `npm publish` from the 0xray repo root (that is `0xray@4.0.1`).
