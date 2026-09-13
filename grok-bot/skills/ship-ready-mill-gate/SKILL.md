---
name: Ship-ready mill gate
description: >-
  use this when deciding if a mill/factory product is ship-ready; Strict full
  gate — Light/Normal skip critic essays; plain language
---
# Ship-ready mill gate

Use when deciding if a mill/factory product may merge or release, and when encoding the ship standard into seats.

## Review level first
See `ops/LEAN-COMPUTE.md` (plain language).

| Level | When | Gate |
|-------|------|------|
| Light | Docs/chore, no runtime | CI only — skip critic proof cards |
| Normal | Small bug fix | Implementer short PR note — reviewer only if asked |
| Strict | Suit, publish, security, identity, live agent docs | Full tasks below + reviewer short proof card |

Tasks A–D apply to **Strict** (and escalated Normal).

## Strict ship standard
### Review
Implementer builds; reviewer PASS/FAIL with a short proof card (≤15 lines). Chat approval is not enough.

### Task A — PR + CI
Worktree + PR · CI updated · checks green

### Task B — Pack proof
`npm pack` · clean temp install · required tests pass

### Task C — Docs (general first)
Core: README · CHANGELOG · llms.txt · AGENTS.md · SKILLS.md · package.json · docs site  
Then project-specific docs.

### Task C2 — Live agent docs (when that product ships)
Live HTTP 200 with real markdown/json for AGENTS / SKILLS / llms (and package.json when published). Paste curl proof. Fail on 404 or catch-all banners.

### Task D — Release
Reviewer PASS · merge · foundry gate + verify-only · implementer deploy/publish · live verify  
Do not rebuild ProcessorManager / old post-processor loops as bot gates.

### UI
Playwright (or mark n/a).

## Who
Implementer builds · reviewer Strict only · coordinator routes (no deploy) · human for capital

## Fail closed
Red CI, missing pack proof, docs lag, live docs fail, gate fail, or Strict without reviewer → not ship-ready.
