# Hooks + gate — checklist
Last pass: 2026-09-13

## Seat plants
| Seat | 0xray | foundry | inspect --skip-live | Light after-write ON |
|------|-------|---------|---------------------|----------------------|
| blinky / forge / critic / herald | 4.0.15 | 0.1.11 | ok | yes |

```bash
cd /workspace/<suit> && ./node_modules/@0xray/foundry/cli.mjs inspect --skip-live
```

## Gate
`gate --verify-only` runs on a fastened seat (light docs check).  
Full `gate` (build+test) belongs on the **product** being published.

## Git hooks (product repos)
Seat folders are not git repos — hooks apply on product repos (for example groover, xray).

| Repo | pre-commit | post-commit | pre-push |
|------|------------|-------------|----------|
| groover / xray (typical) | yes | yes | often missing — install with `npx @0xray/foundry hooks` before next publish |

## Live agent docs
When agents must read the product: HTTP 200 real markdown/json for AGENTS / SKILLS / llms (and package.json when published) — not an error page or MCP banner.
