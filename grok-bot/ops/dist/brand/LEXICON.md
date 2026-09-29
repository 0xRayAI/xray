# Fleet lexicon (plain)

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Stamp products: `STAMPS.md`. This file = **words we use**, grouped so product ≠ workstream ≠ practice.

**One line:** beats clock the wave → cards on the board → seats in a suit on the mill → CoS steers from station → close with a receipt.

---

## 1. Products (the stack you ship)

Things with a stamp / npm / live URL. Dist talks about these.

| Term | Plain gloss |
|------|-------------|
| **⚡ 0xRay** | The suit. Power plant / OS for agents — factory layer |
| **🦾 suit** | 0xRay core worn (constitution and the rest of the core). One major wear. Not a kit |
| **🏭 mill** | Build · test · deploy plant *inside* the suit. Not an organ |
| **↗ hangar** | Paid shop front beside the mill |
| **🧾 Clearing** | Kit organ for payments. Also x402 USDC receipts on Base |
| **🪪 Groover** | Agent identity / DID |
| **〰 ZigZag** | Marketplace / discovery |
| **⚖ Dynamo** | Kit organ for neural governance. Also Solar PASS / REJECT |
| **🔩 kit** | Four organs only: Repertoire (memory), Goggles (lenses), Dynamo (neural), Clearing (payments). Not a host pack. Not the house |
| **🥽 Goggles** | Kit organ for lenses. Kind 0 is actuality. Kind 1 is the outer planes |
| **🖥 Host Pack** | The suit on a runtime. grok-bot, Hermes, OpenCode, OpenClaw, Grok CLI, Cursor. Not a kit. Harness is hallway speech for this, not a second name |
| **📦 grok-bot** | Host pack package (`@0xray/grok-bot`). Not a kit |
| **pin** | Hangar shop (+ pay-to-list gate on the board) |
| **OWS** | Local wallet for hangar pay (USDC on Base) |
| **repertoire** | Kit organ for memory. `@0xray/repertoire` versus the organ is still open. No product stamp yet. Heat ≠ fastened |

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
| **house** | One team folder (`HOUSE.md` and the board). Not a kit |

---

## 3. Practices (verbs / bars)

How we act — not a product, not a ticket type.

| Term | Plain gloss |
|------|-------------|
| **plant** | Fasten a suit / hangar / shops **onto** a project (verb). Also “the plant” = mill floor (noun) |
| **foundry / gate** | Ship check before tag / publish (`foundry gate`) |
| **friend-test** | Plain-English bar before Dist or public docs ship |
| **dogfood** | Cold-prove on ourselves before we claim it |
| **organ** | Optional module inside the suit/plant (mill, inspect, repertoire…). Not the whole 0xRay OS. Fasten to use; don’t call it live from heat alone |
| **wear** | Run with a suit fastened (verb). “Wear check” = `foundry inspect`. Costume ≠ wear |

---

## Don’t confuse

| Pair | Diff |
|------|------|
| suit = 0xRay core | suit is not a kit |
| kit ≠ host pack | kit = four organs. Host pack = the suit on a runtime. House is not a kit |
| grok-bot ≠ kit | `@0xray/grok-bot` is a host pack package. The old "setup pack" gloss is wrong |
| mill ≠ plant (verb) | mill = the plant inside the suit, not an organ. Plant = fasten act (or colloquial floor) |
| dist ≠ product | lane/workstream for announcing products |
| beat ≠ card | clock ≠ ticket |
| station ≠ board | CoS deck ≠ full WAVEBOARD |
| card ≠ receipt | assign ≠ proof |
| group ≠ Station | chat bus ≠ durable deck |
| pin (shop) ≠ pin (verb on-chain) | shop name vs Groover pin step — say which |
| organ ≠ product SKU | the four kits are organs. Clearing and Dynamo are also products. Repertoire's npm name is still open |
| heat ≠ fastened | Station “Repertoire: on” ≠ live `node_modules` organ |
| wear ≠ plant (verb) | wear = run suited; plant = fasten the suit/organs onto a project |
| wear ≠ costume | files on disk without live hooks/inspect = theater |

Locked 2026-09-14 with Blaze — categorized.
Corrected 2026-09-29: kit means four organs. Host pack is the suit on a runtime. `@0xray/grok-bot` is not a kit.

## Workstream adds (2026-09-14)
| Term | Bucket | Plain |
|------|--------|-------|
| **op proc** | Workstream | Operating procedures — how the fleet runs (docs in `grok-bot/ops/`) |
| **Lane H** | Practices | Human/public plain English + friend-test |
| **Lane B** | Practices | Bot-internal compressed synaptical (token-save) |
| **synaptical** | Practices | Meaningful Compression house style — dense Done/Verify/Next beats |

## Lexicon add (2026-09-15)
| Term | Bucket | Plain |
|------|--------|-------|
| **organ** | Practices | Optional module in the suit/plant |
| **repertoire** | Products (organ) | Optional compact/memory organ — fasten to claim |
| **wear** | Practices | Run with a fastened suit; inspect = wear check |

## Goggles (2026-09-29)

Lenses. Not a host pack. Open the goggles plate to read one level. Do not tell a whole-plane story.

| Term | Plain gloss |
|------|-------------|
| **actuality** | Kind 0. The suit while it is on. Not a plate type |
| **outer plane** | Kind 1. Open set, not a pipeline: dichotomy, syncopate, synthesis, digest, triage, loop. More may exist. Name one and call it a reading |
| **operating plane** | The seven inside the suit: code, OP-PROC, model, suit, mill, host, test/ship. Not an outer plane |
| **kind** | A goggle level. 0 = actuality. 1 = outer planes. Later kinds are not named. Do not invent the count |
| **scope** | When a kind has scope: ecosystem → part → one flow → one artifact |
| **plate** | A stamped drawing in `docs/plates`. Not actuality |
| **synchronicity** | Not placed. Do not attach it to a plane |

Still open, so do not fill them in: kinds after 1, where synchronicity sits, repertoire the organ versus `@0xray/repertoire`, and an ownership plate type. The word list behind the planes stays off this file.
