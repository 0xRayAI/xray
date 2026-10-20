# Changelog

## Unreleased

Ship as 0.2.0 after the owner GO. The package version stays 0.1.10 until that GO. `scripts/foundry/release.mjs` stamps `0xray`, not this kit.

- Station boot. Each seat's profile title is `You are <seat>, <role> on the <plane> plane. Run the station skill first (suit <suit path>).` The description opens with the BOOT line. Planes are core, integration, ecosystem, distribution, and live.
- Skills `station`, `seat-label`, and `seat-github-key`. `seat-label` runs in that seat's own chat (`UpdateProfile` title only, then `profile.json`). `~/bin/gh-<seat>` mints a fresh App token every call and never prints the token or the PEM.
- `HOUSE.md` carries `name:` and `OP-PROC:`. The station line template adds `Plane:`, `Skills:`, and `Keys:`. `house/fleet/TRACKS.md` is written when a cloud launches. Adoption and migration from 0.1.10 live in `templates/house/STATION-BOOT.md`.
- The board posts every pull-request handoff and every review handoff. The coordinator acks only dev lines. A cloud launch needs a card id. The way out writes card title, url, owner seat, stage, and state.
- `grok-bot doctor` warns, and does not fail the plant, when `profile.json` lacks the station hook, when STATION.md is older than NOTES.md, or when `Skills:` or `Keys:` is missing.
- Public board: https://bifrost.0xray.dev. Docs: https://docs.0xray.dev/.

## 0.1.10

