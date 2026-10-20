# Packet: a cloud agent needs a board card

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This file is the whole change. No board, launch, or collector code is edited here.

## Packet

- goal: A packet post creates a board card, and a cloud agent does not run without that card id. The branch and pull request attach to the same card so nudge and the board watchdog see it.
- constraints: Packet only. No code in this change. Say owner. No personal names. The cloud-working activity body stays as it is. The process watchdog stays a process loop.
- path: This file is the card. After packet PASS, one follow-up edits the files and the OP-PROC and wake lines below.
- acceptance: The file names the scope, the files, the OP-PROC and wake sentences, and the tests. No code lands here.
- gates: Card only. B and D stay off. A and C wait on the follow-up. A docs-only change does not wait on CI.
- evidence: Launch module, postSeatLines, evalNudges, retainSeedCards, boardCloudAgents, live_board.model, the wake template, and the live board.
- next owner: reviewer, for packet PASS.
- escalate: owner, if a packet with no repo number must not create a holding card.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/record-map.md`.

## Scope

Owner rule: every packet has a card on the Bifrost wave board, and a cloud agent does not run without one.

Three behaviors, in one follow-up:

1. A packet post creates the card in the same call when the board does not already have that id.
2. A launch that would start a cloud agent refuses when that card id is missing, and the board row is flagged `card missing`. A launch record that arrives without a card id is flagged the same way. It does not start a second agent.
3. The branch and the pull request attach to that card id. Nudge and the board watchdog follow that id.

Card id. When the inbox line has a repo and a positive integer number, the id is `repo#number` with the repo lowercased. When it does not, the id is `packet:<line id>` until a branch or a pull request attaches. The attach rewrites `key` to `repo#number` and keeps the old id as `alias`, so an open nudge and a cloud row still resolve.

What the board does today, and what the follow-up changes:

- Cards are born in `house/live/feed/live_board.py` `model` from `pr_open` and `issue_open` only. `house/live/app/server.mjs` `postSeatLines` stores the inbox line and calls the launch `consider`. It does not create a card. `lineCard` is the lookup. `settledLine` already treats a missing card as not settled.
- `acceptWaveCards` replaces the wave list when the collector sends a non-empty list. `retainSeedCards` keeps plan and wave cards only. A card written only in server memory disappears on the next collector pass. The follow-up keeps a packet-born card until the collector sends the same key. The collector card wins on that key.
- `evalNudges` walks board cards. `nudgeLines` stores `card: ''` for an unacked inbox line. A cloud row with an empty card is invisible to that walk.
- The launch module is `house/live/app/arch1-launch.mjs` (`createArch1Launch`, `run`, `cardKeyOf`). There is no `house/live/tools/arch1-launch.mjs`. `cardKeyOf` falls back to `line:<id>` when repo and number are missing. `run` posts `/v0/agents` for `dispatch` and `ready` with no board lookup. `ownsCard` applies only to `critic_fail`, and a miss returns with no beat. `line:<id>` fails `CARD_REF` in `boardCloudAgents`, so `arch1CloudLinks` does not leave a usable card on the row.
- `house/live/tools/live-inbox` posts `kind: cloud_agent`, `action: launch` on `--turn start` when `cursor_cloud_id()` is set. That body has no card tag. `house/live/tools/builder-cloud-setup.sh` `live_act launch cloud_agent` is the same kind of record. `grok-bot/ops/cards/CLOUD-AGENT-WORKING-PACKET.md` locks a later hook body to `kind`, `action`, `agent`, and `t_ct` only. This packet does not add a card field to that body. The server flags the row.
- `house/live/feed/watchdog.sh` and `watchFeed` in `server.mjs` watch the feed process. They do not read cards. The board watchdog is `cardsBehindData` / `lagWorthy`: a `pr_open` the board has not carded still counts, and `/healthz` reports `cards_behind`. Extend that. Do not teach the process loop about GitHub.

Packet types that create a card are the set in `house/live/app/worktrack.mjs` `PACKET_TYPES`: `dispatch`, `ready`, `packet`, `critic_fail`, `needs_human`. A handoff already posts `type: packet` with `repo` and `number` (`live-inbox` handoff block). Creating the card does not by itself call `/v0/agents`. Only the kinds `run` already treats as real packets may launch, and only after the card id is on the board.

