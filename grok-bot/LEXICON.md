# Fleet lexicon (plain)

Stamp products: `ops/dist/brand/STAMPS.md`. The pack [OP-PROC](OP-PROC.md) and [runbooks](runbooks/) use these words; if they disagree, this lexicon wins. This file = **words we use**, grouped so product ≠ workstream ≠ practice.

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
| **repertoire** | Optional **organ** — compact/memory heat on CLI/cloud suits. Not required for every seat. Heat ≠ fastened |

---

## 2. Workstream (how the fleet runs)

Ops nouns — clocks, tickets, roles, decks. Not products.

| Term | Plain gloss |
|------|-------------|
| **beat** | One real event on a card: pull request opened or pushed, review verdict, CI result, merge, merge-queue tick, owner message, or blocker. A watcher run whose start and end fall in the same second is not a beat |
| **wave** | Stretch of beats toward one outcome (ship, dist week, proof) |
| **board** | Where open work is visible (`WAVEBOARD`). Cards grouped by stage |
| **card** | One GitHub issue or pull request (`repo#number`): title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), state (`live`, `parked`, or `closed`) |
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
| **organ** | Optional module inside the suit/plant (mill, inspect, repertoire…). Not the whole 0xRay OS. Fasten to use; don’t call it live from heat alone |
| **wear** | Run with a suit fastened (verb). “Wear check” = `foundry inspect`. Costume ≠ wear |

---

## Don’t confuse

| Pair | Diff |
|------|------|
| suit ≠ 0xRay | kit ≠ whole power plant |
| mill ≠ plant (verb) | mill = product organ; plant = fasten act (or colloquial floor) |
| dist ≠ product | lane/workstream for announcing products |
| beat ≠ card | a real event on a card ≠ the card |
| station ≠ board | CoS deck ≠ full WAVEBOARD |
| card ≠ receipt | assign ≠ proof |
| group ≠ Station | chat bus ≠ durable deck |
| pin (shop) ≠ pin (verb on-chain) | shop name vs Groover pin step — say which |
| organ ≠ product SKU | repertoire is an organ of 0xRay; Clearing is a product |
| heat ≠ fastened | Station “Repertoire: on” ≠ live `node_modules` organ |
| wear ≠ plant (verb) | wear = run suited; plant = fasten the suit/organs onto a project |
| wear ≠ costume | files on disk without live hooks/inspect = theater |
| chime ≠ reflexive ack | needed interrupt / soft override — not Cadence HARD refuse-all |
| packet ≠ ack | seven fields on a card ≠ a reflexive chime |
| EXECUTE ≠ draft | armed ship ≠ proposed copy |
| EXECUTE ≠ packet | armed Dist/action ≠ the handoff object |

Locked 2026-09-14 with Blaze — categorized.

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

## Lexicon add (2026-10-05 — chime)
| Term | Bucket | Plain |
|------|--------|-------|
| **chime** | Practices | Needed interrupt that **supersedes** a gentle redirect (soft override). Use when the soft redirect isn't enough. Not a reflexive ack / ping — those stay refused under Cadence HARD. |

## Lexicon add (2026-10-05 — inter-bot)
| Term | Bucket | Plain |
|------|--------|-------|
| **packet** | Workstream | A card's seven fields: goal, constraints, path, acceptance, evidence, next owner, escalate. From a `## Packet` block or one line. Missing acceptance or next owner makes the card amber (`no packet`). Evidence fills from the latest beat. |
| **EXECUTE** | Practices | Armed Dist/action order with exact copy + gates; herald/seat ships only on EXECUTE (not draft/FYI). Distinct from a packet (the packet may *carry* an EXECUTE). |
| **handoff** | Workstream | The channel or file that *carries* a packet (`ops/handoffs/…` or a seat message). The packet is the content; the handoff is the pipe. |

## Lexicon add (2026-10-05 — watchers)
| Term | Bucket | Plain |
|------|--------|-------|
| **watcher** | Workstream | Signal→ticket queue: watches git/X activity and opens or bumps a board card. Does not ship or merge. |
| **workstream** | Workstream | Card/seat lane on the board (how work runs). ≠ product SKU. ≠ planes. |

Don't confuse: watcher ≠ Dist; workstream ≠ product; workstream ≠ planes.

## Lexicon add (2026-10-09 — waveboard)
| Term | Bucket | Plain |
|------|--------|-------|
| **card** | Workstream | One GitHub issue or pull request (`repo#number`). Title, url, owner seat, stage (`open` > `review` > `fix` > `merge` > `retest` > `done`), state (`live`, `parked`, or `closed`). |
| **packet** | Workstream | That card's seven fields. Cap 200 characters. Allowlisted links. Amber `no packet` badge when acceptance or next owner is missing. |
| **beat** | Workstream | One real event: opened or pushed, review verdict, CI, merge, merge-queue tick, owner message, or blocker. A watcher whose start and end fall in the same second is never a beat. |

