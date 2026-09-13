# Hooks + gate — one-pass checklist
When: 2026-09-13 · Fit for purpose proof (not a rewrite)

## Seat plants (box)
| Seat | 0xray | foundry | `inspect --skip-live` | Light postprocessor ON |
|------|-------|---------|------------------------|-------------------------|
| blinky-suit | 4.0.12 | 0.1.10 | ok=true | yes |
| forge-suit | 4.0.12 | 0.1.10 | ok=true | yes |
| critic-suit | 4.0.12 | 0.1.10 | ok=true | yes |
| herald-suit | 4.0.12 | 0.1.10 | ok=true | yes |

Session capture ON; inference_governance OFF (all four). Shared machine plugin (`isolated: false`).

Commands used:
```bash
cd /workspace/<suit> && ./node_modules/@0xray/foundry/cli.mjs inspect --skip-live
```

## Gate
`gate --verify-only` on blinky-suit → **passed** (light mill docs check).  
Full `gate` (build+test) belongs on the **product** being published, not as busywork on every seat folder.

## Git hooks (product repos — Mac)
Seat folders are **not** git repos → `foundry hooks` does not apply there.

| Repo | pre-commit | post-commit | pre-push |
|------|------------|-------------|----------|
| ~/dev/groover | yes (0xRay consumer) | yes | **missing** |
| ~/dev/xray | yes (0xRay consumer) | yes | **missing** |

Gap (one line): install/refresh hooks with `npx @0xray/foundry hooks` on product repos when next publishing — especially **pre-push**. Not done this pass (no surprise mutate).

## Live agent docs (#1)
Already Done=live — see `C2-LIVE-PROOF-PR30-31.md`.

## Pass verdict
- Suit wear on seats: **proven**
- Release gate CLI: **runs**
- Git hook coverage on products: **partial** (pre-push gap noted, not theater-fixed)
