# @0xray/foundry

The **mill**, not the worn exo. Reconcile, stamp JSON/CHANGELOG, verify docs, gate, publish, overlay their suit params.

PPE (`evaluatePreToolGate`) stays worn. The mill plants **their** constitution, features, skills, and agents onto the hanger. It is not a fifth MCP. The suit is [`0xray`](https://www.npmjs.com/package/0xray).

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
npx @0xray/foundry ci [--commit SHA] [--report]
npx @0xray/foundry hooks
```

`release` without `--dry-run` requires `--i-mean-it` or `FOUNDRY_RELEASE=1`. It is a bump/commit/push/publish bot for the **milled cwd**, not a casual command.

`FOUNDRY_ROOT` overrides cwd (the repo being milled).

`gate` is build + test + docs-check. `docs-build` runs Docusaurus on the 0xray exo (`docs-site/`); stranger mills skip. `ci` reports GitHub Actions (no auto-push). `hooks` installs git pre/post hooks. GitHub `0xRay CI/CD` is the mill gate on `main`. `Deploy Docs` is the mill Pages put.

`docs-check` and `gate` run **full** 0xRay corpus only when the milled `package.json` name is `0xray` and `docs-site/` exists. Otherwise **light**: `package.json` + CHANGELOG.

`hooks` installs git hooks via `scripts/hooks/install-hooks.cjs` (dogfood) or `node_modules/0xray/scripts/hooks/install-hooks.cjs` (published mill + worn garment). It does not look for `@0xray/hooks`.

## Suit params (`mint`)

After the garment is on the hanger, overlay their plant (defaults; remap in `foundry.json` or `.xray/foundry.json`):

| Facet | Default plant | Hanger |
|---|---|---|
| Constitution | `xray/codex.json` | `.xray/codex.json` |
| Features / temperament | `xray/features.json` | `.xray/features.json` |
| Config | `xray/config.json` | `.xray/config.json` |
| Skills | `src/skills/<name>/SKILL.md` | `.opencode/skills/` and project `.grok/plugins/0xray/skills` if that dir exists |
| Agents | `src/opencode/agents/*.yml` | `.opencode/agents/` (OpenCode hangar; other floors do not read mill YML agents) |
| Agents card | `xray/AGENTS.md` | `AGENTS.md` if mill-managed |

**Mill-fill is law:** their keys/files win; mill names they did not plant stay unless they overlay the same name. JSON facets always merge. Skill overlay is project hangers only. CLI re-wear calls mint **once** after mill copies.

**Empty garment (default):** mill plant (`plant/skills/mill`) is the hanger. Not 45 skills / 42 agents. `foundry.json` `"costume": true` copies that mill garment. Factory Repertoire still enable-when-resolves. PPE stays worn.

## Publish this mill

From **this directory**, not the 0xray repo root:

```bash
cd scripts/foundry && npm publish --access public
```

Repo-root `npm publish` is `0xray`. `npx @0xray/foundry release --i-mean-it` publishes the **milled cwd** package (their `publishConfig`; `--access public` only for `0xray` and `@0xray/foundry`).

## 0xRay exo

The mill lives in `scripts/foundry/` inside [0xRayAI/xray](https://github.com/0xRayAI/xray). `scripts/node/*.mjs` wrappers are shims onto this package.
