# Packet: station boot for every seat

> 0xRay house example — not the general procedure. Your team’s rules live in `house/` after `grok-bot house init`.

The word in the generic rule is **owner**. The owner’s name is set once in house config. This branch now carries the docs, templates, skills, and the doctor warnings below. Publish still waits for the owner GO.

## Packet

- goal: Every seat boots through one station skill. Light on an owner message. Full after a summary, a wake, or a gate.
- constraints: Say owner. No personal names. One description hook. Publish waits for owner GO. Version stays 0.1.10 until that GO.
- path: Critic PASS on this packet, then one follow-up edits the files below.
- acceptance: Label, description, the three skills, the STATION and HOUSE lines, the doctor warnings, and the short OP-PROC rule match this file.
- gates: Critic packet PASS before any code. A and C wait on the follow-up. B and D stay off until the owner GO to publish.
- evidence: `grok-bot/OP-PROC.md` is 27389 bytes. A worn seat had STATION 36h stale, TRACKS 2 days stale, a lost cloud id, and an expired App token.
- next owner: reviewer, for packet PASS.
- escalate: owner, if Light should read the pack, or if publish may proceed without a GO.

Plates read: `docs-site/docs/plates/house.md`, `docs-site/docs/plates/station-card.md`, `docs-site/docs/plates/kept-line.md`.

## Scope

Fleet template for any house. Seat planes are `core`, `integration`, `ecosystem`, `distribution`, and `live`. Those names are the profile plane, not the goggles planes.

1. **Profile.** Title (label): `You are <seat>, <role> on the <plane> plane. Run the station skill first (suit <suit path>).` Description, first line: `BOOT: on any owner message, after a summary, or on a wake, run the station skill first (suit <path>, seat <seat>).` That first line is the only boot hook.
2. **Skills that ship** in `@0xray/grok-bot` (generic; add them to the `files` list in `grok-bot/package.json` and the fleet table in `grok-bot/SKILLS.md`):
   - `station` — Light on every owner message: `live-inbox <seat> --prompt` (no message text; `from` is the owner name in house config), then check `.xray/state/STATION.md`. Full after a summary, a wake, or a gate: also the file named by the HOUSE.md `OP-PROC:` line, the newest two entries in `.xray/state/NOTES.md`, `house/fleet/TRACKS.md`, open board cards (`house/WAVEBOARD.md` when `LIVE_URL` is unset, `GET /cards` when it is set), and the STATION `Skills:` line. During the work, each step posts one activity line, and each cloud launch is written to TRACKS in that same step. On the way out: STATION `Judgement:`, card metadata, TRACKS, and the closing activity line.
   - `seat-github-key` — `~/bin/gh-<seat>` mints a fresh App install token on every call from `~/.config/<seat>/github-app-mint-token.sh` and the env file in that directory. The wrapper exits non-zero and uses no other identity. Token and PEM stay out of stdout, stderr, and the board. A seat with no App does not mint; it hands the branch and the PR body to a seat that has one.
   - `seat-label` — This seat calls `UpdateProfile` with `title` only. The title is the label template, filled with this seat, role, plane, and suit path. It then reads `profile.json` and checks `title`. `description` in that file opens with the BOOT line. The same run writes `Plane:` and `Skills:` on `.xray/state/STATION.md`. A seat does not call `UpdateProfile` for any other seat.
   - Fold `board-prompt` into `station`. One skill, one description hook. Do not add `grok-bot/skills/board-prompt/`.
   Getting-started runs `seat-label` once per new seat, in that seat’s own chat. The path is `grok-bot/README.md` (“Path (per agent)”), the order table in `grok-bot/AGENTS.md`, and the per-agent order in `grok-bot/SKILLS.md`. `grok-bot/llms.txt` already says to run that order for each key agent.
3. **Templates.** `grok-bot/templates/station/STATION.md` gains `Plane:`, `Skills:`, and `Keys:` (`Keys:` is the wrapper name, `gh-<seat>`, never a secret). `grok-bot/templates/house/HOUSE.md` gains one `OP-PROC:` line whose value is a path. The pack default is `grok-bot/OP-PROC.md`. A house that has an overlay points the line at that file.
4. **Doctor** (`grok-bot/lib/seat-doctor.cjs`) warns, and does not fail the plant: `profile.json` `title` lacks the station hook, or `description` does not open with the BOOT line; `.xray/state/STATION.md` is older than the newest `.xray/state/NOTES.md`; `Skills:` or `Keys:` is missing.
5. **Rule and adoption.** One short section in `grok-bot/OP-PROC.md`. An adoption guide another fleet can follow.

