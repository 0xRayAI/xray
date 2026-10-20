# Packet: automatic reflections (#386)

Cited on `main` `86e73d7a5521febd48f6457cca3beaee6cb0bcba` (2026-10-20). Line numbers are that tree, before the fix on this branch.

## Scope

Get the existing no-model writer to fire for TUI hosts and bot wakes, and land one real reflection in the seat suit at `.xray/state/repertoire/feedback`. Synthesis stays off. Confer stays unset. Neither module runs on this path.

Out of this pass: restoring annals from `f4c28d392`'s parent, OpenClaw (no session hook), Claude (no bridge in this repo), the opt-in git post-commit bodies (`hooks/post-commit`, `.opencode/hooks/post-commit`, `scripts/hooks/install-hooks.cjs`), `docs/reflections/TEMPLATE_v3.md`, date-only filenames, and the seat doctor check in `scripts/mjs/verify-pipeline-facets.mjs`.

## Why the annals went cold

The writers are still in the tree. Nothing that is allowed to write is both flagged on and pointed at the seat.

1. `4cb0489ee` (2026-04-06, `fix: remove auto-reflection workflow`) deleted `.github/workflows/auto-reflection.yml`. The workflow was not replaced.
2. `a431de8ec` (2026-04-04) owns `checkAutoReflectionNeeded` in `scripts/node/auto-reflection-generator.mjs`. Due is file mtime (`:179-200`) and `git rev-list --since` that mtime (`:239-240`). A checkout resets mtime, so a fresh tree looks current. The default directory is `docs/reflections` (`:167`). The write is `writeFileSync` at `:480`.
3. `f4c28d392` (2026-06-10, `v3: complete subtract pass`) deleted `docs/reflections/deep/` and the auto cadence files.
4. `90cfb0b6e` (2026-06-19) added `synthesis` with `enabled: false`. It is still false at `xray/features.json:173-178` and `.xray/features.json:173-178`.
5. `7ef5b7547` (2026-06-20) added `maybeRunReflectionStub` (`src/integrations/hooks/pipeline-hook-runtime.mjs:69-80`). It returns null when `synthesis.reflection` is missing or `mode` is `off`, and otherwise fires only when `HEAD` count `% commitLimit === 0` (`:80`). `git log -S '"reflection"' -- xray/features.json` is empty: the key was never shipped, so the stub has returned null since the day it was added. The only caller that commit wired is Grok `session_start` (`src/integrations/grok/hooks/session-start.js:174-175`). Grok `pre_compact` does not call it.
6. `a1d7d96a8` (2026-08-28) added `ingestStationFeedback` (`session-start.js:77-78`), which returns unless the event is compact and `matchedSignals` is non-empty. `5543477918` (2026-10-02, `session-start.js:134-136`) clears `matchedSignals` on compact. The repertoire feedback ingest is unreachable. The last tracked feedback file is `logs/orchestrator-feedback/2026-06-18.jsonl`. The seat folder `.xray/state/repertoire/feedback` is gitignored (`.gitignore:43`).
7. `69b88ba1b` (2026-10-13, `docs/reflections/worn-host-consumer-2026-10-09.md`) is the newest file under `docs/reflections/` (24 tracked files). `git rev-list --count 69b88ba1b..HEAD` is 119 on this main. No `checkpoint-*` auto file remains.
8. `8776562d7` (2026-09-27) finishes Confer only on a real approve. There is still no `confer` key in `xray/features.json`. `defaultConferConfig` in `src/nucleus/confer.ts:77-78` is `enabled: false`, `on_synthesis: false`.
9. `f48ce67b4` (2026-10-20, #446) calls `maybeRunReflectionStub` from Cursor `pre-compact.js:139`. The flag is still absent, so that call returns null. Cursor wear already fastens `preCompact`.

`src/nucleus/synthesis.ts` and `src/nucleus/confer.ts` are not on the reflection path. The stub reads `features.synthesis.reflection` as a config key and does not import either module. Grok calls `recordSynthesisTurnSlice` only for `user_prompt_submit` (`session-start.js:105-107`). Hermes calls `recordHermesSynthesisTurn` only from the delegation gate when `recordTurn` or `user_prompt_submit` is set (`bridge.mjs:900-901`), not from `handleSessionStart` (`:428`). This fix does not call those functions.

## Fix

- Ship `synthesis.reflection.mode: "minimal"` and `synthesis.reflection.thresholds.minimal.auto_generate: true` with `commit_threshold: 25` in both `xray/features.json` (wear ships this file) and `.xray/features.json` (the stub reads this one). No top-level `auto_generate`. `synthesis.enabled` stays false. No `confer` key.
- One due rule, shared by the stub and the generator: commits since the `head:` recorded in the newest reflection, else that file's git commit. No `HEAD % 25`. No mtime. Default 25. No prior file means all commits on `HEAD`.
- The generator writes that markdown into the seat suit, `.xray/state/repertoire/feedback` (repertoire's `feedbackDir` in `xray/features.json:170` and `defaultWritablePaths` in `@0xray/repertoire` `dist/paths.js`). It does not write `docs/reflections/`.
- Callers: Grok `session_start` and Cursor `preCompact` already call the stub. Hermes `handleSessionStart` calls the same stub. The bot wake (`grok-bot/templates/house/fleet/WAKE-ROUTINE.md` step 7) runs the generator from the suit folder. OpenClaw stays out.

## Files

- `scripts/node/reflection-due.mjs` — shared due rule and seat path
- `scripts/node/auto-reflection-generator.mjs` — drop mtime; write the seat file; stamp `head:`
- `src/integrations/hooks/pipeline-hook-runtime.mjs` — drop the modulo; spawn the generator into the seat folder
- `src/integrations/hermes-agent/bridge.mjs` — session start calls the stub
- `xray/features.json`, `.xray/features.json` — the shipped flag
- `grok-bot/templates/house/fleet/WAKE-ROUTINE.md` — bot wake command
- `.npmignore` — seat feedback folder stays out of the tarball
- `docs-site/docs/plates/reflection-page.md`, `docs-site/docs/guides/memory-routing.md`
- `src/__tests__/unit/reflection-feedback.test.ts`

## Tests

`src/__tests__/unit/reflection-feedback.test.ts`

- A temp seat with the flag runs `auto-reflection-generator.mjs` and `maybeRunReflectionStub`. A markdown reflection (executive summary, `head:` of that seat's `HEAD`) appears under `<seat>/.xray/state/repertoire/feedback`. Nothing is written under `docs/reflections`, `node_modules/@0xray/repertoire`, or `vendor/@0xray/repertoire`. A second call on the same `HEAD` does not add a file.
- One commit is not due at threshold 2. Three commits are due at threshold 2 (`3 % 2 !== 0`, so the old `HEAD` modulo gate would skip). A prior file whose mtime is now and whose `head:` is the root commit is still due (the old mtime gate would skip). The shipped default threshold stays 25.
- After the write, `.xray/state/synthesis-checkpoint.json` and `.xray/state/confer-checkpoint.json` are absent.
- Both features files have the minimal flag, `synthesis.enabled` is false, and `confer` is absent.
- `npm pack --dry-run --json --ignore-scripts` does not list a sentinel dropped in `.xray/state/repertoire/feedback`, and does not list `docs/reflections/`.

## Docs

- `docs-site/docs/plates/reflection-page.md` — automatic file, 25-commit cadence, synthesis and Confer stay off, pack exclusion.
- `docs-site/docs/guides/memory-routing.md` — the same write lands in `feedbackDir`.
- Committed annals under `docs/reflections/` stay the corpus `loadReflectionInferences` reads. They are not the automatic write.
