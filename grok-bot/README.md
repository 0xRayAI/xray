# Grok Bot on 0xRay

How a Grok Bot fleet runs on the 0xRay factory OS.

**0xRay** builds and plants a thin work suit (mill + inspect).  
**This folder** is the fleet operating layer: procedures + skill recipes.  
Product rails (identity, shops, payments) live in their own repos — not here.

| Path | What |
|------|------|
| `ops/` | How we review, ship, talk, and hand off work |
| `skills/` | Step-by-step recipes seats follow |

## Install a suit (fasten)

In a project folder that already has `package.json`:

```bash
npm i 0xray@4.0.12 @0xray/foundry@0.1.10
npx @0xray/foundry mint --skip-live
npx @0xray/foundry inspect --skip-live
```

You want `ok: true`, `suit: "fastened"`, mill + inspect only (`costume: false`).

Optional Grok plugin: `npx 0xray grok install`  
More detail: [`ops/SUIT-ATTESTATION.md`](ops/SUIT-ATTESTATION.md) · full recipe: [`skills/fasten-suit-and-hangar/SKILL.md`](skills/fasten-suit-and-hangar/SKILL.md)

## Read next
[`ops/THREE-LAYERS.md`](ops/THREE-LAYERS.md) — suit vs skills vs tools  
[`ops/LEAN-COMPUTE.md`](ops/LEAN-COMPUTE.md) — Light / Normal / Strict review  
[`ops/CLOUD-CONTINUITY.md`](ops/CLOUD-CONTINUITY.md) — when to use cloud agents  

**Voice:** plain words first. Friend test before anything lands on `main`.  
**Default:** suited seats do the work. Clouds only for heavy multi-file repo surgery.
