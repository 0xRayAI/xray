---
title: Review
sidebar_label: Review
plate_type: state flow
---

# Review

A state flow plate: one critic pass, one fix, one re-review, then stop.

```
  ┌──────────────────────────────┐
  │ DIFF                         │
  ├──────────────────────────────┤
  │ · one head on a branch       │
  │ · the test claims the change │
  └──────────────────────────────┘
                  │
                  v
  ┌──────────────────────────────┐
  │ CRITIC                       │
  ├──────────────────────────────┤
  │ · one pass on that head      │
  │ · FAIL names the file and a  │
  │   test that fails on the old │
  │   code                       │
  │ · a note is not a FAIL       │
  └──────────────┬───────────────┘
                 │
       ┌─────────┴──────────┐
       │ PASS               │ FAIL
       v                    v
  ┌─────────┐      ┌──────────────────────────┐
  │ STOP    │      │ ONE FIX                  │
  ├─────────┤      ├──────────────────────────┤
  │ · notes │      │ · that hole, one author  │
  │   stay  │      │ · a second session waits │
  └─────────┘      └────────────┬─────────────┘
                                │
                                v
                   ┌──────────────────────────┐
                   │ RE-REVIEW                │
                   ├──────────────────────────┤
                   │ · one pass on the new    │
                   │   head                   │
                   │ · a missed hole returns  │
                   │   to ONE FIX             │
                   └────────────┬─────────────┘
                                │
                           PASS │
                                v
                              STOP
```

A FAIL names the file and a test that fails on the old code. One author fixes that hole. A second session waits while the verdict is open. Re-review that new head. A hole the new test did not lock returns to ONE FIX. A PASS ends the plate. A note stays a note and does not open another lap.

Forward-motion. Critic FAILs only for wrong live behavior, for security, spend, or on-chain risk, or for a plate or OP-PROC line that would send a seat the wrong way. Anything else is APPROVE plus a linked follow-up issue for the author. A bug fix ships when it fixes the bug and breaks nothing. A feature's rule is written before merge. After round 2, only an original blocker can fail; a new finding is an issue. Doc-only updates: see [Review](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md#review). Critic checks that the words match the code.

stamped · 0xray 4.1.3
