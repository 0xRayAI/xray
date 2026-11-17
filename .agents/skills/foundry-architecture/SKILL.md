---
name: foundry-architecture
description: >
  Read the foundry architecture plate. Use when the foundry's own parts,
  the job mailbox, NEAR escrow, or the Clearing payee is the page.
---

# foundry-architecture

The plate is `docs-site/docs/plates/foundry-architecture.md`.

1. Read the plate left to right. The buyer is the edge. The foundry is the pipe.
2. Cite `grok-bot/lib/foundry-create.cjs` for the record and `grok-bot/lib/near-escrow.cjs` for fund, accept, and refund_late.
3. Base USDC is testnet-first. The xray#1144 row is the only mainnet line.
4. The mailbox, `post_job`, and `<acct>.testnet.page` are tagged building. Do not draw them as files in this tree.
5. Hosted Clearing is optional. clearing#41 is merged.
