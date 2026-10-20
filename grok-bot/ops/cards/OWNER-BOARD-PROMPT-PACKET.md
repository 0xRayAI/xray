# Packet: owner prompts on the board

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This file is the whole change. No skill, board, or inbox code is edited here. The word in the generic rule is **owner**. The owner’s name is set once in house config.

## Packet

- goal: Any inbound message posts one turn. An owner message also posts one prompt. That prompt is the card's first beat. The board counts those prompts and their bytes.
- constraints: Packet only. No code in this PR. One owner prompt, no --from blaze. Note is a fixed summary or omitted, never message text. Tag is wake. No Closes.
- path: Critic PASS on this packet, then one follow-up implements the files below. The one-day overhead reading happens after that follow-up is live.
- acceptance: Any message runs the skill, which points at OP-PROC. One owner --prompt, no --from blaze, then turn start, work, and turn end from the trap. Cloud start is kind turn only. Note has no message text.
- gates: Critic packet PASS before any code. A and C wait on the follow-up. B and D stay off.
- evidence: live-inbox --prompt defaults from to blaze (lines 128-129). Cloud --turn start also posts cloud_agent launch (lines 409-412). The WAKE-ROUTINE trap is --release only. Step 0 passes --from blaze.
- next owner: critic, for packet PASS. This card is queued after the cloud-agent working packet.
- escalate: the owner, if a prompt should stay on the card when the seat opens nothing, or if the overhead tile should count cloud spend instead of the post itself.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/record-map.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/suit-wear.md`.

## Scope

Five parts. The follow-up builds all five. This PR only names them. Round 2 is in parts 1 and 2: the skill runs on every inbound message, and the wake routine uses the same prompt and the same turn close.

### 1. Shared board-prompt skill

New fleet skill `grok-bot/skills/board-prompt/SKILL.md`, listed in the fleet table of `grok-bot/SKILLS.md`. Every seat uses the same skill. It is not a suit catalog skill under `src/skills/`.

The skill runs once, before other work, on any inbound message: from the owner, from another seat (a direct message), or in a room.

Order, same commands as WAKE-ROUTINE steps 0 and 7:

1. Owner message only: `live-inbox <seat> --prompt`. Pass no `--from`. `from` is the `name:` in house config. Add `--room <name>` when that owner message was in a room. A seat DM and a room message from anyone else do not post `--prompt`.
2. Always: `live-inbox <seat> --turn start --tag wake`.
3. The work. The skill links `grok-bot/OP-PROC.md` and the house overlay (`house/OP-PROC.md`) as the rules for the turn.
4. Every exit: `live-inbox <seat> --turn end --tag wake`, including an early return and an error.

`--tag` is the word `wake` on both turn posts. Chat turns and webhook wakes run this one procedure. A webhook wake uses WAKE-ROUTINE step 0 for its single `--prompt` and does not also run the skill's `--prompt`. A chat turn uses the skill and does not also run step 0. One owner message posts one prompt line.

The skill states this in its own text: `--note` is either one fixed summary the seat wrote, or it is omitted. A DM, a room post, and any inbound message text stay out of `--note`, out of `--tag`, and out of every other field. Omitting `--note` is the usual post. A fixed summary stays inside the existing plain-line cap.

The skill posts those lines. It does not launch a cloud, open a card, or paste the chat. It does not send a reply whose only job is to mark the turn.

The prompt command already posts `{t_ct, seat, kind:prompt, action:sent, from, to:seat, room?, note?}` to `POST /activity` (`house/live/tools/live-inbox` lines 24 and 393–399). `to` is the seat. The seat on the stored row comes from the seat key. `--room` stays available and is not required.

A failed post (missing env, 401, 429, no network) is said in one line and the seat still answers. `live-inbox` already exits 2 and names a missing `LIVE_URL`, `SEAT_KEYS_DIR`, or `LIVE_CURSORS`. The skill does not retry and does not invent a local file. A failed turn post follows the same rule: say it in one line, do the work, and still run turn end on the way out.

When that prompt is what causes the seat to open a GitHub issue or pull request, the prompt becomes that card’s first beat:

- `live-inbox --prompt` today prints `{ok:true}` and no id. The follow-up adds the activity `id` to that 202 body. The body stays `{ok, id}`. It never includes the key.
- The seat writes one allowlisted line in the new issue or PR body: `Prompt: <id>`.
- `beat_of` (`house/live/feed/live_board.py` lines 63–64) already turns `pr_open` and `issue_open` into `opened`. The follow-up inserts one earlier beat, `what: owner prompt`, timestamped with the prompt’s `t_ct`, carrying that activity id and the stored note. `opened` stays the next beat.
- A prompt with no `Prompt:` line on a card stays in the activity log only. The collector does not attach a prompt by clock or by the latest message.
- One prompt id is one card. A second card that repeats the id does not take a second first beat.

#### Turn start inside a cloud agent

`--turn start` posts `kind: turn` only. Today, when `CURSOR_AGENT` is `1` and `CURSOR_CONVERSATION_ID` is a `bc-` id, the same start also posts `{kind:cloud_agent, action:launch, agent}` (`house/live/tools/live-inbox` lines 409–412, docstring lines 21–23). Turn end does not finish that row, so the seat can stay working for up to 6 hours after the turn closes. The follow-up removes that second post from `live-inbox`. Start and end both post `{kind:turn, action, t_ct, tag?}` and no `cloud_agent` row, in a cloud agent and outside one. Cloud launch and finish come from the #464 hooks. This follow-up does not edit those hooks.

`house/live/tests/test_live_inbox.py` `test_cloud_turn_start_posts_the_running_agent` changes with that code. With `CURSOR_AGENT=1` and a `bc-` id, `--turn start` posts one `/activity` body, `kind: turn`, `action: start`, and posts no `kind: cloud_agent`. `--turn end` in that env posts one `kind: turn`, `action: end`, and no finish row.

#### WAKE-ROUTINE step 0 and the EXIT trap

`grok-bot/templates/house/fleet/WAKE-ROUTINE.md` is the webhook copy of this procedure.

Step 0 (line 20) today runs `live-inbox <seat> --prompt --from blaze`. The follow-up removes `--from blaze`. Step 0 runs `live-inbox <seat> --prompt` once, on an owner message, with no `--from`. House config supplies `from`, the same default the skill uses. One webhook posts one prompt line.

The EXIT trap (line 16) today is `trap 'live-inbox <seat> --release' EXIT`. `--release` posts nothing, so a crash leaves the turn open. The follow-up sets the trap to:

```bash
trap 'live-inbox <seat> --turn end --tag wake; live-inbox <seat> --release' EXIT
```

`--turn end --tag wake` posts first and closes the turn. `--release` still drops the claim and posts nothing. Step 7 names this trap as the one close. The seat does not run a second `--turn end` before the shell exits. A crash, an early return, and a still-waiting stop all leave through that trap, so the turn closes once. The claim gate stays: a wake that lost the claim posts no turn start and no turn end.

### 2. One-line seat description

The line that triggers the skill, pasted into each seat’s description:

```text
On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.
```

The skill’s frontmatter `description` is that same sentence, so the host can match it. The follow-up puts the line in `grok-bot/templates/house/ROLE-MAP.md` under the table, as the description every seat copies. Existing seats add the line to their own description. The template ships it for a new house.

### 3. Generic rule and one owner name

The generic rule goes in `grok-bot/OP-PROC.md` and in the cadence block of `grok-bot/templates/house/HOUSE.md`. Wording uses **owner**, never a person’s name.

Rule, one bullet:

> On any inbound message, the seat runs the board-prompt skill first. It links `grok-bot/OP-PROC.md` and the house overlay as the rules for the turn. An owner message posts one `live-inbox <seat> --prompt` with no `--from`. Every message then posts `--turn start --tag wake`, does the work, and posts `--turn end --tag wake` on every exit, including the EXIT trap. `--note` is a seat-written fixed summary or omitted, and it never carries message text. A prompt that spawns an issue or PR is that card’s first beat.

House config is one line under `## Owner` in `HOUSE.md`:

