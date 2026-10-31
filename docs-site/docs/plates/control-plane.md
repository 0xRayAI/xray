---
title: Control Plane
sidebar_label: Control Plane
plate_type: state flow
---

# Control Plane

One record, one owner, then review.

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ISSUE / PR      │ ─── │CARD            │ ─── │OWNING AGENT    │ ─── │REVIEW          │
│one record      │     │one owner       │     │does the work   │     │ack and merge   │
│of truth        │     │per card        │     │stall, then wake│     │2nd agent       │
│                │     │                │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘
                                                                                       
next card, handoff tracked                                                             
ops.0xray.dev/guides/control-plane/                                                    
```

One issue or pull request is the record, on its own branch, and it does not sit on a second pile (`grok-bot/OP-PROC.md:6`). The queue moves from a source, to an owner, to an artifact, to evidence, to the next owner (`grok-bot/ops/OPS-SPEC.md:26`). The return under the row is that next card, and the handoff stays tracked.

The ops site is https://ops.0xray.dev/guides/control-plane/.

stamped · 0xray 4.1.5
