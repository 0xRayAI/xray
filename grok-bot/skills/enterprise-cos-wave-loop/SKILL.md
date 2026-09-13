---
name: Enterprise CoS wave loop
description: >-
  use this when CoS wave loop runs — digest board queue start next; seats-first
  clouds; fit-for-purpose lean; quiet acks
---
# Enterprise CoS wave loop

Use for coordinator wave loops: digest board, queue work, start the next step; Done → Verify → Reflect → Next; resume the same cloud agent for the same PR (do not spawn duplicates).

## Save compute + fit for purpose
`ops/LEAN-COMPUTE.md` — Light / Normal / Strict · quiet on repeat acks · lean execution every pass · no theater · no over-build. Coordinator routes and checks proof — does not deploy or implement.

## Cloud vs seats
`ops/CLOUD-CONTINUITY.md` — suited seats first; clouds only for heavy repo surgery; implementer owns cloud handoff; coordinator does not puppeteer.

## When a teammate messages you
1. Read the substance.
2. If it only repeats known state → stay quiet.
3. If ownership, blockers, live proof, or capital changed → update the board, queue next work, start the next non-capital step, tell the human.
4. Never wait-only on a real close. Never ask the human for everyday next steps.

## Board beat (real changes only)
**Done** · **Verify** · **Reflect** · **Next** (no approval / needs human / not now)

## Roles
Reviewer = Strict PASS/FAIL · Implementer = build/deploy/publish · Coordinator = route · Human = money/public/credentials

## Done means live
Merged without deploy is not done.