```text
name: <plain id>
```

The id matches the inbox `from` charset (`house/live/tools/live-inbox` line 52, 1–40 of letters, digits, space, and `._:@#+/-`). The template example is `name: Ada`. `grok-bot house init` copies that example into a new house. An existing house adds the line by hand. Init already refuses to overwrite a `HOUSE.md` that is there.

`live-inbox --prompt` with no `--from` reads `name:` from `house/HOUSE.md` (or `$HOUSE` when that points at a file). That value is the default `from`. An explicit `--from` still wins. A missing `name:` exits 2 and names the file. The literal default `blaze` (`live-inbox` lines 128–129) goes away in that same change. The docstring line that says `from` defaults to blaze goes away with it.

This fleet’s follow-up sets `name: Blaze` in `house/HOUSE.md` only. The generic template and `grok-bot/OP-PROC.md` stay on “owner”. `house/OP-PROC.md` keeps its current sentences. The follow-up adds the one new bullet there with the word owner, and does not rename the rest of that file.

`promptSender` (`house/live/app/server.mjs` lines 2514–2517) currently rewrites a blaze sender to the label `Blaze`. The follow-up labels the sender with the configured `name:` instead of a hardcoded word. A `name: Blaze` still renders `Blaze → <seat>`.

### 4. Board stat and a one-day measurement

