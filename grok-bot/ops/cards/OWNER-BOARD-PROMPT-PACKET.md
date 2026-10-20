# Packet: owner prompts on the board

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

This file is the whole change. No skill, board, or inbox code is edited here. The word in the generic rule is **owner**. The owner’s name is set once in house config.

## Packet

- goal: Every owner message to a seat posts one cheap activity line. A prompt that spawns a PR or issue is that card’s first timeline event. The board shows how many owner prompts were logged and what they cost. Another fleet can copy the same pieces.
- constraints: Packet only. No code in this PR. One `live-inbox <seat> --prompt` per owner message. `--note` is optional and stays inside the existing plain-line cap. The key is never printed. No `Closes`.
- path: Critic PASS on this packet, then one follow-up implements the files below. The one-day overhead reading happens after that follow-up is live.
- acceptance: A seat that receives an owner message posts one prompt line before other work. `--from` defaults to the `name:` in `house/HOUSE.md`. A spawned issue or PR shows that prompt as its first beat, ahead of `opened`. The 24h strip has an owner-prompts tile with a count and a byte total. The adoption guide tells another fleet the five steps. A failed post does not block the reply.
- gates: Critic packet PASS before any code. A and C wait on the follow-up. B and D stay off.
- evidence: `live-inbox` `--prompt` (default `from` is the literal `blaze`). `POST /activity` prompt shape. `live_board.stats` 24h strip. `beat_of` maps `pr_open` / `issue_open` to `opened`. House template `## Owner` is prose today.
- next owner: critic, for packet PASS. This card is queued after the cloud-agent working packet.
- escalate: the owner, if a prompt should stay on the card when the seat opens nothing, or if the overhead tile should count cloud spend instead of the post itself.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/record-map.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/suit-wear.md`.

## Scope

Five parts. The follow-up builds all five. This PR only names them.

### 1. Shared board-prompt skill

New fleet skill `grok-bot/skills/board-prompt/SKILL.md`, listed in the fleet table of `grok-bot/SKILLS.md`. Every seat uses the same skill. It is not a suit catalog skill under `src/skills/`.

On every message from the owner, the seat runs the skill once, before other work:

```text
live-inbox <seat> --prompt
```

`<seat>` is that seat’s own id. Optional `--note` is one short line when a single line helps the board. The skill posts the line. It does not launch a cloud, open a card, or paste the chat.

The command already posts `{t_ct, seat, kind:prompt, action:sent, from, to:seat, room?, note?}` to `POST /activity` (`house/live/tools/live-inbox` lines 24 and 393–399). `to` is the seat. The seat on the stored row comes from the seat key. `--room` stays available and is not required.

A failed post (missing env, 401, 429, no network) is said in one line and the seat still answers the owner. `live-inbox` already exits 2 and names a missing `LIVE_URL`, `SEAT_KEYS_DIR`, or `LIVE_CURSORS`. The skill does not retry and does not invent a local file.

When that prompt is what causes the seat to open a GitHub issue or pull request, the prompt becomes that card’s first beat:

- `live-inbox --prompt` today prints `{ok:true}` and no id. The follow-up adds the activity `id` to that 202 body. The body stays `{ok, id}`. It never includes the key.
- The seat writes one allowlisted line in the new issue or PR body: `Prompt: <id>`.
- `beat_of` (`house/live/feed/live_board.py` lines 63–64) already turns `pr_open` and `issue_open` into `opened`. The follow-up inserts one earlier beat, `what: owner prompt`, timestamped with the prompt’s `t_ct`, carrying that activity id and the stored note. `opened` stays the next beat.
- A prompt with no `Prompt:` line on a card stays in the activity log only. The collector does not attach a prompt by clock or by “latest message”.
- One prompt id is one card. A second card that repeats the id does not take a second first beat.

### 2. One-line seat description

The line that triggers the skill, pasted into each seat’s description:

```text
On every message from the owner, run board-prompt before other work.
```

The skill’s frontmatter `description` is that same sentence, so the host can match it. The follow-up puts the line in `grok-bot/templates/house/ROLE-MAP.md` under the table, as the description every seat copies. Existing seats add the line to their own description. The template ships it for a new house.

### 3. Generic rule and one owner name

The generic rule goes in `grok-bot/OP-PROC.md` and in the cadence block of `grok-bot/templates/house/HOUSE.md`. Wording uses **owner**, never a person’s name.

Rule, one bullet:

> On every message from the owner, the seat posts one `live-inbox <seat> --prompt` before other work. `--from` defaults to the owner name in house config. `--note` is optional. A prompt that spawns an issue or PR is that card’s first beat.

House config is one line under `## Owner` in `HOUSE.md`:

```text
name: <plain id>
```

The id matches the inbox `from` charset (`house/live/tools/live-inbox` line 52, 1–40 of letters, digits, space, and `._:@#+/-`). The template example is `name: Ada`. `grok-bot house init` copies that example into a new house. An existing house adds the line by hand. Init already refuses to overwrite a `HOUSE.md` that is there.

