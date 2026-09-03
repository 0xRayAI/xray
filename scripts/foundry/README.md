# @0xray/foundry

The **mill**, not the worn exo. Reconcile, stamp JSON/CHANGELOG, verify docs, gate, publish.

This is not constitution. It is not a fifth MCP. The suit is [`0xray`](https://www.npmjs.com/package/0xray).

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
```

`FOUNDRY_ROOT` overrides cwd (the repo being milled).

On a repo without `docs-site/`, `docs-check` and `gate` run in **light** mode: `package.json` + CHANGELOG, no 0xRay Docusaurus corpus.

## 0xRay exo

The mill lives in `scripts/foundry/` inside [0xRayAI/xray](https://github.com/0xRayAI/xray). `scripts/node/*.mjs` wrappers are shims onto this package.