The 24h strip (`house/live/feed/live_board.py` `stats`, line 498; tiles in `house/live/app/public/index.html` around line 1161) gains one tile: **owner prompts**.

- Count: prompt lines in the last 24 hours whose `from` is the configured owner name.
- Ids under the tile: activity ids, same pattern as the other 24h tiles (first 20, then “+N more”). The note text is not the title.
- Overhead: total bytes of those stored lines over the same 24 hours. Bytes are the archived JSON line the server already wrote. No new vendor and no new agent.

The tile ships with the follow-up. The number is whatever the live board has. This packet does not invent a baseline.

After the tile is on the live board, leave it for one day. The next owner then writes one note on this card: prompt count, byte total, and the p50 wall time of `live-inbox --prompt` from a seat that posted that day. That note is the measurement. The code PR does not wait on the day.

### 5. Adoption guide

The follow-up adds `grok-bot/templates/house/BOARD-PROMPT.md`. `house init` copies it. Another fleet implements it in this order:

1. Set `name:` once under `## Owner` in `house/HOUSE.md`.
2. Paste the one-line description onto every seat: `On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.`
3. Read `grok-bot/skills/board-prompt/SKILL.md`. On any inbound message, post `--turn start --tag wake`, do the work, and post `--turn end --tag wake` on every exit. Post `live-inbox <seat> --prompt` only for an owner message, with no `--from`. Pass `--note` only as one fixed summary the seat wrote, or omit it.
4. When that prompt is why a PR or issue is opened, put `Prompt: <id>` in the body. The id is what the command printed.
5. After one day on the live board, record the owner-prompts count, the byte total, and the p50 post time.

A house with no `LIVE_URL` still posts when the seat has the inbox env. The hand-kept `house/WAVEBOARD.md` does not grow a fake tile. The strip exists on the Bifrost board.

## Files

Not this PR. The follow-up edits these:

- `grok-bot/skills/board-prompt/SKILL.md` — new shared skill. Any inbound message. Owner `--prompt` only. Turn start, the work, turn end on every exit. The note rule is in the skill text. The description points at OP-PROC.
- `grok-bot/SKILLS.md` — one fleet-table row.
- `grok-bot/templates/house/ROLE-MAP.md` — the one-line description.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — step 0 drops `--from blaze` and uses the house-config default. The EXIT trap posts `--turn end --tag wake` and then `--release`. Step 7 names that trap as the one close.
- `grok-bot/templates/house/HOUSE.md` — `name:` under `## Owner`, and the cadence bullet. Template name stays `Ada`.
- `grok-bot/templates/house/BOARD-PROMPT.md` — the adoption guide.
- `grok-bot/OP-PROC.md` — the generic bullet, worded with owner.
- `house/HOUSE.md` — `name: Blaze` for this fleet only.
- `house/OP-PROC.md` — the same bullet, worded with owner. Existing sentences stay.
- `house/live/tools/live-inbox` — default `--from` is `name:`. Print `{ok, id}` on success. `--turn start` posts `kind: turn` only and does not post `cloud_agent` launch.
- `house/live/app/server.mjs` — `promptSender` uses the configured name. The 202 body adds `id`.
- `house/live/feed/live_board.py` — first beat `owner prompt` when the open event carries `Prompt: <id>`. `stats` adds `owner_prompts_24h`, ids, and `owner_prompts_24h_bytes`.
- `house/live/app/public/index.html` — the owner-prompts tile beside the other 24h tiles.
- `house/live/docs/board.md` — one row: owner prompt, then `opened`.
- `house/live/tests/test_live_inbox.py` — cloud turn start posts one `kind: turn`.
- `src/__tests__/unit/grok-bot-house-template.test.ts` — WAKE-ROUTINE step 0, the EXIT trap, and the skill text.
- Tests below.

Out of scope: the #464 hook files, the working-flag clock, renaming current owner sentences, and a metrics service. Launch and finish stay on those hooks.

## Tests

