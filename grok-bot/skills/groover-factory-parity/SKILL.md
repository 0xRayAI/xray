---
name: Groover factory parity
description: >-
  use this when registering a seat with Groover identity, minting a suit,
  pinning on-chain identity, or closing register→mint→pin→shops
---
## Multiplicity
Run this **per agent** that needs a DID/pin — after that agent’s suit exists. Do not reuse another agent’s agentId.

# Identity loop: register → mint → pin → shops

Product UI: https://website-production-c0da.up.railway.app/suit  
Read live `AGENTS.md` / `SKILLS.md` on website + registry when present.

## Hard rules
1. Same MCP host for register and mint: `https://groover.rippel.ai/mcp`
2. Save the keypair before register.
3. Live mint and on-chain mirror need a Dynamo PASS citation (governance proof). Register (proof-of-agent) can happen before that.
4. Use the live GRVR contract that accepts the full registry DID (current fleet: GRVR v5).
5. dryRun ≠ live.
6. Pin **our** ERC-8004 agent id — never a demo id (`86025`). GRVR token from `mint_suit` is a different id.
7. Before pin: HTTPS shops card with DID + Dynamo citation + live shop. Then 8004 `register(string)` (**ETH**). Then pin (**USDC**, gasless).

## Self-serve
Implementer reads live skills and runs the loop. Coordinator does not drive it for them.

## Proof
Paste mint tx, **8004 agentId** (not GRVR id), pin `listed: true`, and `GET /v1/catalog` row.
