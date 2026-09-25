# Segment 1 — word (plain arm, rerun-dummy-b5)

## Session

- **session id:** `bc-452215e2-d452-5e13-8660-6f3882d33427`
- **model (expected):** `composer-2.5`
- **branch:** `cursor/ben-transition-map-fbe0` (xray only)
- **cloud run:** https://cursor.com/agents/bc-452215e2-d452-5e13-8660-6f3882d33427

## Mint (step 1)

Single `npm run intake` from `examples/ben-proof/dummy` before the long source read. Codeword on disk in `data/lessons.jsonl`; not spoken in chat at mint time. Receipt: `proof/mint.out`.

## Organ read (step 2)

Read slices (≤400 lines) across repertoire `memory-routing-provider`, `RepertoireService` / `CuratedSignalsManager` / `SignalInjector`, and xray `src/memory-routing/*` (`record-lesson`, `provider-loader`, `plates`, `lesson-pickup`), `nucleus/thin-dispatch`, ExecutionPlanner / researcher-confidence bridge, cursor `pre-compact` + `cursor-usage-receipt`, ben-proof README and transition map. Skipped `node_modules`.

## Qualifying cut (step 3 gate)

Required before post-cut recall and for reporting the keyword in chat:

- `.xray/state/cursor-hook.log` line containing `session_id=bc-452215e2-d452-5e13-8660-6f3882d33427`
- `.xray/state/cursor-receipts/bc-452215e2-d452-5e13-8660-6f3882d33427.json` with composer-2.5 / 200000 window / `context_tokens` > 100000

**Result:** cut **not qualified** at segment-1 stop. No `.xray/state/` under `/agent/repos/xray` (no `cursor-hook.log`, no `cursor-receipts/`). No `cursor-hook-invoke.log` anywhere under `/agent`. Host `preCompact` proof had not landed during this plain-arm fill in the subagent session.

## Chat recall (step 3, pre-cut)

No qualifying compaction occurred. Keyword **not** reported in chat per gate rules.

## Locked step at stop

Step 3 blocked on missing receipt pair. Steps 4–5 remain locked until a qualifying cut writes both files for this session.