- `live-inbox --prompt` with `name: Ada` in a fixture `HOUSE.md` posts `from: Ada` and no `--from` flag. Explicit `--from` still overrides. Missing `name:` exits 2 and the word blaze is absent from the post.
- `--note` over 240 characters, or outside the plain-line charset, is refused and posts nothing. A legal fixed summary is stored and shown. A key planted in the env is absent from stdout and stderr. The printed body is `{ok, id}` only.
- The skill text states that `--note` is a seat-written fixed summary or omitted, and that a DM, a room post, and any inbound message stay out of `--note` and every other field. A prompt posted with `--note` omitted has no `note` key. `--tag` on the turn posts is the word `wake`.
- Skill text lists an owner message, a seat DM, and a room message. `--prompt` is on the owner path only. The text lists `--turn start --tag wake` before the work and `--turn end --tag wake` on every exit. It says the seat does not send a reply only to mark a turn. It links `grok-bot/OP-PROC.md` and the house overlay. The frontmatter `description` and the ROLE-MAP line are both `On any message, run the board-prompt skill first; it posts the turn and points at OP-PROC.`
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` step 0 contains `live-inbox <seat> --prompt` and the file contains no `--from blaze`. The trap line is `trap 'live-inbox <seat> --turn end --tag wake; live-inbox <seat> --release' EXIT`. Step 7 names that trap as the one close and does not add a second `--turn end`.
- `test_cloud_turn_start_posts_the_running_agent`: `CURSOR_AGENT=1` and a `bc-` id make `--turn start` post one activity, `kind: turn`, `action: start`, and no `kind: cloud_agent`. `--turn end` in that env posts one `kind: turn`, `action: end`, and no finish row.
- `grok-bot/OP-PROC.md` and the house template contain the bullet and do not name a person as the sender.
- Board: an `issue_open` or `pr_open` whose body has `Prompt: <id>` gets beat `owner prompt` first and `opened` second. The beat note is the stored note. A second card with the same id does not take that beat. An open with no `Prompt:` line has no prompt beat.
- Stats: two owner prompts inside 24h and one older line yield count 2, those two ids, and a byte total equal to the two archived lines. A prompt from another sender is not in the count. The tile button is `owner prompts`.
- `promptSender` with `name: Blaze` still renders `Blaze → forge`. `house/live/tests/prompt-line.test.mjs` follows that label.
- A 429 or a missing `LIVE_URL` is a skipped post. The test asserts the skill text tells the seat to continue the reply, and to run turn end on the way out.

## Risks

### Note and secret handling

`--note` is the only prose, and only on an owner prompt. The skill's own text says it is a fixed summary the seat wrote, or it is omitted. Message text never goes in the note, the tag, or any other field. The server accepts a note only on `kind: prompt`, 1–240 characters, charset `house/live/app/server.mjs` `ACT_NOTE` (line 2478). Keys named `body`, `text`, or `message` are refused. A note outside that charset is refused: `live-inbox` exits and posts nothing. The skill omits `--note` when it has no fixed summary, and that prompt still posts. The activity log already truncates the visible line at 72 characters and keeps the full note (`house/live/tests/prompt-line.test.mjs`).

The seat key stays in `SEAT_KEYS_DIR/<seat>.key`. The skill does not print it. The new `id` in the 202 body is the activity id, not a credential.

### One prompt, one turn close

Step 0 with `--from blaze` plus a skill prompt that uses house config would post two lines for one owner message. Step 0 drops the flag and uses the house-config default. The webhook path and the chat path each run that command once.

The trap posts `--turn end --tag wake` and then `--release`. `--release` alone posts nothing, so a crash would leave the seat working. Step 7 is that trap. A second `--turn end` in front of it would post two ends. The claim gate still drops a turn post when this wake does not hold the claim.

A reply sent only to mark a turn would bounce between two seats. The skill posts the turn with `live-inbox` and does not send that reply.

### Cloud launch

A `cloud_agent` launch posted from `--turn start` keeps the seat working after turn end, for up to 6 hours. The follow-up stops `live-inbox` from posting that row. Launch and finish stay on the #464 hooks. This packet does not edit those hooks. A desktop turn with no `bc-` id already posts `kind: turn` only, and a cloud turn does the same after this change.

### Owner name

Removing the hardcoded `blaze` default before `name:` is set makes every `--prompt` without `--from` exit 2. The follow-up sets this fleet’s `name: Blaze` in the same change as the default. Other fleets set `name:` before they rely on the default. `house init` will not patch an existing `HOUSE.md`.

`from` must match the short plain charset. A display name outside that charset cannot be the default. The template example `Ada` fits.

### Linking the prompt to the card

The first beat exists only when the new issue or PR body contains `Prompt: <id>` for a stored prompt. A seat that opens the card and forgets the line leaves the prompt in the activity log and the card starting at `opened`. Matching the latest prompt to this seat would attach the wrong message. This packet does not do that.

Rate limit is 60 posts a minute per seat. One prompt line per owner message, plus one turn start and one turn end, stays under that in normal chat. A burst that receives 429 skips the extra line and still replies, and still runs turn end on the way out.

### Overhead

The byte total is the size of the stored activity lines, which is the cost of the log itself. It is not cloud spend and not the seat’s model bill. The one-day note is where p50 wall time is written after the tile is live. Until that day has passed, the tile shows count and bytes only. The measurement is a card note, not a gate on the code PR.

### Queue

This follow-up does not edit the #464 hook files. Critic can PASS this packet on its own. Seats implement this one after that hook packet so the two follow-ups do not edit `server.mjs` in the same breath. `live-inbox` is the file this packet changes for the turn post.
