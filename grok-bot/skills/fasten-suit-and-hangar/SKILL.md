---
name: Fasten suit and hangar
description: >-
  use this when fastening mill+inspect on a Grok Bot/consumer project and
  planting groover-hangar shops
---
# Fasten Grok Bot suit + plant hangar

Use when dogfooding mill+inspect on a Grok Bot computer or consumer project, then planting groover-hangar shops.

## Preconditions
- Node 20+
- Project root with `package.json` (never passwd home)
- Prefer **public** `0xray@4.0.10+` / `@0xray/foundry` from npm (post #23/#24). Local tarball only if registry install fails.

## Precision + review
- Execute fastening with receipts (inventory + `inspect` ok=true). Chat LGTM is not a receipt.
- Eng seats: forge executes, critic reviews inspect receipts before the seat is marked worn.
- Mill+inspect only unless the seat explicitly needs hangar shops (no costume dump).

## Steps
1. Create or enter the consumer project (`package.json` required).
2. `npm i 0xray@latest @0xray/foundry@latest` (and `groover-hangar@latest` only if planting shops).
3. Fasten mill plant only (not 45/42 costume):
   `npx @0xray/foundry mint --skip-live`
4. Confirm `.xray/foundry-inventory.json` has `suit: "fastened"` and `millPlant.skills` includes `mill` and `inspect`.
5. Optional shops: `npx groover-hangar` — only if this seat touches hangar economy.
6. If inspect fails with costume dump on `shop-*`, allowlist those skill names in `.xray/foundry-inventory.json` `tree.skills`, then re-run `npx @0xray/foundry inspect --skip-live`. Do **not** set `"costume": true` unless you intentionally want the 45/42 dump.
7. Report DNA, fastened skills, hangar shops (if any), and gaps (pay path needs funded OWS; no capital without human approval).

## Do not
- Mill-plant Clearing into 0xray
- Sign x402 / spend USDC without explicit human approval
- Treat chat green as a receipt — use inventory + inspect
- Dump all 45 skills / 42 agents onto a Grok Bot seat

## Factory parity (identity)
Mill+hangar alone ≠ `/suit` parity. For register → mint → pin see skill **Groover factory parity** (`groover-factory-parity`).
Registration issues `{ did, apiKey }` — do not invent a Groover API key before register.
