# Changelog

## [0.1.3] - 2026-09-04

Docusaurus is mill: `npx @0xray/foundry docs-build` (exo only). GitHub Pages no longer clobbers the generated homepage with a stale `static/index.html`.

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