- House template `## Cadence` (optional; delete it when the house has no code loop) and starter files: `watchers/merge-queue.md`, `watchers/review-sent.log` and `watchers/stall-sweep.log` (written by `house init`, not shipped as files), `watchers/issue-sweep-last.txt`, `watchers/waveboard-static.md`, `fleet/activity.jsonl`, and `fleet/prompts.jsonl` (a starter file; seats post prompts with `live-inbox <seat> --prompt`). The cadence doc link stays absolute: https://github.com/0xRayAI/xray/blob/main/docs/opproc-cadence.md
- `house init` copies template subfolders. It still refuses when a target file already exists. The copy writes a file only when that file is missing.
- `house init --migrate` appends the template Cadence block when `HOUSE.md` has no `## Cadence` heading, starts missing `watchers/` and `fleet/` files, and never overwrites an existing ledger.
- `grok-bot doctor` warns, and does not fail the plant, when a Cadence section is present and `review-sent.log` or `stall-sweep.log` is missing or older than 2 hours, when the activity log's last line is not JSON with `t_ct`, `kind`, `action`, and `seat`, or when the suit `.xray/codex.json` term count or `lastUpdated` differs from `node_modules/0xray`. When `watchers/` exists and Cadence is missing, doctor hints `grok-bot house init --migrate`.
- Live-mesh lines follow the #248 box reader: box lines carry `seat`, and prompt pulses are `{t_ct, seat, kind: "prompt", action: "sent"}`.
- OP-PROC merge tiers: gates A and C on every merge; B and D set per PR in a new packet `gates:` field (raise-only, locked at review). Gate B runs locally on the owner's machine across TUI environments. Adds proof, review-round, App-only identity, release-order, stacked-fix, fold-watch and stuck-tool rules.
- Lexicon and pack notes since the 0.1.9 publish: chime, packet, EXECUTE, handoff (#221), the pack OP-PROC new-seat gate (#224), and watcher and workstream (#225).

- Since the version bump, before the publish: the kit hides a one-wave range game in `lib/pulsar-game.mjs` (#417).
- Bifrost: one batch flushes per pull-request head (#404), a wave schedule template with a 75% empty-board quiet and a hand-kept board (#400), and wake routing by @-mention only (#303, #311).
- Seat wake: turn start and end on every exit (#355), the card goes to the owner's chat and the stall stays (#399), `LIVE_CURSORS` is the cursors directory (#409), and the template env defaults are named as one fleet's (#408). New `templates/house/fleet/WAKE-ROUTINE.md`.
- Live board: cloud agents show as board rows (#367), card dates, `merged_by` from the GitHub merger, push beats and inbox wake (#362, #366), and a seat can ack merged and dropped inbox lines (#375).
- `grok-bot doctor` follows the fastened plant when the seat is worn (#396).
- Pack docs (OP-PROC, LEXICON, runbooks, skills): the hotfix bypass rule (#331, #333), deploy stages stamped in order (#354, #356), and the memory packet, duplicate-agent guard and no local builds (#378). Drawing skills and `ops/` packets stay in the repo and do not ship in the kit.

## 0.1.9

- `grok-bot house init --migrate` moves `ops/WAVEBOARD.md` to `house/WAVEBOARD.md` and starts `ATTENTION_STATE.md` when that file is missing. It leaves a house file you already changed, and refuses when both boards exist and the house board is not the untouched template. A HOUSE.md line that is exactly `wallet off` (or `Scope: wallet off`) skips Open Wallet, Clearing, and hangar pay steps in `grok-bot doctor`.
- House template: every markdown file under `ops/` carries a one-line 0xRay house-example banner. `house init` also copies `AUTO-REVIEW.md` (blank Ask first and Allow; the only house file that enforces them) and optional `ROLE-MAP.md`. The Roster heading in `HOUSE.md` has no `(example)` line, so doctor still checks the six headings.
- Lead cadence: `ops/LEAD-CADENCE.md` — dummy `SKILLS.md` tests, peer boot (four lines, no command novel), fresh and upgrade registry install, CLI auth URL then poll, branch and pull request, loop until the station card is done, live tracks not an idle timer. `npx 0xray validate` is the check, not leftover init.sh. The clock is pull-request events and the same reviewer. Dispatch is four lines. Ship gates stay with the lead. The public-post clock stays in `ops/dist/CADENCE.md`.
- **Clean ticks every cycle** — rewrite the `/loop` prompt at the end of every live tick. `subscribe_timer` name-dedupe does not update the prompt (`created: false`). Unsubscribe then resubscribe. A tick that contradicts the repo is stale: rewrite the prompt, do not act.
- **Idle `/loop` stop** — when the card and the board are idle, unsubscribe and do not resubscribe. Not a heartbeat on parked work.
- **Subject review. Fix n ship.** After PASS, review the subject, close leftovers, then ship. PASS is not ship.
- groover-hangar is live. Outside sellers can deploy a shop on Base, but paid testing and catalog listing aren't open to them yet.
- Kit is not the fleet. Fleet house SSOT is repo-root `house/` in 0xRayAI/xray, not inside this package (#205).
- Pack `OP-PROC.md` stays generic and does not name fleet seats. Your five principles live in your `house/OP-PROC.md` after init.
- Pack check rejects a `grok-bot/house` tree so the fleet OP-PROC cannot ship in the kit.
- Watcher allowlist for issue and PR cadence is `house/WATCHERS.md` in the xray repo (#205).

## 0.1.8

- OP-PROC: Syncopate six rules, Confer cadence, Board rules and RACI moved into CADENCE.md (#144)

## 0.1.7

- `grok-bot house init` copies HOUSE.md, WAVEBOARD.md, and ATTENTION_STATE.md. It does not copy EXAMPLE.md.
- `grok-bot doctor` FAILs while `house/EXAMPLE.md` exists. The message says to delete it.

## 0.1.6

- General operating page, plus a House section that is the same for every team. This team's own house lives in `house/` and is not in the npm package.
- `templates/house/` is the fill-in starter. `grok-bot house init` copies it into `./house` and refuses if a target file already exists. Skill `setup-house` runs that command.
- `grok-bot doctor` uses `GROK_BOT_HOUSE` when that path is set (the house directory or its `HOUSE.md`). A set path that is missing warns and does not walk. Otherwise doctor walks up from the working directory for `house/HOUSE.md`. No house file warns. Unfilled example lines fail.
- Upgrading from 0.1.5: 29 house-internal docs are no longer in the package. That is `ops/*`, `ops/dist/*`, and three skills (`synaptical-comms`, `enterprise-cos-wave-loop`, `dist-0xrayai-publish`). They stay in this git repo under `grok-bot/ops/` and those skill folders. `grok-bot house init` copies `templates/house/` for a new team and does not restore those 29 docs.

## 0.1.5

- Clear “what runs when” map for bot gates (live hooks + mill/git/release only; skip list). Strict review is ship/live/security/identity only. Everyday ops-doc copies: implementer + CI, no extra reviewer.

## 0.1.4

- Fleet ops: Auto Review Ask-first on npm publish, Railway deploy, hangar/USDC pay, secret gists, and A2A spend (`ops/AUTO-REVIEW-POLICY.md` + `OPS-SPEC.md` capital section).
- Wake hygiene: Blaze 1:1 first; CoS answers live, not backlog text.
- Cloud: private SSOT repos must be readable before launch.

## 0.1.3

- Seat CLI: `npx @0xray/grok-bot doctor` (alias `ready`) proves mill+inspect on this project and prints hangar / Clearing next steps (402, Open Wallet, ZigZag, never mill-plant Clearing into 0xRay).

## 0.1.2

- Ops pack: OPS-CATALOG, SYNAPTICAL-LANES, Dist brand + LEXICON (plain vs shorthand catalog).

## 0.1.1

- Prior release.
