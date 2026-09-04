# Changelog

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
