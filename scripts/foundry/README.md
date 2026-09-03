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
npx @0xray/foundry gate [--verify-only]
npx @0xray/foundry release [patch|minor|major] [--dry-run]
npx @0xray/foundry release --publish-only
npx @0xray/foundry mint
```

`FOUNDRY_ROOT` overrides cwd (the repo being milled).

`docs-check` and `gate` run **full** 0xRay corpus only when the milled `package.json` name is `0xray` and `docs-site/` exists. Otherwise **light**: `package.json` + CHANGELOG.

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

## Publish this mill

From **this directory**, not the 0xray repo root:

```bash
cd scripts/foundry && npm publish --access public
```

Repo-root `npm publish` is `0xray`. `npx @0xray/foundry release` publishes the **milled cwd** package (their `publishConfig`; `--access public` only for `0xray` and `@0xray/foundry`).

## 0xRay exo

The mill lives in `scripts/foundry/` inside [0xRayAI/xray](https://github.com/0xRayAI/xray). `scripts/node/*.mjs` wrappers are shims onto this package.
