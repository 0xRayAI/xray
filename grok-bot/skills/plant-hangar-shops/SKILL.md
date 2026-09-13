---
name: Plant hangar shops
description: >-
  use this when planting groover-hangar shops on an agent project that already
  has a suit and (if paying) OWS ready
---
# Plant hangar shops

**Mill is the suit. Hangar is the shops.**

## Preconditions
- Suit fastened for this agent (`fasten-suit-per-agent`)
- OWS ready if you will pay (`setup-ows-pay`)

## Steps
1. From the agent project root:
   ```bash
   npx groover-hangar
   ```
2. Confirm shop list (extract, witness, pin, …) from hangar docs / llms.
3. Smoke: unpaid GET returns 402; with OWS, complete one paid call.
4. If this agent needs identity pin, finish `groover-factory-parity` pin step against **this** agent id (never a demo id).

## Prove
Shop plant output + one 402 and/or paid receipt.

## Do not
Plant hangar as a substitute for mill. Dump costume skills.
