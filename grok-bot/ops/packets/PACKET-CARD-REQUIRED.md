# Packet: a cloud agent needs a board card

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This file is the whole change. No board, launch, or collector code is edited here.

## Packet

- goal: A packet post creates a board card, and a launch refuses when the card id is missing. The cloud agent pushes. The seat App opens the pull request. The server attaches both, with no new activity field.
- constraints: Packet only. No code here. Say owner. No personal names. No new activity field. The push-only sentence stays. A holding card does not 503 the board.
- path: This file is the card. After packet PASS, one follow-up edits the files and the sentences below.
- acceptance: The wake step keeps the push-only sentence, the launch refuses a missing card id, and the three review notes are decided in this file.
- gates: Card only. B and D stay off. A and C wait on the follow-up. Doc-only updates: see [Review](../../OP-PROC.md#review).
- evidence: The review on this packet, the wake template test, cardKeyOf, isPacket, validActivity, and /healthz.
- next owner: reviewer, for packet PASS.
- escalate: owner, if a holding card must not be launched until it is repo#number.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/record-map.md`.

## Scope

Owner rule: every packet has a card on the Bifrost wave board, and a cloud agent does not run without one.

Three behaviors, in one follow-up:

1. A packet post creates the card in the same call when the board does not already have that id.
2. The owner's chat, and the launch path it calls, read `GET /cards` first. They do not launch or resume when that card id is missing. A missing id is not a launch.
3. The cloud agent pushes its branch only and never opens a pull request or an issue. The seat App opens the pull request (`house/live/tools/open-pr`). The server attaches that branch and that pull request to the same card. The activity line gains no new field.

Card id. Inbox lines always carry an integer `number` (`inboxLineError` in `house/live/app/server.mjs`). A positive number is `number >= 1`. A non-positive number, including zero, is the holding case. When the line has a repo and `number >= 1`, the id is `repo#number` with the repo lowercased. Otherwise the id is `packet:<line id>` until a pull request attaches. The attach rewrites `key` to `repo#number` and keeps the old id as `alias`. One card per id. A card that is already `repo#number` keeps that id. The seat App does not open a second pull request for it.

`cardKeyOf` in `house/live/app/arch1-launch.mjs` uses `Number.isInteger`, and `Number.isInteger(0)` is true, so a zero today becomes `repo#0`. Card create and `cardKeyOf` share one rule: `number >= 1`. A zero is `packet:<line id>`. It is never `repo#0` and never `line:<id>`.

A holding id fails `CARD_REF` in `house/live/app/worktrack.mjs`. That check stays. A `packet:<line id>` that is on the board is a legal card and a legal launch. It is not `card missing`.

Attach, with no new activity field. The launch file already maps a card key to an agent id (`arch1CloudLinks` in `server.mjs`). The server writes `branch` on that card from a push event field `branch`, `head_ref`, or `ref`. The seat App opens the pull request. A collector `pr_open` whose head matches that branch sets `repo`, `number`, and `url`, and a holding key rewrites to `repo#number` with the old id on `alias`. The cloud row `pr` comes from the webhook pull URL already stored, or from the card url after attach.

`cards_behind` stays the lag clock (`lagWorthy` / `cardsBehindData`). `healthBody` sets `ok` from feed quiet and that clock, and `/healthz` returns 503 when `ok` is false. One `cards_behind` row 503s the whole board. A holding card does not set `cards_behind`. A `card missing` flag does not set `cards_behind`. Nudge still sees a live holding card (`evalNudges`). A row with neither a board card id nor a pull URL may show `flag: card missing` on the server-built board object only. That flag is not posted to `/activity`.

What the board does today, and what the follow-up changes:

- Cards are born in `house/live/feed/live_board.py` `model` from `pr_open` and `issue_open` only. `postSeatLines` stores the inbox line and calls the launch `consider`. It does not create a card. `lineCard` matches repo and number, so a holding card is found by its key. `settledLine` already returns false when `number < 1`, and a missing card is not settled.
- `acceptWaveCards` replaces the wave list when the collector sends a non-empty list. `retainSeedCards` keeps plan and wave cards only. A card written only in server memory disappears on the next collector pass. The follow-up keeps a packet-born card until the collector sends the same key. The collector card wins on that key.
- `evalNudges` walks board cards. A cloud row whose card is empty is invisible to that walk. A live holding card is on the board, so the walk sees it.
- The launch module is `house/live/app/arch1-launch.mjs` (`createArch1Launch`, `run`, `cardKeyOf`). There is no `house/live/tools/arch1-launch.mjs`. `run` posts `/v0/agents` for `dispatch` and `ready` with no board lookup. `ownsCard` applies only to `critic_fail`, and a miss returns with no beat. The prompt already contains `Push the branch only. Never open a pull request or an issue.`
- `boardCloudAgents` copies a launch-file card only when `CARD_REF` matches, so a `packet:<line id>` link is dropped today. The follow-up keeps that link when the same id is on the board. It does not read a `card` field from activity.
- `validActivity` rejects any field outside `ACT_FIELDS`. `card` is not in that set, so a body that carries `card` is `unknown field`. `grok-bot/ops/cards/CLOUD-AGENT-WORKING-PACKET.md` locks the hook body to `kind`, `action`, `agent`, and `t_ct`. This packet does not add a field to that body.
- `house/live/tools/live-inbox` posts `kind: cloud_agent`, `action: launch` on `--turn start` when `cursor_cloud_id()` is set. That body has no card tag. `house/live/tools/builder-cloud-setup.sh` `live_act launch cloud_agent` is the same kind of record.
- `house/live/feed/watchdog.sh` and `watchFeed` in `server.mjs` watch the feed process. They do not read cards. `house/live/feed/nudges.py` already pulls `/nudges`. Leave both alone.

Card creation calls the exported `isPacket` in `worktrack.mjs`. `PACKET_TYPES` stays private to that file. `isPacket` is true for that set and for a blocker (`isBlocker`). `server.mjs` calls `isPacket`. It does not copy the set. Creating the card does not call `/v0/agents`. Only the kinds `run` already treats as real packets may launch, and only when the card id is on the board.

The new card copies title, url, repo, number, and owner from the line (the line's seat, or `to` when set). Acceptance stays empty until the GitHub body packet is parsed (`house/live/feed/live_packet.py`). Missing acceptance keeps the amber `no packet` badge. Do not invent acceptance.

## Review notes

Decided here, for the follow-up:

1. "No number" means a non-positive integer, including zero. `cardKeyOf` and card create share `number >= 1`. Zero is `packet:<line id>`.
2. A holding id on the board is a legal launch. It does not set `cards_behind`. A `card missing` flag does not set `cards_behind` either. `/healthz` stays 200 while the lag clock is current, and 503 only when that clock is behind.
3. The shared check is `isPacket`. The follow-up does not import or copy `PACKET_TYPES`.

## Files

Not this change. The follow-up edits these:

- `house/live/app/server.mjs` — `postSeatLines` calls `ensurePacketCard` after a stored line when `isPacket` is true. `setCards` / `publishBoard` keep that card across a collector replace. `evalNudges` treats a live holding card with no beat as a nudge (same L1, L2, L3). `cardsBehindData` stays the lag clock.
- `house/live/app/wave-schedule.mjs` — `retainSeedCards` also keeps a packet-born card whose key the collector list does not have. A collector card with the same key wins. `oneWave` already keeps a card with no wave field.
- `house/live/app/arch1-launch.mjs` — `cardKeyOf` uses `number >= 1`. `run` asks the board before `postApi`. No card id on the board means no `POST /v0/agents` and no follow-up, and the server-built row records `card missing`. A holding card on the board launches under `packet:<line id>`. The prompt keeps `Push the branch only. Never open a pull request or an issue.` When `number` is not `>= 1`, the `Card:` line prints the holding id. `ownsCard` stays the seat check for `critic_fail`.
- `house/live/app/worktrack.mjs` — no change to `PACKET_TYPES`. `boardCloudAgents` keeps a launch-file card that is on the board, including `packet:<line id>`. An activity body is unchanged. Webhook `pr` still fills the row.
- `house/live/feed/live_board.py` — `model` copies `branch`, `head_ref`, or `ref` onto the card the server already holds. A later `pr_open` whose head matches that branch rewrites a holding key to `repo#number` and keeps the old id on `alias`.
- `grok-bot/OP-PROC.md` — the sentences in the next section. Leave the seat-identity sentence as it is.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — the step 4 sentences in the next section. Keep the sentence that a cloud agent pushes its branch only and never opens a pull request or an issue.
- `docs-site/docs/plates/bifrost.md` — one sentence: a packet post creates the card; the chat refuses a missing card id; the cloud agent pushes; the seat App opens the pull request; the server attaches both; the activity line gains no new field.
- `grok-bot/LEXICON.md` — one clause on the **card** row: a packet post creates it, a cloud agent does not run without its id, the cloud agent pushes, the seat App opens the pull request, and the server attaches both. The lexicon wins when it disagrees with OP-PROC, so the clause lands in the same follow-up.

Leave these alone:

- `house/live/feed/watchdog.sh` and `house/live/feed/nudges.py`.
- `house/live/tools/live-inbox`, `house/live/tools/builder-cloud-setup.sh`, and `house/live/tools/open-pr`. The seat App path stays `open-pr`. Do not add a field to the activity body.
- `grok-bot/ops/cards/CLOUD-AGENT-WORKING-PACKET.md`.

## OP-PROC wording

Append to the end of the **Card** bullet in `grok-bot/OP-PROC.md`:

A packet post creates the card on the Bifrost board in the same call. The card id is `repo#number` when the packet names a positive number. A non-positive number, including zero, uses `packet:<line id>` until a pull request attaches, and then the id becomes `repo#number`. One card per id. A cloud agent does not run without that id on the board.

Append to the end of the **Packet** bullet:

Posting the packet (`POST /inbox`, including a handoff) creates the card when the board does not already have that id. A chat line that never hits the board is still not a card.

Append to the **Clouds + churn** cell, after the sentence that there is one cloud agent per card:

The owner's chat launches or resumes a cloud agent only when `GET /cards` shows that card id. No card id means no launch. The cloud agent pushes its branch only and never opens a pull request or an issue. The seat App opens the pull request. The server attaches that branch and that pull request to the card. The activity line gains no new field.

## WAKE-ROUTINE wording

In `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` step 4, keep this sentence where it already stands:

A cloud agent pushes its branch only and never opens a pull request or an issue.

After that sentence, add:

That chat reads `GET /cards` first. It does not launch or resume when the card id is missing. A missing id is not a launch. The cloud agent pushes its branch only. The seat App opens the pull request. The server attaches that branch and that pull request to the same card. The activity line gains no new field.

## Tests

The follow-up adds tests that fail when the behavior is reverted. This change adds none.

- `house/live/tests/packet-card.test.mjs` (new). A `POST /inbox` packet with `repo` and `number >= 1` and no existing card shows that `repo#number` on `GET /cards`, state `live`, owner from the line. A second post does not duplicate it. `number` 0 creates `packet:<line id>` and does not create `repo#0`. A non-empty collector list passed through `acceptWaveCards` / `retainSeedCards` keeps the packet card, and a collector card with the same key replaces it. A push event sets `branch`. A `pr_open` whose head matches that branch sets `key` to `repo#number` and leaves the old id on `alias`. A card that is already `repo#number` keeps that id. No stored activity line carries `card`.
- `house/live/tests/arch1-launch.test.mjs`. A `dispatch` whose card id is not on the board does not `POST /v0/agents` and records `card missing`. The same line with the card on the board still launches. `number` 0 does not launch as `repo#0`. With a holding card on the board it launches under `packet:<line id>`. The prompt still contains `Push the branch only. Never open a pull request or an issue.` A `critic_fail` with no card records `card missing` and does not launch.
- `house/live/tests/cloud-board.test.mjs`. A launch-file link `packet:<line id>` that is on the board keeps `card`. An activity body that includes `card` is rejected by `validActivity`. A webhook pull URL still fills `pr`.
- `house/live/tests/cards-lag.test.mjs`. A holding card, and a server-built `card missing` flag, leave `/healthz` at 200 when the lag clock is current. `/healthz` is 503 only when that clock is behind.
- `house/live/tests/nudge-escalation.test.mjs`. A live packet card with no beat nudges L1 to the card owner. A holding card with no beat does the same. A beat after the pull request attaches closes that nudge.
- `house/live/tests/test_wake_template.py` `test_wake_never_launches_or_resumes`. Step 4 still contains `pushes its branch only` and `never opens a pull request or an issue`. The follow-up keeps those assertions.

`src/__tests__/unit/grok-bot-house-template.test.ts` already requires the ops banner once, in the first six lines of every `grok-bot/ops/**/*.md`. This file keeps that banner.

## Out of scope

Code, lexicon edits, and plate edits in this change. Renaming the launch module. A second nudge ladder. Teaching `house/live/feed/watchdog.sh` to call GitHub. A new activity field, including `card`. Inventing acceptance text. A card for an inbox line that is not a packet. Opening a pull request from the cloud agent.