`live-inbox --prompt` with no `--from` reads `name:` from `house/HOUSE.md` (or `$HOUSE` when that points at a file). That value is the default `from`. An explicit `--from` still wins. A missing `name:` exits 2 and names the file. The literal default `blaze` (`live-inbox` lines 128–129) goes away in that same change.

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
2. Paste the one-line description onto every seat.
3. Read `grok-bot/skills/board-prompt/SKILL.md` and post with `live-inbox <seat> --prompt`. Pass `--note` only for one plain line.
4. When that prompt is why a PR or issue is opened, put `Prompt: <id>` in the body. The id is what the command printed.
5. After one day on the live board, record the owner-prompts count, the byte total, and the p50 post time.

A house with no `LIVE_URL` still posts when the seat has the inbox env. The hand-kept `house/WAVEBOARD.md` does not grow a fake tile. The strip exists on the Bifrost board.

## Files

Not this PR. The follow-up edits these:

- `grok-bot/skills/board-prompt/SKILL.md` — new shared skill.
- `grok-bot/SKILLS.md` — one fleet-table row.
- `grok-bot/templates/house/ROLE-MAP.md` — the one-line description.
- `grok-bot/templates/house/HOUSE.md` — `name:` under `## Owner`, and the cadence bullet. Template name stays `Ada`.
- `grok-bot/templates/house/BOARD-PROMPT.md` — the adoption guide.
- `grok-bot/OP-PROC.md` — the generic bullet, worded with owner.
- `house/HOUSE.md` — `name: Blaze` for this fleet only.
- `house/OP-PROC.md` — the same bullet, worded with owner. Existing sentences stay.
- `house/live/tools/live-inbox` — default `--from` is `name:`. Print `{ok, id}` on success.
- `house/live/app/server.mjs` — `promptSender` uses the configured name. The 202 body adds `id`.
- `house/live/feed/live_board.py` — first beat `owner prompt` when the open event carries `Prompt: <id>`. `stats` adds `owner_prompts_24h`, ids, and `owner_prompts_24h_bytes`.
- `house/live/app/public/index.html` — the owner-prompts tile beside the other 24h tiles.
- `house/live/docs/board.md` — one row: owner prompt, then `opened`.
- Tests below.

Out of scope: cloud-agent hooks, the working-flag clock, renaming current owner sentences, and a metrics service.

## Tests

- `live-inbox --prompt` with `name: Ada` in a fixture `HOUSE.md` posts `from: Ada` and no `--from` flag. Explicit `--from` still overrides. Missing `name:` exits 2 and the word blaze is absent from the post.
- `--note` over 240 characters, or outside the plain-line charset, is refused. A legal note is stored and shown. A key planted in the env is absent from stdout and stderr. The printed body is `{ok, id}` only.
- Skill text and the ROLE-MAP line are the same sentence. `grok-bot/OP-PROC.md` and the house template contain the bullet and do not name a person as the sender.
- Board: an `issue_open` or `pr_open` whose body has `Prompt: <id>` gets beat `owner prompt` first and `opened` second. The beat note is the stored note. A second card with the same id does not take that beat. An open with no `Prompt:` line has no prompt beat.
- Stats: two owner prompts inside 24h and one older line yield count 2, those two ids, and a byte total equal to the two archived lines. A prompt from another sender is not in the count. The tile button is `owner prompts`.
- `promptSender` with `name: Blaze` still renders `Blaze → forge`. `house/live/tests/prompt-line.test.mjs` follows that label.
- A 429 or a missing `LIVE_URL` is a skipped post. The test asserts the skill text tells the seat to continue the reply.

## Risks

### Note and secret handling

`--note` is the only prose. The server accepts it only on `kind: prompt`, 1–240 characters, charset `house/live/app/server.mjs` `ACT_NOTE` (line 2478). Keys named `body`, `text`, or `message` are refused. The skill never puts a key, a token, or a secret URL in `--note`. A sentence that fails the charset is dropped and the prompt line still posts. The activity log already truncates the visible line at 72 characters and keeps the full note (`house/live/tests/prompt-line.test.mjs`).

The seat key stays in `SEAT_KEYS_DIR/<seat>.key`. The skill does not print it. The new `id` in the 202 body is the activity id, not a credential.

### Owner name

Removing the hardcoded `blaze` default before `name:` is set makes every `--prompt` without `--from` exit 2. The follow-up sets this fleet’s `name: Blaze` in the same change as the default. Other fleets set `name:` before they rely on the default. `house init` will not patch an existing `HOUSE.md`.

`from` must match the short plain charset. A display name outside that charset cannot be the default. The template example `Ada` fits.

### Linking the prompt to the card

The first beat exists only when the new issue or PR body contains `Prompt: <id>` for a stored prompt. A seat that opens the card and forgets the line leaves the prompt in the activity log and the card starting at `opened`. Matching “the latest prompt to this seat” would attach the wrong message. This packet does not do that.

Rate limit is 60 posts a minute per seat. One line per owner message stays under that in normal chat. A burst that receives 429 skips the extra line and still replies.

### Overhead

The byte total is the size of the stored activity lines, which is the cost of the log itself. It is not cloud spend and not the seat’s model bill. The one-day note is where p50 wall time is written after the tile is live. Until that day has passed, the tile shows count and bytes only. The measurement is a card note, not a gate on the code PR.

### Queue

This card does not depend on the cloud-agent hook packet. Critic can PASS them in either order. Seats implement this one after that packet so the two follow-ups do not edit `server.mjs` in the same breath.
