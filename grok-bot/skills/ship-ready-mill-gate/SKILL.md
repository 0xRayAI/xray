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
| Light | Docs/chore, no runtime | Implementer + CI |
| Normal | Small fix, ops/docs mirrors | Implementer + CI; **no Reviewer card** |
| Strict | Ship / live / security / identity only | Tasks below + reviewer short proof |

## Strict tasks
**A — PR + CI** worktree + PR · CI updated · green  
**B — Pack proof** when releasing a package: pack · temp install · tests pass  
**C — Docs** core first: README · CHANGELOG · llms.txt · AGENTS.md · SKILLS.md · package.json · docs site — then project-specific. Friend test.  
**C2 — Live agent docs** when agents must read them: HTTP 200 real content (not error page / banner). Paste curls.  
**D — Release** reviewer PASS · merge · `foundry gate` + `gate --verify-only` · implementer deploy/publish · live verify  

Do not rebuild old processor-manager loops as bot gates.

## Who
Implementer builds · reviewer Strict only · coordinator routes · human for capital

Reviewer card lives in `ops/SEATS.md` (critic ✶). Lead dispatches ticket + PR URLs only. Critic Reads Station, verifies the diff, posts COMMENT (not self-APPROVE), proof card ≤15 lines + friend-test line. Does not merge or publish.

## Fail closed
Red CI, missing proof, docs lag, live docs fail, gate fail, Strict without reviewer, or friend-test fail on public/OS docs.
