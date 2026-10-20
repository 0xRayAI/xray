# Packet: docs sweep for board activity and kanban

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Packet only. No doc edits and no code in this change. Critic PASS on this packet comes before the follow-up touches a doc.

## Packet

- goal: New fleets and existing fleets can onboard or migrate to the board rule, the history archive, and the read-only kanban before the next grok-bot release.
- constraints: Packet only. Say owner. No personal names. No closing keyword on a pull number. `--from owner` is required today. The note is a gist, never message text. Drag stays off. Server-side prompts and the packet card wait on the open pulls named below.
- path: This file. After packet PASS, one follow-up edits the sections below and adds the docs-check test. It does not edit the board server, the page, or `live-inbox`.
- acceptance: Each file in the docs-check list contains the board rule, the kanban note, and the history note, and none of them still say to pass no `--from`. The same test fails when BOARD-PROMPT step 3, the HOUSE live-mesh bullet, or the board-prompt skill notes and step 5 miss the one wording.
- gates: This PR is the packet. C only. A docs-only change does not wait on CI. The follow-up carries A and C. B and D stay off.
- evidence: #485 and #486 are on main. #484 is merged at be073e85 and put the interim line in the five seat files. #488 is the open follow-up: BOARD-PROMPT step 3, the HOUSE live-mesh bullet, and the board-prompt skill notes and step 5 still use the old wording. #477 is still in review.
- next owner: critic, for packet PASS.
- escalate: owner, if the follow-up must make a missing `--from` a CLI error, or if drag must be documented before login is wired.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/site-manual.md`.

## Scope

Three things a fleet has to read before the next grok-bot release. Two more stay marked as waiting.

1. Board rule, in force today. #484 put one interim line in the five seat files. Three copies still use the old wording (#488). Those copies use this one wording: `live-inbox <seat> --prompt --from owner --note "<gist>"`, `--ack <id>|all`, and `--turn start/end --tag`. The start tag is `bc-<first8> <track>`. The end tag is `bc-<first8>`. Wake turns in the WAKE-ROUTINE trap stay `--tag wake`. Seats keep running the line. A real owner-chat source is still future work.
2. History. Every activity line is archived to history, including turn, ack, and cloud lines, not only prompts. The word `owner` is the owner via `LIVE_OWNER` or the owner-name.
3. Kanban. The live page shows a read-only kanban above Activity. Columns are `open`, `review`, `fix`, `merge`, `retest`, and `done`. A closed card sits in `done`. The deep link is `?card=`.

The three sentences the follow-up pastes, unchanged, into the section named for each file:

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8> <track>"`. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

`<gist>` and `<track>` are placeholders. The seat replaces `<gist>` with one short summary inside the existing note cap (1–240 characters of the note charset). It replaces `<track>` so the whole tag stays inside the existing tag cap (1–40 characters of the tag charset). The gist is not the message text. A room message from the owner still adds `--room <name>`. A seat DM and a room message from anyone else still do not post `--prompt`.

The CLI still fills `from` from the `name:` line when the flag is omitted, and a missing `name:` still warns and uses `owner`. That default is not the rule. The follow-up does not change `live-inbox`.

Delete these contradictions in the same files. The docs-check test fails while any listed file still contains them:

- `Pass no `--from``
- `with no `--from``
- `Drop a hardcoded `--from` name`

Leave the template `name:` line as it is. `src/__tests__/unit/grok-bot-house-template.test.ts` already locks it. The command does not use that example.

## Files

Not this change. The follow-up edits these sections.

### Setup

- `grok-bot/skills/setup-house/SKILL.md` — step 5, the line that tells every seat to read `house/` on its next wake. Add the three sentences there. Step 1 stays the `house init` copy.
- `grok-bot/README.md` — `## Start here`, the table row `owner prompt`. Replace `` `live-inbox <seat> --prompt` posts to `/activity` `` with the board rule, and put the kanban note and the history note in that same cell.

### House template

