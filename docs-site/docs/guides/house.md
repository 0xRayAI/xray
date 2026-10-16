---
title: Set up a house
sidebar_label: Set up a house
---

# Set up a house

The operating page is the same for every team. Yours is `house/HOUSE.md`: owner, seats, public voice, allowed repos, ask first, and the board. Those six headings win over the general page. Start at the [operating procedure](../../../grok-bot/OP-PROC.md), follow the [setup-house](../../../grok-bot/skills/setup-house/SKILL.md) skill, and keep the [house plate](../plates/house.md) as the stamp.

These steps match `@0xray/grok-bot` 0.1.7 (`grok-bot/lib/seat-doctor.cjs`).

## Copy the template

From the project root:

```bash
npx @0xray/grok-bot house init
```

That copies every file in `templates/house/` into `./house` except `EXAMPLE.md`.

- `HOUSE.md`
- `WAVEBOARD.md`
- `ATTENTION_STATE.md`
- `AUTO-REVIEW.md`
- `ROLE-MAP.md`

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

That moves `ops/WAVEBOARD.md` to `house/WAVEBOARD.md` and copies each missing template, including `ATTENTION_STATE.md`. A house file you already changed stays as it is. When both boards exist and `house/WAVEBOARD.md` is not the untouched template, the command exits 1 and writes nothing:

```text
refusing to overwrite <project>/house/WAVEBOARD.md with <project>/ops/WAVEBOARD.md
```

An untouched template board is the same bytes as `templates/house/WAVEBOARD.md`. Migrate may replace that copy with the old board. Plain `house init` does not move `ops/WAVEBOARD.md`.

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
Open cards: house/WAVEBOARD.md. What needs the owner now: house/ATTENTION_STATE.md.
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

## Every wake

Read `.xray/state/STATION.md` first. Then read the board: `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md`. If either file is missing, use the same name under `templates/house/`. The setup-house skill tells every seat to read `house/` on its next wake. One card, one owner. For the six headings, `HOUSE.md` is the copy that wins.
