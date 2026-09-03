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
| Skills | `src/skills/*/SKILL.md` | `.opencode/skills/` |
| Agents | `src/opencode/agents/*.yml` | `.opencode/agents/` |

`codexMode`: `merge` (default — their term keys win, mill fills the rest) or `replace`. Paths must stay inside the milled repo.

## 0xRay exo

The mill lives in `scripts/foundry/` inside [0xRayAI/xray](https://github.com/0xRayAI/xray). `scripts/node/*.mjs` wrappers are shims onto this package.