`grok-bot/OP-PROC.md` today is the whole pack (27389 bytes). Light exists so an owner message does not read it. Full reads only the path on the `OP-PROC:` line.

## Files

Landed on this branch:

- `grok-bot/skills/station/SKILL.md` — new. Frontmatter `description` is the BOOT line. Light, Full, during-work, way out.
- `grok-bot/skills/seat-github-key/SKILL.md` — new. Mint every call. Fail closed. No other identity.
- `grok-bot/skills/seat-label/SKILL.md` — new. `UpdateProfile` title only. Verify `profile.json`. Description opens with the BOOT line. Write `Plane:` and `Skills:` on the worn station card.
- `grok-bot/package.json` — `files` includes the three skills. Version `0.1.10` → `0.2.0` in the same follow-up.
- `grok-bot/SKILLS.md` — three fleet-table rows, and the per-agent order includes `seat-label`. No board-prompt row.
- `grok-bot/README.md` — “Path (per agent)” runs `seat-label` on that seat.
- `grok-bot/AGENTS.md` — the order table runs `seat-label` per new seat.
- `grok-bot/llms.txt` — the per-agent start step names `seat-label`.
- `grok-bot/skills/setup-house/SKILL.md` — after the house is filled, each new seat runs `seat-label` itself.
- `grok-bot/CHANGELOG.md` — the 0.2.0 notes.
- `grok-bot/templates/house/ROLE-MAP.md` — the label template and the BOOT line, under the blank table. The text is what `seat-label` fills. A seat does not paste a title onto another seat.
- `grok-bot/templates/house/HOUSE.md` — `OP-PROC: grok-bot/OP-PROC.md`.
- `grok-bot/templates/station/STATION.md` — stock card shape plus `Plane:`, `Skills:`, `Keys:`. Not under `templates/house/`, so `house init` does not copy it into `house/`.
- `grok-bot/templates/house/fleet/TRACKS.md` — cloud id, seat, card, state. Written at launch.
- `grok-bot/templates/house/STATION-BOOT.md` — the adoption guide. `house init` copies it.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — step 1 points at station Full. One `--prompt` per owner message. The hardcoded sender name comes out. `from` is house config.
- `grok-bot/OP-PROC.md` — the section below. No seat names.
- `grok-bot/lib/seat-doctor.cjs` — the three warnings. When `profile.json` is present, the label warning reads `title` and `description` there. Plant PASS stays PASS.
- `src/integrations/hooks/station-hook-runtime.cjs` — `formatStationMarkdown` / `mergeStationMarkdown` keep `Plane:`, `Skills:`, `Keys:`, and `Judgement:` the way the kept-line plate keeps `Fresh:`.
- `docs-site/docs/plates/house.md` — doctor warns; the `OP-PROC:` line; the adoption guide.
- `docs-site/docs/plates/station-card.md` — `Skills:` and `Keys:` stay on the card.
- `docs-site/docs/plates/kept-line.md` — those lines survive a rewrite.
- `src/__tests__/unit/grok-bot-house-template.test.ts` — init file list, banner, `OP-PROC:` line, no personal name.
- `src/__tests__/unit/grok-bot-seat-doctor.test.ts` — the three warnings.

Leave these alone:

- `grok-bot/ops/STATION.md` — a pointer at one seat, not the line template.
- `house/HOUSE.md` and `house/OP-PROC.md` — this fleet’s overlay. Another fleet sets its own `OP-PROC:` line.
- `grok-bot/ops/cards/OWNER-BOARD-PROMPT-PACKET.md` — already written. This packet folds that skill into station. It does not reopen that card.

## OP-PROC wording

One new bullet in `grok-bot/OP-PROC.md`, after **Disk, not chat**:

