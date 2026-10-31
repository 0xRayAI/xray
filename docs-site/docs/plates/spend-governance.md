---
title: Spend Governance
sidebar_label: Spend Governance
plate_type: state flow
---

# Spend Governance

Every spend passes the gates left to right.

```
┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│CHEAP BY DEFAULT    │ ─── │BUDGET PER DAY      │ ─── │EVIDENCE ON CARD    │ ─── │REVIEWER NOT AUTHOR │ ─── │HUMAN OWNS MONEY    │
│light work,         │     │burn days are       │     │every claim         │     │2nd agent           │     │no spend            │
│light model         │     │named, not drifted  │     │links proof         │     │gates merge         │     │without GO          │
│                    │     │                    │     │                    │     │                    │     │                    │
└────────────────────┘     └────────────────────┘     └────────────────────┘     └────────────────────┘     └────────────────────┘
                                                                                                                                  
ops.0xray.dev/guides/compute-discipline/                                                                                          
```

Spend, credentials, and destructive deletes stay with a person (`grok-bot/ops/OPS-SPEC.md:89`, `grok-bot/LEXICON.md:49`). Publish, production, pay, secrets, and deletes ask first (`grok-bot/OP-PROC.md:62`). Ship, live, security, and identity wait on the strict gate (`grok-bot/ops/OPS-SPEC.md:32`).

The ops site is https://ops.0xray.dev/guides/compute-discipline/.

stamped · 0xray 4.1.5
