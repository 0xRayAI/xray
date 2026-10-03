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

stamped · 0xray 4.0.36
