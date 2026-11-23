# @0xray/grok-bot


## Start here

**Read first:** [`OP-PROC.md`](OP-PROC.md) — the one-page operating procedure.

Board: `house/WAVEBOARD.md` when `LIVE_URL` is unset, and Bifrost cards (`GET /cards`) when `LIVE_URL` is set, plus `house/ATTENTION_STATE.md` (your project house, not in this package). A new fleet runs [`stand-up-fleet`](skills/stand-up-fleet/SKILL.md) once: house, routes, then one suit per seat. It does not start a Bifrost server. The NEAR path in that skill is foundry, pay, cap, escrow, the Grok Bot one-click, and the CLI. If `house/` is missing, run `npx @0xray/grok-bot@0.1.19 house init` (skill [`setup-house`](skills/setup-house/SKILL.md)). It copies [`templates/house/`](templates/house/), including `watchers/` and `fleet/`, and refuses to overwrite. `house init --migrate` moves an old `ops/WAVEBOARD.md` into `house/WAVEBOARD.md`, starts missing files, and appends the template `## Cadence` block when `HOUSE.md` lacks it. When both boards exist and `house/WAVEBOARD.md` is not the untouched template, migrate exits 1 and writes nothing. It does not overwrite a ledger.

| House file | What |
|---|---|
| `house/HOUSE.md` `## Cadence` | Optional. Delete it when the house has no code loop. Defaults: [CADENCE.md Seat loop](https://github.com/0xRayAI/xray/blob/main/grok-bot/CADENCE.md#seat-loop) |
| `house/watchers/merge-queue.md` | Lab tester's retest ledger |
| `house/watchers/review-sent.log` | Reviewer dedupe log (PR + SHA) |
| `house/watchers/stall-sweep.log` | One line per stall nudge |
| `house/watchers/issue-sweep-last.txt` | Issue-sweep cursor (one UTC time) |
| `house/watchers/waveboard-static.md` | Notes beside the hand-kept board. Not merged into `house/WAVEBOARD.md` |
| `house/fleet/activity.jsonl` | Live-mesh activity (`BURST_ACTIVITY`) |
| owner prompt | Board rule. On every owner message run `live-inbox <seat> --prompt --from owner --note "<gist>"`. Ack a handled line with `live-inbox <seat> --ack <id>`, or `live-inbox <seat> --ack all` once every open line is handled. A cloud agent run uses `live-inbox <seat> --turn start --tag "bc-<first8> <track>"` beside `live-inbox <seat> --cloud launch --agent <bc-id> --tag <card>` on first start or `--cloud reply` on resume, and `live-inbox <seat> --turn end --tag "bc-<first8>"` beside `live-inbox <seat> --cloud finished --agent <bc-id> --tag <card>` (cancel is `--cloud cancel`). The tag is owner/repo#n or xray#n. The cloud agent does not post that line. `--from owner` is required today. Kanban note. The live page shows a read-only kanban above Activity. Columns are open, review, fix, merge, retest, and done. The deep link is `?card=`. History note. Every activity line is archived to history. The word owner is the owner via LIVE_OWNER or the owner-name. |

`live-inbox` ships in this kit: run it as `npx --no-install grok-bot live-inbox <seat> ...` from the project where `@0xray/grok-bot` is installed (needs python3, plus `LIVE_URL` set to your own board and `SEAT_KEYS_DIR`). No xray checkout is needed. The wake's exit gate is `npx --no-install grok-bot exit-gate .xray/state/NOTES.md --git`.
Complete setup path for **Grok Bot agents** on the 0xRay mill.

Agents: read `llms.txt` → `AGENTS.md` → the catalog at `node_modules/0xray/SKILLS.md` (**one suit per key agent**). 
Humans: same files.

## Install
The mill wears the suit. This kit runs on Node >= 24. The `0xray` package needs Node >= 24.22.3, the patched 24 release from 11 Nov 2026. On an older Node, `npm install` prints `EBADENGINE` and still exits 0 when `engine-strict` is off. The warning means the install is outside that runtime. Install both packages, then wear.

```bash
npm init -y
npm install 0xray
npm install @0xray/grok-bot
git init
npx 0xray wear
npx @0xray/grok-bot@0.1.19 house init
# Fill house/HOUSE.md from the owner's answers (skill setup-house). Doctor fails until the (example) lines are gone.
npx @0xray/grok-bot@0.1.19 doctor
```

`git init` is needed for the git hooks and the Cursor hook line. `house init` is not part of wear. A doctor run before HOUSE.md is filled exits 1 with `House: FAIL`. That is the intended gate, not an install error. The first doctor line is `@0xray/grok-bot@<version> doctor — 0xray@<version> — seat plant check`. A missing 0xray prints `0xray not installed`. The folder line is `Project:`. House off is `enabled: false` with the detail `house is not enabled here`, and the Board line is omitted. A bridge that points outside this folder is `Bridges: WARN`. A packed `node_modules/0xray/vendor/@0xray/repertoire` counts as present. On a fresh seat, doctor also WARNs that the activity log has no JSON line and that STATION.md has no `Skills:` or `Keys:` line. Those WARNs do not fail doctor. They clear when the seat's first station run writes the Skills: and Keys: lines and its first activity line.

Local packs use the same steps with files: `npm install ./0xray-<file>.tgz`, then `npm install ./0xray-grok-bot-<file>.tgz`. Do not extract the tarballs by hand. Each one unpacks into a directory named `package/`, so two extracts in one folder collide.

On npm 11, `npm install` may print an allowScripts warning for the `0xray` postinstall. The warning is safe to ignore. The postinstall still runs, and wear links repertoire either way. `npm install-scripts approve 0xray` silences it.

## Seat doctor (prove plant)
From an agent project root:

```bash
npx @0xray/grok-bot@0.1.19 doctor
npx @0xray/grok-bot@0.1.19 ready # same command
npx @0xray/grok-bot@0.1.19 doctor --json
```

**Plain:** this checks that mill + inspect are fastened on *this* seat, says whether Repertoire and Open Wallet (`~/.ows`) are present, then prints what to do next for hangar shops and Clearing (402 / USDC on Base). A HOUSE.md line that is exactly `wallet off` skips those wallet steps. It does not mill-plant Clearing into 0xRay. Product MCP name is `clearing`, never `xray-clearing`.

House lookup: `GROK_BOT_HOUSE` (the house directory or its `HOUSE.md`) wins. If that variable is unset, doctor walks up from the working directory for `house/HOUSE.md`. A set path that is missing warns and does not walk. No house file warns. Unfilled example lines fail. `house init` copies templates that still contain `(example)` lines, so the next doctor fails until those lines are replaced. Doctor warns, and does not fail, when `house/fleet/activity.jsonl` has no JSON line, and when `.xray/state/STATION.md` has no `Skills:` line or no `Keys:` line. When `## Cadence` is present, doctor also warns (and does not fail) if `review-sent.log` or `stall-sweep.log` is missing or older than 2 hours, if the activity log's last line is not JSON with `t_ct`, `kind`, `action`, and `seat`, or if the suit `.xray/codex.json` term count or `lastUpdated` differs from `node_modules/0xray`. When `watchers/` exists and Cadence is missing, doctor hints `grok-bot house init --migrate`.

## NEAR path (testnet)

These commands ship in this package. They stay on NEAR testnet. They do not send a mainnet transfer. Do not print a private key or a seed phrase.

```bash
npx @0xray/grok-bot@0.1.19 foundry-create --id <id> --seat <seat> --account <new-name>.testnet
npx @0xray/grok-bot@0.1.19 near-status
```

`foundry-create` creates the testnet account, seals the full-access key at mode 0600, and writes the foundry record. `near-status` prints the account, the foundry id, the listing, and Pay, Cap, and Escrow. An absent value is `pending`.

The Grok Bot one-click runs those two commands. It names pay, cap, and escrow and does not run them. It does not pass amounts, and it does not list a shop.

```bash
npx @0xray/grok-bot@0.1.19 near-pay --receiver <account> --amount <u128> --nonce <nonce> --signer <account> --key <cold.json>
npx @0xray/grok-bot@0.1.19 near-cap init|allow|deny|add-agent-key
npx @0xray/grok-bot@0.1.19 near-escrow init|open|fund|deliver|accept|refund
npx @0xray/grok-bot@0.1.19 near-1click init --ledger <file>
npx @0xray/grok-bot@0.1.19 near-mailbox post|claim|submit|accept|refund|release|jobs
npx @0xray/grok-bot@0.1.19 hangar-list --agent-id <id> --url <https-shop>
```

`near-escrow` uses its own account, never the foundry account. `hangar-list` checks a listing only when the owner already has an agent id. It does not pay. The steps and the stop rules are in [`skills/near-mill/SKILL.md`](skills/near-mill/SKILL.md). A new account starts at [`skills/foundry-create/SKILL.md`](skills/foundry-create/SKILL.md) or [`skills/ai-agent-on-near/SKILL.md`](skills/ai-agent-on-near/SKILL.md).

## Path (per agent)
1. **Suit** — mill + inspect (`fasten-suit-per-agent`) 
2. **Identity** — Groover register → mint → pin (`groover-factory-parity`) when needed 
3. **Pay** — OWS wallet + Base USDC (`setup-ows-pay`) 
4. **Hangar** — plant shops (`plant-hangar-shops`)
5. **Label** — `seat-label` in that seat’s own chat (`UpdateProfile` title only) 

## Plant pins (monitor / adjust)
- `0xray` (current npm) · mill nested in the tarball (prove with `npx 0xray validate`)
- Live URLs in `llms.txt` 

This package orchestrates. It does not vendor the whole OS.

## Fleet ops
Read `house/` first (this team's board and rules). If `house/` is missing, run `grok-bot house init` to copy `templates/house/`. Longer notes under `ops/` stay in the git repo and are not in the npm package. Cadence defaults live in [CADENCE.md Seat loop](https://github.com/0xRayAI/xray/blob/main/grok-bot/CADENCE.md#seat-loop).
