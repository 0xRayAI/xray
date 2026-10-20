---
title: Set up a house
sidebar_label: Set up a house
---

# Set up a house

The operating page is the same for every team. Yours is `house/HOUSE.md`: owner, seats, public voice, allowed repos, ask first, and the board. Those six headings win over the general page. Start at the [operating procedure](https://github.com/0xRayAI/xray/blob/main/grok-bot/OP-PROC.md), follow the [setup-house](https://github.com/0xRayAI/xray/blob/main/grok-bot/skills/setup-house/SKILL.md) skill, and keep the [house plate](../plates/house.md) as the stamp.

These steps match `grok-bot/lib/seat-doctor.cjs`. The kit version on npm is 0.1.10 until the owner GO for 0.2.0. Docs for this suit are https://docs.0xray.dev/. The public board is https://bifrost.0xray.dev.

## Copy the template

From the project root:

```bash
npx @0xray/grok-bot house init
```

That copies every file in `templates/house/` into `./house` except `EXAMPLE.md`.

- `HOUSE.md`
- `WAVEBOARD.md` (the board when `LIVE_URL` is unset)
- `ATTENTION_STATE.md`
- `bifrost-waves.json` (empty wave list)
- `AUTO-REVIEW.md`
- `ROLE-MAP.md`
- `STATION-BOOT.md` (adoption and migration from 0.1.10)
- `fleet/WAKE-ROUTINE.md`
- `fleet/TRACKS.md`

A first run prints `copied templates/house to <project>/house` and exits 0.

Run it again and it exits 1. It lists every destination file that already exists and copies nothing:

```text
refusing to overwrite existing house files: <project>/house/ATTENTION_STATE.md, <project>/house/AUTO-REVIEW.md, <project>/house/HOUSE.md, <project>/house/ROLE-MAP.md, <project>/house/WAVEBOARD.md
```

`--dir <path>` chooses the project root. The default is the working directory.

## Move an old board

Teams that still keep the board at `ops/WAVEBOARD.md` run:

```bash
npx @0xray/grok-bot house init --migrate
```

That moves `ops/WAVEBOARD.md` to `house/WAVEBOARD.md` and copies each missing template, including `ATTENTION_STATE.md` and an empty `bifrost-waves.json`. A house file you already changed stays as it is. When both boards exist and `house/WAVEBOARD.md` is not the untouched template, the command exits 1 and writes nothing:

```text
refusing to overwrite <project>/house/WAVEBOARD.md with <project>/ops/WAVEBOARD.md
```

An untouched template board is the same bytes as `templates/house/WAVEBOARD.md`. Migrate may replace that copy with the old board. Plain `house init` does not move `ops/WAVEBOARD.md`. `house/WAVEBOARD.md` is the board when `LIVE_URL` is unset. Bifrost (`GET /cards`) is the board only when `LIVE_URL` is set.

## Fill the six headings

`HOUSE.md` ships with one line under each heading that starts with `(example)`. Doctor treats a line as unfilled when it starts with `(example)`, after optional whitespace and an optional `-` or `*`. A mention of `(example)` later in the line does not count as unfilled.

Replace those six lines. This is one filled house:

```markdown
# House

## Owner
Mina. She decides money, credentials, deletes, and taste.

## Seats
- Coordinator: north. Never deploys, publishes, or spends.
- Implementer and publisher: anvil.
- Reviewer: lens. Never merges.
- Public posts: quill. Posts the coordinator's words.
- Listings: peg.
- Audio: reed.

## Public voice
@mina-shop. Root posts at least 4 hours apart. Replies only when meant.

## Allowed
Git push to mina/shop. No other repo.

## Ask first
Package publish, production deploy, payments, secrets, and deletes.

## Board
Open cards: house/WAVEBOARD.md when LIVE_URL is unset. Bifrost cards (GET /cards) when LIVE_URL is set. What needs the owner now: house/ATTENTION_STATE.md.
```

## Optional roster and Auto Review

`ROLE-MAP.md` and the Roster heading in `HOUSE.md` are optional. They map role, seat name, and agent id, and they ship blank. Roster has no `(example)` line, so doctor leaves it alone. The six headings above are the ones that win.

`AUTO-REVIEW.md` is the only house file that enforces Ask first and Allow. Those two sections ship blank. Paste the owner's decisions there. `HOUSE.md` records the same decisions for seats. Nothing in Allow counts until the owner approves it.

## Scope

A line in `HOUSE.md` that is exactly `wallet off` (or `Scope: wallet off`) skips the Open Wallet, Clearing, and hangar pay steps in doctor. The report says `OWS pay: skipped — house Scope wallet off`. Leave the line out and doctor keeps those steps. The line is not an `(example)` line, so it does not fail the house check.

## The owner approves Allowed

Show the owner the filled `HOUSE.md`. Nothing in Allowed counts until they approve it. Ask only for what they have not already said, one question at a time. Doctor does not check that approval. Change the house when the owner says a rule twice. Rules that belong on the operating page stay there.

## Run doctor until the house check passes

```bash
npx @0xray/grok-bot doctor
```

`ready` is the same command.

Lookup:

- When `GROK_BOT_HOUSE` is set, doctor uses it and does not walk up. The value may be the directory that holds `HOUSE.md`, or the `HOUSE.md` file itself. A missing path, or a directory with no `HOUSE.md` in it, warns `house is not enabled here`.
- When `GROK_BOT_HOUSE` is unset, `seat-doctor.cjs` walks up from the working directory to find `house/HOUSE.md`.

If `house/EXAMPLE.md` is in the seat, the house check fails and the command exits 1:

```text
House: FAIL — <project>/house/HOUSE.md (via walk-up) — house/EXAMPLE.md exists — delete it
```

Unfilled starter lines fail the house check and the command exits 1:

```text
House: FAIL — <project>/house/HOUSE.md (via walk-up) — HOUSE.md still has unfilled example lines
```

After those lines are replaced, the house line is:

```text
House: PASS — house on — <project>/house/HOUSE.md (via walk-up)
```

With `GROK_BOT_HOUSE` pointing at that directory, the same line says `(via GROK_BOT_HOUSE)`.

The process exits 0 when the house check is not FAIL and mill plus inspect are fastened on that project. A missing `house/HOUSE.md` warns `house is not enabled here`. That is not a broken suit on a chat that can stop a tool. Grok Bot is the chat that needs the house. The warning does not by itself fail a fastened seat. On an empty directory the plant stays `Plant: FAIL — mill+inspect not fastened`, so doctor still exits 1 after the house line is PASS. Fasten mill and inspect, then run doctor again.

## Station boot

`HOUSE.md` ships with `OP-PROC: grok-bot/OP-PROC.md` and an `## Owner` example `name: Ada`. The `name:` line under `## Owner` is the prompt sender. Replace `Ada` with the name in house config. A missing `name:` warns and `live-inbox --prompt` uses `from=owner`. `OP-PROC:` is the procedure file Full depth reads. Point it at a house overlay when the fleet has one.

Each new seat runs `seat-label` in its own chat. The label is `You are <seat>, <role> on the <plane> plane. Run the station skill first (suit <suit path>).` Planes are core, integration, ecosystem, distribution, and live. The call is `UpdateProfile` with `title` only. `profile.json` `description` opens with the BOOT line. The same run writes `Plane:` and `Skills:` on `.xray/state/STATION.md`. `Keys:` is `gh-<seat>`, never a secret. One seat does not label another.

`~/bin/gh-<seat>` mints a fresh GitHub App token on every call. Plain `gh` is not the seat. A seat with no App hands the branch and the PR body to a seat that has one.

`grok-bot doctor` warns, and does not fail the plant, when `profile.json` `title` lacks `Run the station skill first`, when `description` does not open with `BOOT:`, when `.xray/state/STATION.md` is older than `.xray/state/NOTES.md`, or when `Skills:` or `Keys:` is missing. Set `GROK_BOT_PROFILE` to a `profile.json` outside the project when the seat keeps it elsewhere.

The board posts every pull-request handoff and every review handoff. The coordinator acks only dev lines. Do not launch or resume a cloud agent when the card id is missing. On the way out write the card title, url, owner seat, stage, and state.

Existing fleets follow [the migration](https://github.com/0xRayAI/xray/blob/main/grok-bot/templates/house/STATION-BOOT.md). `house init` does not overwrite a `HOUSE.md` you already filled.

## Every wake

Read `.xray/state/STATION.md` first. Light on an owner message is `live-inbox <seat> --prompt`, then that card. Full after a summary, a wake, or a gate also reads the `OP-PROC:` file, the newest two NOTES entries, `house/fleet/TRACKS.md`, open cards, and `Skills:`. When `LIVE_URL` is unset, read `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md`. When `LIVE_URL` is set, read Bifrost cards (`GET /cards`) and `house/ATTENTION_STATE.md`. If a house file is missing, use the same name under `templates/house/`. The setup-house skill tells every seat to read `house/` on its next wake. One card, one owner. For the six headings, `HOUSE.md` is the copy that wins.
