# Changelog

## Unreleased

- Lead cadence: `ops/LEAD-CADENCE.md` — dummy `SKILLS.md` tests, peer boot (four lines, no command novel), fresh and upgrade registry install, CLI auth URL then poll, branch and pull request, loop until the station card is done, live tracks not an idle timer. `npx 0xray validate` is the check, not leftover init.sh. The clock is pull-request events and the same reviewer. Dispatch is four lines. Ship gates stay with the lead. The public-post clock stays in `ops/dist/CADENCE.md`.
- **Clean ticks every cycle** — rewrite the `/loop` prompt at the end of every live tick. `subscribe_timer` name-dedupe does not update the prompt (`created: false`). Unsubscribe then resubscribe. A tick that contradicts the repo is stale: rewrite the prompt, do not act.
- **Idle `/loop` stop** — when the card and the board are idle, unsubscribe and do not resubscribe. Not a heartbeat on parked work.
- **Subject review. Fix n ship.** After PASS, review the subject, close leftovers, then ship. PASS is not ship.
- **Groover is not Repertoire.** groover-hangar is live, and people can launch a hangar on Base.

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
