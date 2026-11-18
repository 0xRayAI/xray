# Packet: docs sweep for board activity and kanban

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

Packet only. No doc edits and no code in this change. Critic PASS on this packet comes before the follow-up touches a doc.

## Packet

- goal: New fleets and existing fleets can onboard or migrate to the board rule, the history archive, and the read-only kanban before the next grok-bot release.
- constraints: Packet only. Say owner. No personal names. No closing keyword on a pull number. `--from owner` is required today. The note is a gist, never message text. Drag stays off. One finish tag: `--turn end --tag "bc-<first8>"`. The start tag is `--turn start --tag "bc-<first8> <track>"`. #477 is merged. The public board does not yet serve the history archive or the kanban.
- path: This file. After packet PASS, one follow-up edits the sections below and adds the docs-check test. It does not edit the board server, the page, or `live-inbox`.
- acceptance: Each docs-check path except `PACKET-KANBAN.md` and `BOARD-DATA-MAP.md` contains the board rule, the kanban note, and the history note, and none of them still say to pass no `--from` or `--turn end --tag "bc-<first8> <track>"`. Those two files are checked only for the drag line and the kanban fold. BOARD-PROMPT step 3 and the HOUSE live-mesh bullet use the #484 command. The skill note requires the gist. Step 5 asserts only `--turn end --tag "bc-<first8>"`.
- gates: This PR is the packet. C only. Doc-only updates: see [Review](../../OP-PROC.md#review). The follow-up carries A and C. B and D stay off.
- evidence: #485 and #486 are on main. #484 is merged at be073e85 and the interim line in the five seat files is the single command. #488 is open for the three stale copies. #477 is merged at 86e73d7a. Review 5590271040 is the B1 on the two finish tags.
- next owner: critic, for packet PASS.
- escalate: owner, if the follow-up must make a missing `--from` a CLI error, or if drag must be documented before login is wired.

Plates read: `docs-site/docs/plates/bifrost.md`, `docs-site/docs/plates/house.md`, `docs-site/docs/plates/site-manual.md`.

## Scope

Three things a fleet has to read before the next grok-bot release. Two more stay marked as waiting.

1. Board rule, in force today. The #484 interim line is the single command. The follow-up does not edit that line. Start is `--turn start --tag "bc-<first8> <track>"`. Finish is `--turn end --tag "bc-<first8>"`. There is no second finish tag. Three copies still use the old wording (#488), and those copies are the only command edits. Wake turns in the WAKE-ROUTINE trap stay `--tag wake`. Seats keep running the line. A real owner-chat source is still future work. The repo page has the #485 archive and the #486 kanban. The public board does not serve them yet, so the docs do not say the public URL already shows them.
2. History. Every activity line is archived to history, including turn, ack, and cloud lines, not only prompts. The word `owner` is the owner via `LIVE_OWNER` or the owner-name.
3. Kanban. The live page shows a read-only kanban above Activity. Columns are `open`, `review`, `fix`, `merge`, `retest`, and `done`. A closed card sits in `done`. The deep link is `?card=`.

The three sentences the follow-up pastes, unchanged, into the section named for each file:

Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` and `live-inbox <seat> --turn end --tag "bc-<first8>"`. `--from owner` is required today.

Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`.

History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name.

`<gist>` and `<track>` are placeholders. The seat replaces `<gist>` with one short summary inside the existing note cap (1–240 characters of the note charset). It replaces `<track>` so the whole tag stays inside the existing tag cap (1–40 characters of the tag charset). The gist is not the message text. A room message from the owner still adds `--room <name>`. A seat DM and a room message from anyone else still do not post `--prompt`.

The CLI still fills `from` from the `name:` line when the flag is omitted, and a missing `name:` still warns and uses `owner`. That default is not the rule. The follow-up does not change `live-inbox`.

Delete these contradictions in the same files. The docs-check test fails while any listed file still contains them:

- `Pass no `--from``
- `with no `--from``
- `Drop a hardcoded `--from` name`
- `--turn end --tag "bc-<first8> <track>"`

The #484 interim line is the single command. The follow-up does not edit it in the five seat files. The only command edits are the three #488 copies. Other files in this sweep get the kanban note and the history note. When they quote a command, they quote this board rule, finish tag included.

Leave the template `name:` line as it is. `src/__tests__/unit/grok-bot-house-template.test.ts` already locks it. The command does not use that example.

## Files

Not this change. The follow-up edits these sections.

### Setup

- `grok-bot/skills/setup-house/SKILL.md` — step 5, the line that tells every seat to read `house/` on its next wake. Add the three sentences there. Step 1 stays the `house init` copy.
- `grok-bot/README.md` — `## Start here`, the table row `owner prompt`. Replace `` `live-inbox <seat> --prompt` posts to `/activity` `` with the board rule, and put the kanban note and the history note in that same cell.

### House template

- `grok-bot/templates/house/HOUSE.md` — `## Cadence`, the live-mesh bullet only (#488). That bullet still says an owner prompt is `live-inbox <seat> --prompt` with no `--from owner`. Replace that clause with the board rule above, including `--turn end --tag "bc-<first8>"`. Leave the inbound-message bullet and the #484 interim bullet as they are. A whole-file check passes today and is not the proof. The docs-check slices the live-mesh bullet. Keep `--room <name>` for a room. Do not add a person's name. Do not edit `house/HOUSE.md`. That file is this fleet's filled house and has no cadence block.

### Onboarding

- `grok-bot/templates/house/STATION-BOOT.md` — the numbered steps before `## MIGRATION`. In step 1, stop telling a new fleet that a missing `name:` is how the prompt sends `from=owner`. Add one step that pastes the three sentences and points at `grok-bot/skills/board-prompt/SKILL.md` and `grok-bot/skills/station/SKILL.md`.
- `grok-bot/templates/house/BOARD-PROMPT.md` — step 3 only (#488). That step still says to post `--turn start --tag wake` and `--turn end --tag wake` on every exit, and to post `live-inbox <seat> --prompt` with no `--from`. Replace that step with the board rule, including `--turn end --tag "bc-<first8>"`. Do not leave `--tag wake`, `with no `--from``, or `--turn end --tag "bc-<first8> <track>"` in step 3. The WAKE-ROUTINE trap is a different file and still uses `--tag wake`.
- `grok-bot/skills/board-prompt/SKILL.md` — `## Note` and `## Order` step 5 only (#488). Step 1 already posts the prompt. `## Note` still says omitting `--note` is the usual post. An owner message always passes `--note "<gist>"`. Message text still stays out of `--note`, and the charset cap stays. Step 5 is the cloud finish only: `--turn end --tag "bc-<first8>"` when the cloud finishes or is cancelled. It does not contain the prompt command or `--ack`, and it does not run on every exit. `## When a post fails` keeps `still run turn end on the way out`. That sentence is the failed-post close, not a second finish tag, and it does not gain `<track>`. `src/__tests__/unit/grok-bot-house-template.test.ts` locks `On every exit` and `one fixed summary the seat wrote, or it is omitted`. The follow-up updates those two assertions and leaves the failed-post sentence locked. Keep the assertions that the inbound bullet names no person and that the wake step rejects a hardcoded `--from` name.

### Operating procedure

- `grok-bot/OP-PROC.md` — leave the #484 interim line. It is the single command. Add the kanban note and the history note beside it. Do not add a new card-required sentence. #477 already landed the card sentences on main.
- `house/OP-PROC.md` — leave the #484 interim line. Paste the kanban note and the history note at the end of `## Board`. Do not rename seats in that file.

### Wake

- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — leave step 0 and the #484 interim line. The EXIT trap stays `--turn end --tag wake` and then `--release`. Add the kanban note and the history note. `house/live/tests/test_wake_template.py` already requires step 0 to contain `live-inbox <seat> --prompt`, to place that prompt before `--turn start`, and to reject a hardcoded `--from` name. Those assertions stay green.

### Station skill

- `grok-bot/skills/station/SKILL.md` — leave `## Light` step 1. It is the #484 interim line. Paste the kanban note and the history note under that step. `## Way out` stays. Do not add a new card sentence.

### Live docs

- `house/live/docs/fleet-setup.md` — new section `## Board rule` after the opening paragraph and before `## inbox-roles.json`. The three sentences. A new fleet mapping seats reads them before the seat map.
- `house/live/docs/board.md` — the opening kanban paragraph (it already names the columns, the click, and the GitHub link). Add `?card=` by pasting the kanban note. `## History and the queue`: paste the history note. `## Seat activity (#275)`, the owner-message row: it still says `(no `--from`` and `still renders` a person as the sender. Replace that row with the board rule. The rendered sender is the word owner via `LIVE_OWNER` or the owner-name. The docs-check slices that row and fails on `(no `--from``, on `still renders`, and on `--turn end --tag "bc-<first8> <track>"`.
- `house/live/app/BOARD-DATA-MAP.md` — the folds row under `## Roster, activity, rewind`. It lists mesh, stats, roster, cards, cloud, recent, history, work, queue, and activity, and it has no kanban fold. Add `kanban` to that row. The docs-check fails while that row omits `kanban`.
- `grok-bot/ops/packets/PACKET-KANBAN.md` — this packet still says a signed-in user can drag a card. The shipped kanban is read-only. Add one line that drag did not ship. The docs-check fails while the file says a signed-in user can drag. Do not turn that old packet into a second command.

### Docs site

- `docs-site/docs/guides/house.md` — `## Every wake`. Replace `` Light on an owner message is `live-inbox <seat> --prompt` `` with the board rule, and paste the kanban note and the history note in that section. `## Station boot`: stop saying a missing `name:` is the path that sends `from=owner`. Point at the board rule. `## Copy the template` stays the init steps.
- `docs-site/docs/plates/bifrost.md` — the paragraph that already says the live page draws a kanban above the activity list. Paste the kanban note (so `?card=` is on the plate) and the history note. Paste the board rule as one sentence after that paragraph. Leave the stamp line. Do not bump the package.

### Changelog

- `grok-bot/CHANGELOG.md` — `## Unreleased`. Three bullets, one per sentence, plus one bullet that a real owner-chat source is not in this release. The packet card is already on main (#477). The version line stays 0.1.10 until the owner GO.
- `CHANGELOG.md` — `## [Unreleased]`. One docs bullet that the house guide and the bifrost plate carry the board rule, the kanban note, and the history note. Do not bump the version.

### Migration for existing fleets

- `grok-bot/templates/house/STATION-BOOT.md` — `## MIGRATION`. Replace step 4. That step today says to drop a hardcoded `--from` name and to take `from` from the `name:` line. The new step quotes the board rule: start `--turn start --tag "bc-<first8> <track>"`, finish `--turn end --tag "bc-<first8>"`. `house init` does not overwrite a house file the fleet already has. Copy the kanban note and the history note by hand when the fleet's cadence still has the old prompt. Do not tell the fleet the public board already shows them.

## Docs-check test

New file: `src/__tests__/unit/board-docs-sweep.test.ts`. Vitest. No browser. Individually runnable: `npx vitest run src/__tests__/unit/board-docs-sweep.test.ts`.

The test reads each path below except `PACKET-KANBAN.md` and `BOARD-DATA-MAP.md`, and fails when any of those paths is missing any of the three sentences, or when any path still contains `Pass no `--from``, `with no `--from``, `Drop a hardcoded `--from` name`, or `--turn end --tag "bc-<first8> <track>"`. The check is the three sentences and those banned phrases. It does not keep a name list. `PACKET-KANBAN.md` and `BOARD-DATA-MAP.md` are the two exceptions: they are on the list for the drag line and the kanban fold only, not for the three sentences and not for the interim command.

#488 is a section check, not a whole-file check. A whole-file `toContain` already passes for `HOUSE.md` and `grok-bot/skills/board-prompt/SKILL.md` because other lines in those files have the #484 wording. The same test, and an added case in `src/__tests__/unit/owner-prompt-interim.test.ts`, use these slices:

- `grok-bot/templates/house/BOARD-PROMPT.md` step 3, the line that starts `3. `. It must contain `live-inbox <seat> --prompt --from owner --note "<gist>"`, `--ack <id>`, `--ack all`, `--turn start --tag "bc-<first8> <track>"`, and `--turn end --tag "bc-<first8>"`. It must not contain `--tag wake`, `with no `--from``, or `--turn end --tag "bc-<first8> <track>"`.
- `grok-bot/templates/house/HOUSE.md` `## Cadence` live-mesh bullet, the line that contains `Live mesh`. Same five phrases as step 3. It must not leave the owner prompt as `live-inbox <seat> --prompt` without `--from owner`, and it must not contain `--turn end --tag "bc-<first8> <track>"`.
- `grok-bot/skills/board-prompt/SKILL.md` `## Note`. The note must require `--note "<gist>"` on an owner message and must not say omitting `--note` is the usual post. This slice does not assert `--ack` or a turn tag.
- `grok-bot/skills/board-prompt/SKILL.md` `## Order` step 5, the line that starts `5. `. This slice asserts only the finish tag `--turn end --tag "bc-<first8>"`. It fails when that line contains `--turn end --tag "bc-<first8> <track>"`, the prompt command, or `--ack`. Step 5 is the cloud finish only, so the line must not say the finish runs on every exit.
- `house/live/docs/board.md` `## Seat activity (#275)` owner-message row. Same command phrases as step 3, including the exact finish tag `--turn end --tag "bc-<first8>"`. It fails on `(no `--from``, on `still renders`, and on `--turn end --tag "bc-<first8> <track>"`.
- `house/live/app/BOARD-DATA-MAP.md` folds row. It fails while that row omits `kanban`.
- `grok-bot/ops/packets/PACKET-KANBAN.md`. It fails while the file says a signed-in user can drag.

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
- `house/live/app/BOARD-DATA-MAP.md`
- `grok-bot/ops/packets/PACKET-KANBAN.md`
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

### #477 is merged (86e73d7a)

A board card for every packet and cloud agent is on main. Leave those sentences. This sweep does not add another card rule.

## Out of scope

Code under `house/live/`, including `server.mjs`, `index.html`, `live-config.js`, and `house/live/tools/live-inbox`. Making `--from` a CLI error. Drag-to-move. A new activity kind or field. Editing prior packets under `grok-bot/ops/cards/`. Editing `house/HOUSE.md`. Rewriting the #484 interim line. A new plate. A version bump. Publishing the grok-bot package. Deploying the public board.