**Station boot.** On any owner message, run station at Light depth: post `live-inbox <seat> --prompt`, then read `.xray/state/STATION.md`. After a summary, a wake, or a gate, run Full depth as well: the file named on the HOUSE.md `OP-PROC:` line, the newest two NOTES entries, TRACKS, open board cards, and the STATION `Skills:` line. Light does not read the pack. During the work, each step posts one activity line, and a cloud launch is written to TRACKS in that same step. On the way out, update STATION judgement, the card, TRACKS, and the closing activity line. A new seat runs `seat-label` itself: `UpdateProfile` with `title` only, then `profile.json`. A seat without a GitHub App hands the branch and the PR body to a seat that has one. A token and a PEM stay unprinted.

## Adoption

`grok-bot/templates/house/STATION-BOOT.md`, copied by `house init`. Another fleet does this in order:

1. Set `OP-PROC:` in `house/HOUSE.md` to that fleet’s procedure file.
2. Each new seat runs `seat-label` in its own chat. The skill fills the label template (plane: core, integration, ecosystem, distribution, or live) and calls `UpdateProfile` with `title` only. The owner name stays in house config. One seat does not label another.
3. Wear `@0xray/grok-bot` so `station`, `seat-github-key`, and `seat-label` are on the seat. One description hook.
4. `seat-label` writes `Plane:` and `Skills:` on `.xray/state/STATION.md`. `Keys:` names `gh-<seat>` only.
5. Install `~/bin/gh-<seat>` so every call runs `~/.config/<seat>/github-app-mint-token.sh`. A seat with no App hands the branch and the PR body across.
6. Keep `house/fleet/TRACKS.md`. Write the cloud id when the launch starts.
7. Run `npx @0xray/grok-bot doctor`. A warning names a missing hook, a station card older than NOTES, or a missing `Skills:` or `Keys:` line.

## Tests

These fail when the behavior is reverted.

- Station skill text has Light (`--prompt`, then STATION) and Full (the `OP-PROC:` path, two NOTES entries, TRACKS, open cards, `Skills:`). The frontmatter description and the ROLE-MAP first line are the BOOT sentence. The file contains no second boot sentence and no personal name.
- `seat-github-key` text names `~/bin/gh-<seat>` and `~/.config/<seat>/github-app-mint-token.sh`. A failed mint exits non-zero and names no fallback identity. The words token and PEM appear only as text the wrapper must not print.
- `seat-label` text calls `UpdateProfile` with `title` only, then reads `profile.json`. `description` must open with the BOOT line. The skill writes `Plane:` and `Skills:`. It says this seat does not set another seat’s title. `grok-bot/README.md`, `grok-bot/AGENTS.md`, and `grok-bot/SKILLS.md` each name that per-seat run.
- `grok-bot/templates/house/HOUSE.md` contains an `OP-PROC:` line and no personal name. `house init` copies `STATION-BOOT.md` and `fleet/TRACKS.md`. The station line template is not in the copied house list.
- Doctor: `profile.json` whose `title` lacks `Run the station skill first`, or whose `description` does not open with `BOOT:`, warns. STATION mtime older than NOTES warns. A card with no `Skills:` line, and a card with no `Keys:` line, each warn. `house.status` stays `pass` and the plant stays PASS.
- `mergeStationMarkdown` keeps one `Skills:` line and one `Keys:` line across a rewrite.
- `src/__tests__/unit/grok-bot-house-template.test.ts` still requires this file’s banner once, in the first six lines.

## Docs touched

