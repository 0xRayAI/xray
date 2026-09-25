# Transition map — suited organ memory vs dummy file memory

**Plain:** Two seats, one job. Each seat wrote a token before the cut. The host compacted. Each seat was asked for that token. Both brought the pre-cut token back. Model `composer-2.5`. Window `200000`.

A counted cut has both pieces for the same session id: a line in `.xray/state/cursor-hook.log`, and the per-session receipt `.xray/state/cursor-receipts/<sessionId>.json`. The line has `context_tokens` above zero and model `composer-2.5`. The newest `cursor-usage-receipt.json` by itself is the last arm to write, so it is not the proof.

`TRANSITION.md` is PreToolUse vs PreCompact vs Grok Bot. `COMPARE.md` scores mill-on-disk and says that compare is not a memory A/B. This file is the memory A/B. The sessions under **Eval cases** were measured and left behind the map.

## Side by side (same job, two seats)

| | Suited (organ memory) | Dummy (file memory, no 0xray) |
|--|--|--|
| Seat | 0xRay worn. The token lives in the organ. | Bare. The token lives in a file. |
| Session | `bc-24e5e7e5-a924-554c-9294-ba9d813d0958` | `bc-9893bcfe-a184-5028-a277-0eb943c6c6cf` |
| Mint (before the cut) | Wear stored `bench-5679e6fb` at `2026-09-24T20:34:29.210Z` on task `wear:bench-wear-1790282069191`. Task string: compaction memory bench suited arm. | `mint-final.out` saved `bench-4b80c22a6bea282336f10e74aab9e122` at `2026-09-24T20:34:17.814Z`. lessonId `cb3be50a-e8b6-4c61-8424-26cb59bbd921`. |
| Cut evidence (hook log + per-session receipt) | Hook log `2026-09-24T20:38:43.090Z`. `context_tokens=182938`. `context_usage_percent=91.469`. `context_window_size=200000`. `generation_id=8fda442f-d9fa-4218-8cc0-7d59899c696e`. Model `composer-2.5`. `cursor-hook.log` line 11. Receipt usage timestamp `2026-09-24T20:38:43.104Z`. | Qualifying hook line `2026-09-24T20:39:48.500Z`. `context_tokens=187858`. `context_usage_percent=93.929`. `context_window_size=200000`. `generation_id=d32499d0-b576-458e-a24c-2e20344e6419`. Model `composer-2.5`. `cursor-hook.log` line 12, paired with the per-session receipt for this session id. The same session also logged 20:35, 20:37, and 20:38 with `context_tokens=0`, and one receipt names `gemini-2.5-flash`. Those rows stay off this cell. |
| Recall (after the cut) | The line that came back first was `bench-5679e6fb`, stored at 20:34:29, before the 20:38:43 cut. | Recall printed `bench-4b80c22a6bea282336f10e74aab9e122`, the token `mint-final.out` saved at 20:34:17, before the 20:39:48 cut. |
| Verdict | **Recalled.** Pre-cut token. Full Composer 2.5 window. Hook log and per-session receipt both present. | **Recalled.** Pre-cut token. Full Composer 2.5 window. Hook log and per-session receipt both present on the qualifying line. |

Finished score: both pre-cut tokens recalled.

## Eval cases (behind the map)

Each case below was opened and set aside. The map above is the score.

### 1. `bc-08ddb83e` — parent cloud

About `2026-09-24T19:00:18Z`. `230655` tokens of a `256000` window (`90.1%`). `is_first_compaction` is false. This is the parent session. An arm cut is a different session.

### 2. `bc-f847c6d1-9e1c-5cf3-8caa-d6f111ed0cfd` — token already in the prompt

`2026-09-24T18:26:47.005Z`. `180663` tokens, `90.3315%` of `200000`, model `composer-2.5`, first compaction. The token was prompt-resident (`kiln-app-6N2R`). No hook log. The store under test was the prompt, so this is outside organ memory.

### 3. `bc-32957fa9-0879-5af5-9276-ba1f67d1d730` — agent disclaimed the cut

`2026-09-24T15:09:27.701Z`. `183339` / `200000` (`91.6695%`). The agent disclaimed the cut. No hook log.

### 4. `bc-2f90f7fe-2cdb-5534-ac6b-c160b92aba3c` — host-shaped, token in the conversation

`2026-09-24T19:14:00.406Z`. `187232` tokens, `93.616%` of `200000`, model `composer-2.5`, first compaction, generation `eb054e32`. The token was in the conversation. No log match. Host-shaped. The memory score is the map above.

### 5. `bc-9af8270f-a4a7-53a2-a0d4-f96632aec5d0` — token in the conversation

`2026-09-24T19:18:36.558Z`. `182919` tokens, `91.4595%` of `200000`, model `composer-2.5`, generation `a8443ad1`. No hook log. The token was in the conversation.

### 6. `bc-124cb957-4968-5877-a859-e201befd6672` — zero tokens, other model

`2026-09-24T19:29:33.418Z`. A log line exists. `context_tokens=0`. Model `gemini-2.5-flash`. A counted cut is a full Composer 2.5 window.

### 7. `bc-d20ce3cf-7379-549a-9840-a04836f3f267` — log confirmed, recall missed

`2026-09-24T19:30:20.636Z`. Log confirmed. `186783` tokens, `93.3915%`, window `200000`, model `composer-2.5`, generation `f0949d6a`. Recall of this mint failed. `recordLesson` with an empty signal list stored nothing. This miss is why the lesson-store fix exists. The cut was real. The memory was empty. It stays behind the score.

### 8. `bc-1adc273e-60d4-5edf-8310-4d8a062bf31d` — lesson written after the cut

Qualifying line `2026-09-24T19:53:52.854Z`. `193374` tokens, `96.687%`, window `200000`, model `composer-2.5`, generation `49a3223a`. Smoke passed. `lessons.jsonl` `createdAt` `2026-09-24T19:54:18.672Z` holds token `bench-cf809ddf`, 26 seconds after the cut. A token written after the cut is a later write. Survival means the token was already stored when the cut fired.

### 9. `bc-5ee38012-aa34-5396-bfed-ebc77993b473` — earlier suited pass, superseded

`2026-09-24T19:51:10.353Z`. `182586` tokens, `91.293%`, window `200000`, model `composer-2.5`. Wear stored `bench-af152405` at `19:46:49`. Recall returned it first. This pass matched the rule. The later pair in the map above is the finished score, so this session stays here as the earlier suited pass.
