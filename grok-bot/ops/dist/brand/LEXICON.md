# Fleet lexicon (plain)

Stamp products: `STAMPS.md`. This file = **words we use**, grouped so product ≠ workstream ≠ practice.

**One line:** beats clock the wave → cards on the board → seats in a suit on the mill → CoS steers from station → close with a receipt.

---

## 1. Products (the stack you ship)

Things with a stamp / npm / live URL. Dist talks about these.

| Term | Plain gloss |
|------|-------------|
| **⚡ 0xRay** | Power plant / OS for agents — factory layer |
| **🦾 suit** | Work kit an agent wears (hooks, mill plant, bounds) |
| **🏭 mill** | Build · test · deploy plant *inside* the suit |
| **↗ hangar** | Paid shop front beside the mill |
| **🧾 Clearing** | x402 USDC receipts on Base |
| **🪪 Groover** | Agent identity / DID |
| **〰 ZigZag** | Marketplace / discovery |
| **⚖ Dynamo** | Solar governance — PASS / REJECT |
| **📦 kit** | Setup pack (`@0xray/grok-bot`) |
| **pin** | Hangar shop (+ pay-to-list gate on the board) |
| **OWS** | Local wallet for hangar pay (USDC on Base) |

---

## 2. Workstream (how the fleet runs)

Ops nouns — clocks, tickets, roles, decks. Not products.

| Term | Plain gloss |
|------|-------------|
| **beat** | Timed sync for work (hour / Day-N dist / wave tick). Clocks the loop — not the work itself |
| **wave** | Stretch of beats toward one outcome (ship, dist week, proof) |
| **board** | Where open work is visible (`WAVEBOARD`). Cards + status |
| **card** | One ticket assigned to a **seat**. Done when there’s a receipt (or honest FAIL) |
| **seat** | Named bot role (CoS, forge, critic, herald, magnet…) |
| **station** | CoS primary work deck — durable intent, live track, next beat (survives compact) |
| **receipt** | Proof a card closed (critic PASS, `npm view`, Dist URL). Chat LGTM ≠ receipt |
| **cloud** | Heavy repo surgeon (`bc-…`). Cuts metal; seats run the company |
| **dist** | public distribution **lane** (@0xRayAI) — a workstream, not a product SKU |
| **group / room** | Shared chat bus (ops / eng / dist). Not Station, not memory |
| **capital** | Blaze-only gate: spend, credentials, destructive |

---

## 3. Practices (verbs / bars)

How we act — not a product, not a ticket type.

| Term | Plain gloss |
|------|-------------|
| **plant** | Fasten a suit / hangar / shops **onto** a project (verb). Also “the plant” = mill floor (noun) |
| **foundry / gate** | Ship check before tag / publish (`foundry gate`) |
| **friend-test** | Plain-English bar before Dist or public docs ship |
| **dogfood** | Cold-prove on ourselves before we claim it |

---

## Don’t confuse

| Pair | Diff |
|------|------|
| suit ≠ 0xRay | kit ≠ whole power plant |
| mill ≠ plant (verb) | mill = product organ; plant = fasten act (or colloquial floor) |
| dist ≠ product | lane/workstream for announcing products |
| beat ≠ card | clock ≠ ticket |
| station ≠ board | CoS deck ≠ full WAVEBOARD |
| card ≠ receipt | assign ≠ proof |
| group ≠ Station | chat bus ≠ durable deck |
| pin (shop) ≠ pin (verb on-chain) | shop name vs Groover pin step — say which |

Locked 2026-09-14 with Blaze — categorized.

## Workstream adds (2026-09-14)
| Term | Bucket | Plain |
|------|--------|-------|
| **op proc** | Workstream | Operating procedures — how the fleet runs (docs in `grok-bot/ops/`) |
| **Lane H** | Practices | Human/public plain English + friend-test |
| **Lane B** | Practices | Bot-internal compressed synaptical (token-save) |
| **synaptical** | Practices | Meaningful Compression house style — dense Done/Verify/Next beats |
