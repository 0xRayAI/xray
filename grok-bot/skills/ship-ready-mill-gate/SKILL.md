---
name: Ship-ready mill gate
description: >-
  use this when deciding if a mill/factory product may merge or release;
  Strict full gate — Light/Normal skip long reviews; plain language
---
# Ship-ready mill gate

## Review level first
| Level | When | Gate |
|-------|------|------|
| Light | Docs/chore, no runtime | CI only |
| Normal | Small fix | Implementer short PR note |
| Strict | Suit, publish, security, identity, live agent docs | Tasks below + reviewer short proof |

## Strict tasks
**A — PR + CI** worktree + PR · CI updated · green  
**B — Pack proof** when releasing a package: pack · temp install · tests pass  
**C — Docs** core first: README · CHANGELOG · llms.txt · AGENTS.md · SKILLS.md · package.json · docs site — then project-specific. Friend test.  
**C2 — Live agent docs** when agents must read them: HTTP 200 real content (not error page / banner). Paste curls.  
**D — Release** reviewer PASS · merge · `foundry gate` + `gate --verify-only` · implementer deploy/publish · live verify  

Do not rebuild old processor-manager loops as bot gates.

## Who
Implementer builds · reviewer Strict only · coordinator routes · human for capital

## Fail closed
Red CI, missing proof, docs lag, live docs fail, gate fail, Strict without reviewer, or friend-test fail on public/OS docs.
