---
name: Plant hangar shops
description: >-
  use this when planting groover-hangar shops on an agent project that already
  has a suit and (if paying) OWS ready
---
# Plant hangar shops

**Mill is the suit. Hangar is the shops.**

Hangar **catalog** is Clearing `GET /v1/catalog`. Groover MCP `list_hangars` reads it. To list: Groover DID + pin (plus Dynamo solar + a live shop). Not a pasted extract/witness/pin table.

## Preconditions
- Suit fastened for this agent (`fasten-suit-per-agent`)
- OWS ready if you will pay (`setup-ows-pay`)

## Steps
1. From the agent project root:
   ```bash
   npx groover-hangar
   ```
2. Discover shops from the catalog (`GET /v1/catalog` or Groover MCP `list_hangars`). Hangar docs / llms are not the only source.
3. Smoke: unpaid GET returns 402; with OWS, complete one paid call against a catalog shop.
4. If this agent needs identity pin (to **list**), finish `groover-factory-parity` pin step against **this** agent id (never a demo id).

## Prove
Shop plant output + catalog row (or `list_hangars`) + one 402 and/or paid receipt.

## Do not
Plant hangar as a substitute for mill. Dump costume skills. Treat a hardcoded shop-route paste as the directory.