- `grok-bot/templates/house/HOUSE.md` — `## Cadence`, the live-mesh bullet (#488). That bullet still says an owner prompt is `live-inbox <seat> --prompt` with no `--from owner`. Replace that clause with the one wording: `live-inbox <seat> --prompt --from owner --note "<gist>"`, `--ack <id>|all`, and `--turn start/end --tag`. The inbound-message bullet and the interim bullet already carry the #484 line. A whole-file check passes today and is not the proof. The docs-check slices the live-mesh bullet. Keep `--room <name>` for a room. Do not add a person's name. Do not edit `house/HOUSE.md`. That file is this fleet's filled house and has no cadence block.

### Onboarding

- `grok-bot/templates/house/STATION-BOOT.md` — the numbered steps before `## MIGRATION`. In step 1, stop telling a new fleet that a missing `name:` is how the prompt sends `from=owner`. Add one step that pastes the three sentences and points at `grok-bot/skills/board-prompt/SKILL.md` and `grok-bot/skills/station/SKILL.md`.
- `grok-bot/templates/house/BOARD-PROMPT.md` — step 3 (#488). That step still says to post `--turn start --tag wake` and `--turn end --tag wake` on every exit, and to post `live-inbox <seat> --prompt` with no `--from`. Replace that step with the one wording: `live-inbox <seat> --prompt --from owner --note "<gist>"`, `--ack <id>|all`, and `--turn start/end --tag`. Do not leave `--tag wake` or `with no `--from`` in step 3. The WAKE-ROUTINE trap is a different file and still uses `--tag wake`.
- `grok-bot/skills/board-prompt/SKILL.md` — `## Note` and `## Order` step 5 (#488). Step 1 already posts `live-inbox <seat> --prompt --from owner --note "<gist>"`. `## Note` still says omitting `--note` is the usual post. An owner message always passes `--note "<gist>"`. Message text still stays out of `--note`, and the charset cap stays. Step 5 still posts `live-inbox <seat> --turn end --tag "bc-<first8>"` on every exit, including an early return. That end runs when the cloud finishes or is cancelled, with `--turn end --tag`. It is not the every-exit wake trap. `src/__tests__/unit/grok-bot-house-template.test.ts` locks `On every exit` and `one fixed summary the seat wrote, or it is omitted`. The follow-up updates those two assertions. Keep the assertions that the inbound bullet names no person and that the wake step rejects a hardcoded `--from` name.

### Operating procedure

- `grok-bot/OP-PROC.md` — the unheaded bullet that starts `On any inbound message, the seat runs the board-prompt skill first` (it sits after **Routing**). Replace `An owner message posts one `live-inbox <seat> --prompt` with no `--from``. Paste the three sentences into that bullet. In **Station boot**, replace `` post `live-inbox <seat> --prompt` `` with the same prompt command so the two paragraphs agree. Do not add a new card-required sentence. The **Card** bullet and the **Clouds + churn** cell already name a missing card id. Leave them.
- `house/OP-PROC.md` — the same inbound-message bullet under `## 1. Compute is the scarcest resource` (the bullet immediately before `## 2. One owner per job`). Same replacement. Also paste the kanban note and the history note at the end of `## Board`. The board rule in the inbound bullet is enough for the test. Do not rename seats in that file.

### Wake

- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — step 0. Replace `Pass no `--from``. `from` is no longer "the `name:` line" as the instruction. The owner message in that step runs the board rule, including `--from owner` and `--note "<gist>"`, still before an empty inbox stops the turn, still with `--room <name>` in a room, and still then `--turn start --tag wake`. The EXIT trap stays `--turn end --tag wake` and then `--release`. The cloud-agent tag is for a cloud run, not for this trap. `house/live/tests/test_wake_template.py` already requires step 0 to contain `live-inbox <seat> --prompt`, to place that prompt before `--turn start`, and to reject a hardcoded `--from` name. Those assertions stay green.

### Station skill

- `grok-bot/skills/station/SKILL.md` — `## Light` step 1. Replace `Post `live-inbox <seat> --prompt``. Light posts the board rule, then reads `.xray/state/STATION.md`. Paste the kanban note and the history note under that step. `## Way out` stays. Do not add a new "missing card id" sentence. One is already there.

### Live docs

- `house/live/docs/fleet-setup.md` — new section `## Board rule` after the opening paragraph and before `## inbox-roles.json`. The three sentences. A new fleet mapping seats reads them before the seat map.
- `house/live/docs/board.md` — the opening kanban paragraph (it already names the columns, the click, and the GitHub link). Add `?card=` by pasting the kanban note, so the deep link is in the same paragraph. `## History and the queue`: paste the history note. Today that section describes `/history` days and the open queue, and it does not say that turn, ack, and cloud lines are archived. `## Seat activity (#275)`, the owner-message row: replace `no `--from`` and the clause that `from` is the `name:` line. The row's command becomes the board rule. The rendered sender is the word owner via `LIVE_OWNER` or the owner-name. Do not write a person's name into that row.

### Docs site

- `docs-site/docs/guides/house.md` — `## Every wake`. Replace `` Light on an owner message is `live-inbox <seat> --prompt` `` with the board rule, and paste the kanban note and the history note in that section. `## Station boot`: stop saying a missing `name:` is the path that sends `from=owner`. Point at the board rule. `## Copy the template` stays the init steps.
- `docs-site/docs/plates/bifrost.md` — the paragraph that already says the live page draws a kanban above the activity list. Paste the kanban note (so `?card=` is on the plate) and the history note. Paste the board rule as one sentence after that paragraph. Leave the stamp line. Do not bump the package.

### Changelog

- `grok-bot/CHANGELOG.md` — `## Unreleased`. Three bullets, one per sentence, plus one bullet that server-side prompts and the packet card are not in this release. The version line stays 0.1.10 until the owner GO.
- `CHANGELOG.md` — `## [Unreleased]`. One docs bullet that the house guide and the bifrost plate carry the board rule, the kanban note, and the history note. Do not bump the version.

### Migration for existing fleets

- `grok-bot/templates/house/STATION-BOOT.md` — `## MIGRATION`. Replace step 4. That step today says to drop a hardcoded `--from` name and to take `from` from the `name:` line. The new step says: pass `--from owner` on every owner message, pass `--note` as a gist, ack with `--ack <id>` or `--ack all`, and tag a cloud agent with `bc-<first8> <track>`. `house init` does not overwrite a house file the fleet already has. Copy the three sentences by hand into the fleet's `HOUSE.md` cadence when that section exists, into the fleet's copy of `fleet/WAKE-ROUTINE.md`, and into the seat text that still says to pass no `--from`. Paste the three sentences into this migration section so the docs-check test sees them in this file once (the onboarding steps and this section share the file).

## Docs-check test

New file: `src/__tests__/unit/board-docs-sweep.test.ts`. Vitest. No browser. Individually runnable: `npx vitest run src/__tests__/unit/board-docs-sweep.test.ts`.

The test reads each path below and fails when any path is missing any of the three sentences, or when any path still contains `Pass no `--from``, `with no `--from``, or `Drop a hardcoded `--from` name`. It also fails when a path contains a personal name added as the prompt sender. The check is the three sentences and those banned phrases, not a full name list.

#488 is a section check, not a whole-file check. A whole-file `toContain` already passes for `HOUSE.md` and `grok-bot/skills/board-prompt/SKILL.md` because other lines in those files have the #484 wording. The same test, and an added case in `src/__tests__/unit/owner-prompt-interim.test.ts`, fail unless these three slices contain the one wording `live-inbox <seat> --prompt --from owner --note "<gist>"`, `--ack <id>`, `--ack all`, `--turn start --tag`, and `--turn end --tag`:

- `grok-bot/templates/house/BOARD-PROMPT.md` step 3, the line that starts `3. `. That line must not contain `--tag wake` or `with no `--from``.
- `grok-bot/templates/house/HOUSE.md` `## Cadence` live-mesh bullet, the line that contains `Live mesh`. That line must not leave the owner prompt as `live-inbox <seat> --prompt` without `--from owner`.
- `grok-bot/skills/board-prompt/SKILL.md` `## Note`, and `## Order` step 5, the line that starts `5. `. The note must not say omitting `--note` is the usual post. Step 5 must not post the cloud `--turn end --tag` on every exit.

Paths:

- `grok-bot/skills/setup-house/SKILL.md`
- `grok-bot/README.md`
- `grok-bot/templates/house/HOUSE.md`
- `grok-bot/templates/house/STATION-BOOT.md`
- `grok-bot/templates/house/BOARD-PROMPT.md`
- `grok-bot/skills/board-prompt/SKILL.md`
- `grok-bot/OP-PROC.md`
- `house/OP-PROC.md`
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md`
- `grok-bot/skills/station/SKILL.md`
- `house/live/docs/fleet-setup.md`
- `house/live/docs/board.md`
- `docs-site/docs/guides/house.md`
- `docs-site/docs/plates/bifrost.md`
- `grok-bot/CHANGELOG.md`
- `CHANGELOG.md`

The follow-up also runs `npx vitest run src/__tests__/unit/grok-bot-house-template.test.ts` and `python3 -m unittest house/live/tests/test_wake_template.py` (or the file's existing runner) and keeps them green. `house/live/tests/test_wake_template.py` `test_missing_name_line_warns_and_uses_owner` stays. It locks the CLI warning. It is not the board rule.

## Plates and docs-site pages

- `docs-site/docs/plates/bifrost.md` — edited, as in Files. The plate stays a pipeline. INPUT and OUTPUT stay.
- `docs-site/docs/guides/house.md` — edited, as in Files. This is the published setup page.
- `docs-site/docs/plates/house.md` — not edited. The house plate is the state flow from an empty house to doctor PASS. The kanban is a view of card stage. It does not add a house stage.
- No new plate. No new sidebar entry. `docs-site/sidebars.ts` stays.

## What waits

### #484 is merged (be073e85)

The interim line is on main in the five seat files, and it includes `--from owner`. Seats keep running it. This sweep does not remove `--prompt` or `--ack`, and it does not add the one-day owner-prompts count. A real owner-chat source stays future work. The three stale copies are #488, and they are in the file list above. They are not a later wait.

### Waits on #477 (a board card for every packet and cloud agent, still in review)

A board card for every packet and a cloud agent that does not run without one. Main already has a **Card** sentence and a wake sentence that a chat does not launch when the card id is missing. Leave those sentences. Do not add new ones. Do not add an onboarding step or a migration step that tells a fleet the launch refuses a missing card id, that a packet post creates the card in the same call, that the cloud agent only pushes, that the seat App opens the pull request, or that the server attaches the branch. Those sentences wait until that pull merges.

## Out of scope

Code under `house/live/`, including `server.mjs`, `index.html`, `live-config.js`, and `house/live/tools/live-inbox`. Making `--from` a CLI error. Drag-to-move. A new activity kind or field. Editing prior packets under `grok-bot/ops/cards/`. Editing `house/HOUSE.md`. A new plate. A version bump. Publishing the grok-bot package.
