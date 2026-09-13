---
name: Fasten suit and hangar
description: >-
  use this when planting mill+inspect on a Grok Bot project, and optionally
  hangar shops
---
# Fasten suit (+ optional hangar shops)

## Steps
1. Enter a project with `package.json`.
2. `npm i 0xray@4.0.12 @0xray/foundry@0.1.10` (add hangar package only if planting shops).
3. `npx @0xray/foundry mint --skip-live` — thin mill plant only.
4. Confirm inventory: `suit: "fastened"`, mill + inspect present, `costume: false`.
5. `npx @0xray/foundry inspect --skip-live` → `ok: true`.
6. Optional shops: only if this seat uses the hangar economy.
7. Report DNA, skills, and gaps. Spend needs human approval.

## Do not
Dump dozens of skills. Set costume true for fleet seats. Treat chat green as wear proof.

Identity register → mint → pin: see **Groover factory parity**.
