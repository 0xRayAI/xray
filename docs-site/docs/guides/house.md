---
title: Set up a house
sidebar_label: Set up a house
---

# Set up a house

The operating page is the same for every team. Yours is `house/HOUSE.md`: owner, seats, public voice, allowed repos, ask first, and the board. Those six headings win over the general page. Start at the [operating procedure](../../../grok-bot/OP-PROC.md), follow the [setup-house](../../../grok-bot/skills/setup-house/SKILL.md) skill, and keep the [house plate](../plates/house.md) as the stamp.

These steps match `@0xray/grok-bot` 0.1.6 (`grok-bot/lib/seat-doctor.cjs`).

## Copy the template

From the project root:

```bash
npx @0xray/grok-bot house init
```

That copies `HOUSE.md`, `WAVEBOARD.md`, and `ATTENTION_STATE.md` from `templates/house/` into `./house`. It does not copy `EXAMPLE.md`.

- `HOUSE.md`
- `WAVEBOARD.md`
- `ATTENTION_STATE.md`

A first run prints `copied templates/house to <project>/house` and exits 0.

Run it again and it exits 1. It lists every destination file that already exists and copies nothing:

```text
refusing to overwrite existing house files: <project>/house/ATTENTION_STATE.md, <project>/house/HOUSE.md, <project>/house/WAVEBOARD.md
```

`--dir <path>` chooses the project root. The default is the working directory.

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

## The owner approves Allowed

Show the owner the filled `HOUSE.md`. Nothing in Allowed counts until they approve it. Ask only for what they have not already said, one question at a time. Doctor does not check that approval. Change the house when the owner says a rule twice. Rules that belong on the operating page stay there.

## Run doctor until the house check passes

```bash
npx @0xray/grok-bot doctor
```

`ready` is the same command.

Lookup:

- When `GROK_BOT_HOUSE` is set, doctor uses it and does not walk up. The value may be the directory that holds `HOUSE.md`, or the `HOUSE.md` file itself. A missing path, or a directory with no `HOUSE.md` in it, warns, `GROK_BOT_HOUSE is set but HOUSE.md is missing (<path>)`.
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
House: PASS — <project>/house/HOUSE.md (via walk-up)
```

With `GROK_BOT_HOUSE` pointing at that directory, the same line says `(via GROK_BOT_HOUSE)`.

The process exits 0 when the house check is not FAIL and mill plus inspect are fastened on that project. A missing `house/HOUSE.md` is a warning (`no house/HOUSE.md, run setup-house`) and does not by itself fail a fastened seat. On an empty directory the plant stays `Plant: FAIL — mill+inspect not fastened`, so doctor still exits 1 after the house line is PASS. Fasten mill and inspect, then run doctor again.

## Every wake

Read `.xray/state/STATION.md` first. Then read the board: `house/WAVEBOARD.md` and `house/ATTENTION_STATE.md`. If either file is missing, use the same name under `templates/house/`. The setup-house skill tells every seat to read `house/` on its next wake. One card, one owner. For the six headings, `HOUSE.md` is the copy that wins.
