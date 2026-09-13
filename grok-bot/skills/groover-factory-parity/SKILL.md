---
name: Groover factory parity
description: >-
  use this when registering a seat with Groover identity, minting a suit,
  pinning on-chain identity, or closing register→mint→pin→shops
---
# Identity loop: register → mint → pin → shops

Product UI: https://website-production-c0da.up.railway.app/suit  
Read live `AGENTS.md` / `SKILLS.md` on website + registry when present.

## Hard rules
1. Same MCP host for register and mint: `https://registry-production-e2c4.up.railway.app/mcp`
2. Save the keypair before register.
3. Live mint and on-chain mirror need a Dynamo PASS citation (governance proof). Register (proof-of-agent) can happen before that.
4. Use the live GRVR contract that accepts the full registry DID (current fleet: GRVR v5).
5. dryRun ≠ live.
6. Pin **our** agent id — never a demo id.

## Self-serve
Implementer reads live skills and runs the loop. Coordinator does not drive it for them.

## Proof
Paste mint tx, agent id, pin payment/settle, and live doc curls when claiming Done.