- `grok-bot/README.md`, `grok-bot/AGENTS.md`, `grok-bot/SKILLS.md`, `grok-bot/llms.txt`
- `grok-bot/skills/setup-house/SKILL.md`, `grok-bot/skills/fasten-suit-per-agent/SKILL.md`
- `grok-bot/skills/station/SKILL.md`, `grok-bot/skills/seat-label/SKILL.md`, `grok-bot/skills/seat-github-key/SKILL.md`
- `grok-bot/OP-PROC.md`, `grok-bot/LEXICON.md`, `grok-bot/CHANGELOG.md`
- `grok-bot/runbooks/COORDINATOR.md`, `grok-bot/runbooks/IMPLEMENTER.md`, `grok-bot/runbooks/CRITIC.md`
- `grok-bot/templates/house/HOUSE.md`, `ROLE-MAP.md`, `STATION-BOOT.md`, `fleet/WAKE-ROUTINE.md`, `fleet/TRACKS.md`
- `grok-bot/templates/station/STATION.md`
- `docs-site/docusaurus.config.ts`, `docs-site/static/CNAME`, `docs-site/docs/full-reference.md`
- `docs-site/docs/guides/house.md`, `docs-site/docs/guides/features-since-3.1.md`
- `docs-site/docs/plates/house.md`, `station-card.md`, `kept-line.md`, `bifrost.md`, `grokbot.md`
- `AGENTS.md`, `AGENTS-consumer.md`
- `house/live/SETUP.md`, `house/live/docs/inbox.md`, `house/live/docs/board.md`
- Public board https://bifrost.0xray.dev. Docs https://docs.0xray.dev/.
- `house/live/tools/live-inbox` reads `name:` from HOUSE.md. `LIVE_URL` defaults in the wake, `live-cards`, `inbox-watch.sh`, `live-inbox-watch`, and the launchd plist are https://bifrost.0xray.dev. `house/live/feed/site.json` health uses that host. `house/live/tools/load-wave-seed.mjs` still names the Railway host: it is the direct service, and a seed apply to either host is refused.
- `grok-bot/lib/seat-doctor.cjs` and `src/integrations/hooks/station-hook-runtime.cjs`.
- `src/__tests__/unit/docs-public-urls.test.ts`, `station-kept-lines.test.ts`, `grok-bot-seat-doctor.test.ts`, `grok-bot-house-template.test.ts`.
- `.github/workflows/deploy-docs.yml` publishes `docs-site/build`, which includes `static/CNAME`.

## Release

This branch does not bump, pack, or publish.

1. **Build.** Bump `@0xray/grok-bot` from `0.1.10` to `0.2.0` in `grok-bot/package.json` and `grok-bot/CHANGELOG.md`. The kit is that folder’s `files` list.
2. **Wear.** `npm pack` in `grok-bot/`, install the tarball on a temp seat, `npx 0xray wear`, then `npx @0xray/grok-bot house init`.
3. **Validate receipts.** Doctor prints the three warnings on a broken fixture and PASS on a filled one. Template tests pass. `npx @0xray/foundry inspect --skip-live` on that seat prints `ok: true`.
4. Stop. Publish only after the owner GO. `scripts/foundry/release.mjs` stamps `0xray`, not this kit.

## Risks

- A Light turn that also reads `grok-bot/OP-PROC.md` (27389 bytes) puts the cost back on every owner message. Light is the prompt plus the station card.
- `mergeStationMarkdown` in `src/integrations/hooks/station-hook-runtime.cjs` keeps `Fresh:` and drops other copies (`docs-site/docs/plates/kept-line.md`). `Skills:` and `Keys:` vanish on the next compact unless that writer keeps them. Doctor would then warn after every wake.
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` step 0 already posts `--prompt`. Station posts it too. One owner message, one prompt. The webhook path and the chat path each run it once.
- A second description line for board-prompt gives the host two hooks. The BOOT line is the only one.
- `UpdateProfile` that sends a description replaces the whole description. The title call sends `title` only. The seat reads `profile.json` and fixes the description opening on its own profile when that opening is missing.
- One chat that sets every seat’s title leaves the others unlabeled. Seats cannot set each other’s labels. Getting-started runs `seat-label` in each new seat’s chat.
- A wrapper that prints the mint output leaks the token. The child `gh` sees the token in its environment. The parent prints neither the token nor the PEM. A mint failure does not fall through to `GITHUB_TOKEN` or another seat’s key.
- TRACKS written only on the way out is how a cloud id was lost (the file was already two days stale). The launch step writes the id before the next tool call.
- A doctor warning that flips `ok` to false fails every house that has not pasted the hook. Warnings stay warnings, same as the cadence lines in `grok-bot/lib/seat-doctor.cjs`.
- `house init` will not patch an existing `HOUSE.md`. `house init --migrate` copies a missing template file and leaves a file the house already changed. An existing house adds `OP-PROC:` by hand.
- Publishing `0.2.0` from this packet, or from the follow-up before the owner GO, ships the kit early. The code PR stops at the three receipts.