## Lexicon add (2026-10-14 — bifrost)
| Term | Bucket | Plain |
|------|--------|-------|
| **Bifrost** | Workstream | The fleet's live board and router (burst-live): turns every issue, PR and comment into a card and an inbox line, then wakes the seat. |
| **tripwire** | Workstream | Fires when nothing has moved for a window: a stalled board wakes each card owner with a deadline; an empty board wakes the coordinator to pull the next issue. At most once per window. |
| **nudge** | Workstream | A stuck card or unacked line pings its owner L1, L2, L3; at L3 the coordinator is woken once to reassign or split it. |
| **routing** | Workstream | Which seat gets which line. The routing map lists each seat once with its real GitHub login and nicknames; served read-only at `/routing`. Look a login up there before any @-mention. |
| **two loops** | Workstream | Outer loop: GitHub issues, PRs and @-comments (the record). Inner loop: seat DMs, each pointing at one of them (the wake). |
| **volley** | Workstream | Packet ping-pong between seats inside a wave: ask, answer, fix, re-check. |
| **tandem** | Workstream | The governor: seats moving together across both loops. Without it Bifrost stalls. |

## Lexicon add (2026-10-14 — OP-PROC terms)
Every bolded term in the pack OP-PROC and runbooks is defined here (`bifrost check --only lexicon`).
| Term | Bucket | Plain |
|------|--------|-------|
| **ack** | Workstream | The receipt a seat sends after it handles an inbox line (`live-inbox <seat> --ack <id>`). Plain seat-key call, never an approval card. |
| **coordinator** | Workstream | The CoS role: owns the board, comes in through tripwire and nudge, reassigns or splits stuck cards. |
| **coordinator never** | Workstream | What the coordinator never does: deploy, publish, change production, launch cloud agents, post in public, spend, merge. |
| **done** | Workstream | A live receipt (URL, registry view, Release URL, or reviewer PASS). Green CI alone is not done. |
| **handoff = packet + wake** | Workstream | The inner-loop handoff: the packet on the seat's inbox is the record; the DM pointing at it is the wake. Never one without the other. |
| **implementer** | Workstream | The seat that writes code and opens PRs (ours: mill). |
| **publisher** | Workstream | The ship seat: keeps continuity and gates, merges and deploys after review (ours: forge). |
| **reviewer** | Workstream | Writes PASS or FAIL, never merges; runs `bifrost check` after deploy (ours: critic). |
| **review** | Workstream | The reviewer's pass tier: Light / Normal / Strict, chosen by scope. |
| **specialists** | Workstream | Optional seats for public posts, listings and audio. |
| **human owner** | Workstream | The person who owns money, credentials, deletes, publishing and taste. |
| **owner** | Workstream | In `house/`: who the human owner is. On a card: the seat that fixes it. |
| **roles** | Workstream | The seat field is a role (implementer, publisher, reviewer, coordinator, specialists), not a personal name. |
| **seat** | Workstream | Named bot role on the board; `house/` lists the fleet's seats. |
| **new seat before any ship work** | Workstream | The hire gate: role description, fastened suit with inspect receipt, orientation, ack, then the first card. |
| **runbooks** | Workstream | Each seat's how-to in the pack (`grok-bot/runbooks/`), not in a seat's memory. |
| **names** | Workstream | Docs and plates carry current seat, login and tool names; `bifrost check` greps for stale ones. |
| **floor** | Workstream | Gates A and C on every merge; B and D set per PR by scope. |
| **gate b runs on the owner's machine** | Workstream | Gate B (packed tarball + per-environment checklist) runs locally on the human owner's machine, never in the cloud. |
| **disk, not chat** | Workstream | After a compact, resume from station, board and memory on disk, not from chat. |
| **you first** | Workstream | The human's direct message beats bot pings; an open inbox line is the job, not a ping. |
| **public voice** | Workstream | The fleet's public account, spacing and reply style, set in `house/`. |
| **quiet** | Workstream | Say nothing when someone only repeats CLOSED, MERGED or LIVE. |
| **money and ship** | Workstream | Ask first before publish, production change, pay, secrets or delete, unless `house/` names an exception. |
| **house** | Workstream | The team's own rules folder (`house/`): owner, seats, public voice, allowed, ask first, board. |
| **allowed** | Workstream | In `house/`: actions a seat may take without asking. |
| **ask first** | Workstream | In `house/`: actions that need the human owner's yes first. |
| **all three** | Workstream | New cloud agent only when every one of the three conditions holds: the context agent has 2+ jobs queued, the job touches different files, and it can be briefed from docs alone. |
| **hotfix** | Workstream | A broken production change ships right away on its own PR, with NO critic review before merge, and adds a regression test that fails without the fix and passes with it (green CI = tests, stamp, docs check; no new test, no merge). Then forge merges on green CI and deploys once, then critic does one live pass on production. If that pass fails, the next fix is another hotfix. The usual review process follows afterward. [Steps](runbooks/SHIP.md#hotfix). |