The new card copies title, url, repo, number, and owner from the line (the line's seat, or `to` when set). Acceptance stays empty until the GitHub body packet is parsed (`house/live/feed/live_packet.py`). Missing acceptance keeps the amber `no packet` badge. Do not invent acceptance.

## Files

Not this change. The follow-up edits these:

- `house/live/app/server.mjs` — `postSeatLines` calls `ensurePacketCard` after a stored packet line. `setCards` / `publishBoard` keep that card across a collector replace. `evalNudges` treats a `card missing` row as a live card with no beat (same L1, L2, L3). `cardsBehindData` counts a running row with that flag, so `/healthz` `cards_behind` is true until the card id is attached.
- `house/live/app/wave-schedule.mjs` — `retainSeedCards` also keeps a packet-born card whose key the collector list does not have. A collector card with the same key wins. `oneWave` already keeps a card with no wave field.
- `house/live/app/arch1-launch.mjs` — `run` asks the board before `postApi`. No card id, no `POST /v0/agents` and no follow-up. `rememberBeat` with `card missing`. `ownsCard` stays the seat check for `critic_fail` and is not the card-id check.
- `house/live/app/worktrack.mjs` — `boardCloudAgents` sets `flag: 'card missing'` when the row has no `CARD_REF` card. A later `tag` or pull URL fills `card` through `cardRefOf` and clears the flag. Store `branch` from the webhook ref or the activity tag when the tag is not a card id.
- `house/live/feed/live_board.py` — `model` copies `branch` or `head_ref` onto the card. A packet-born card whose `branch` matches a later `pr_open` adopts that `repo#number`.
- `grok-bot/OP-PROC.md` — the sentences in the next section.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — the step 4 sentences in the next section.
- `docs-site/docs/plates/bifrost.md` — one sentence: a cloud agent does not run without a card id; a packet post creates that card; the branch and the pull request stay on it; nudge reads that same id.
- `grok-bot/LEXICON.md` — one clause on the **card** row: a packet post creates it, a cloud agent does not run without its id, and the branch and the pull request attach to that id. The lexicon wins when it disagrees with OP-PROC, so the clause lands in the same follow-up.

Leave these alone:

- `house/live/feed/watchdog.sh` — process loop. The flag is visible on `/healthz`, which this loop does not parse.
- `house/live/feed/nudges.py` — it already pulls `/nudges`. The server emits the nudge with the card id set.
- `house/live/tools/live-inbox` and `house/live/tools/builder-cloud-setup.sh` — do not add a card field to the activity body the cloud-working packet locked. The server flags a row that has no card id.
- `house/live/app/arch1-launch.mjs` prompt text — do not put a seat's name in it. The card id is already on the `Card:` line when the line has repo and number.

## OP-PROC wording

Append to the **Card** bullet in `grok-bot/OP-PROC.md`, after the sentence that a chat ping is not a card:

A packet post creates the card on the Bifrost board in the same call. The card id is `repo#number` when the packet names one. Otherwise the id is `packet:<line id>` until a branch or pull request attaches, and then the id becomes `repo#number`. One card per id. A cloud agent does not run without that id on the board.

Append to the **Packet** bullet, after the sentence that a missing acceptance or next owner makes the card amber:

Posting the packet (`POST /inbox`, including a handoff) creates the card when the board does not already have that id. A chat line that never hits the board is still not a card.

Append to the **Clouds + churn** cell, after the sentence that there is one cloud agent per card:

The owner's chat launches or resumes a cloud agent only when `GET /cards` shows that card id. No card id means no launch. The row is flagged `card missing`, and nudge and the board watchdog both see that flag. The branch and the pull request attach to that same card id.

## WAKE-ROUTINE wording

In `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` step 4, after the sentence that only the owner's persistent chat launches or resumes a cloud agent, add:

That chat reads `GET /cards` first. It does not launch or resume when the card id is missing. A missing id is flagged `card missing` and is not a launch. The launch writes the card id on the cloud row. When the run opens a branch or a pull request, that branch and that pull request are written onto the same card before the next turn.

## Tests

The follow-up adds tests that fail when the behavior is reverted. This change adds none.

- `house/live/tests/packet-card.test.mjs` (new). A `POST /inbox` packet with `repo` and `number` and no existing card shows that `repo#number` on `GET /cards`, state `live`, owner from the line. A second post does not duplicate it. A packet with no number creates `packet:<line id>`. A non-empty collector list passed through `acceptWaveCards` / `retainSeedCards` keeps the packet card, and a collector card with the same key replaces it. Attaching a pull URL sets `key` to `repo#number` and leaves the old id on `alias`.
- `house/live/tests/arch1-launch.test.mjs`. A `dispatch` whose card id is not on the board does not `POST /v0/agents` and records `card missing`. The same line with the card on the board still launches. A `critic_fail` with no card records `card missing` and does not launch. A follow-up is refused the same way.
- `house/live/tests/cloud-board.test.mjs`. A launch link or activity row with no `CARD_REF` card has `flag` `card missing` and an empty `card`. A later pull URL or `repo#number` tag fills `card` and clears the flag. A branch tag sticks on `branch` and does not clear a card that is already set.
- `house/live/tests/cards-lag.test.mjs`. A running cloud row flagged `card missing` makes `/healthz` `cards_behind` true. After the pull request is attached to that card, the flag is clear and `cards_behind` follows the card clock again.
- `house/live/tests/nudge-escalation.test.mjs`. A live packet card with no beat nudges L1 to the card owner. A `card missing` row does the same. A beat after the pull request attaches closes that nudge.

`src/__tests__/unit/grok-bot-house-template.test.ts` already requires the ops banner once, in the first six lines of every `grok-bot/ops/**/*.md`. This file keeps that banner. The follow-up does not add a wake-text assertion unless a test starts pinning the old step 4 sentence.

## Out of scope

Code, lexicon edits, and plate edits in this change. Renaming the launch module. A second nudge ladder. Teaching `house/live/feed/watchdog.sh` to call GitHub. Putting a card field on the cloud-working activity body. Inventing acceptance text. A card for an inbox line that is not a packet type.
