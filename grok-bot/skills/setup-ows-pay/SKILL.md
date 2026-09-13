---
name: Setup OWS pay
description: >-
  use this when an agent must pay hangar/Clearing shops (USDC on Base) via a
  local Open Wallet (OWS) setup
---
# Setup OWS pay

Hangar shops return **402** until paid. Agents pay with a **local OWS wallet** (USDC on Base) — not a Groover login.

## Steps
1. Install Open Wallet CLI (see https://docs.openwallet.sh ).
2. Create/fund wallet the hangar kit expects (ZigZag hangar kit often uses name `agent-treasury-1` under `~/.ows`).
3. Fund with **USDC on Base**.
4. To call a shop: unpaid GET → read 402 challenge → sign/pay with OWS (`approved=true`) → retry.
5. Alternate signer path may exist (`CLEARING_SIGNER=awal`) — prefer documented hangar README; hosted ZigZag `/sign` may be 410.

## Prove
One successful paid shop response (or pin) with payment id / settle tx when available.

## Do not
Invent API keys for pay. Spend without human approval when policy requires it. Assume MCP pay without OWS.

## Plant links
- Hangar README: https://github.com/htafolla/groover/tree/main/hangar  
- Shops host: https://clearing-production-9968.up.railway.app/  
