# Claim C — memory protocol (Arm S)

Split the claims. Mill, session, and memory are different tests. Do not mix a quiz into more work.

| Claim | Question | Score from |
|---|---|---|
| **A mill** | Did 0xRay write Station on this machine? | Disk: `.xray/state/STATION.md` present (suited) or **absent** (mill-control PASS). Planted hashes if any. |
| **B session** | Same `bc-…` after compact, not a new launch | `run-info` / Station open-cloud. Identity, not memory. |
| **C memory** | After compact, which store still holds the fact? | Three-store triangulation. Organ versus the injected summary. Not leftover-window recall. |

Compact 1 on mill-control (`COMPACT-PLAIN-001`) scored **A** and **B**. It did **not** run **C**. “You continued” is underdetermined for C. COMPACT-BEN-001 and the old KILLER-DUAL hidden-key quiz are the wrong memory test. Same-bc plus a re-fed summary is not a mind.

## The old hidden-key quiz is summarizer keep

Planting chat-only canaries (C1 episodic nonce, C2 task key, C3 never-told baker) and asking “what is C1?” does not score organ memory. When the injected summary contains the key, a correct answer is **summarizer keep**. Compact deletes the old transcript. The successor is answering the summary Cursor put back, not a surviving window.

Compact 6, 7, and 8 ran that quiz. Each receipt is **NOT PROVEN** as leftover old-window memory because the host summary re-fed C1/C2. C3 stayed unknown. Those receipts stay **frozen**. Do not overwrite them. Do not paste their canary values. Silence in the receipts stays silence.

| Receipt | Compact | Frozen result |
|---|---|---|
| `MEMORY-RECEIPT.md` | 6 | Summarizer keep. C1/C2 re-fed. |
| `MEMORY-RECEIPT-7.md` | 7 | Summarizer keep. Summary copied the keys from working notes. |
| `MEMORY-RECEIPT-8.md` | 8 | Summarizer keep. Plant-once text inside the compacted window was enough. |

Do not schedule another hidden-key compact to “try harder.” Plant-once, never-restate, and dropping the in-chat table did not stop re-feed.

## Method — three stores after the cut

Cursor’s published hook and context docs are the method. Do not invent a field.

- Hooks, `preCompact`: https://cursor.com/docs/hooks
- Same page: https://cursor.com/docs/hooks.md
- Context window, Summarized conversation: https://cursor.com/docs/agent/prompting
- Cloud agents run project `preCompact`: https://cursor.com/docs/cloud-agent

### 1. What `preCompact` receives

`preCompact` runs before compaction. It is observational. It cannot block or modify compaction. Cloud agents do fire it once hooks are bound ([hooks](https://cursor.com/docs/hooks), support matrix: Yes). Cloud agents do **not** fire `sessionStart`.

Hook-specific stdin ([hooks](https://cursor.com/docs/hooks)):

| Field | Role |
|---|---|
| `trigger` | `"auto"` or `"manual"` |
| `context_usage_percent` | Window fill, 0–100 |
| `context_tokens` | Current token count |
| `context_window_size` | Window size in tokens |
| `message_count` | Messages in the conversation |
| `messages_to_compact` | How many messages will be summarized |
| `is_first_compaction` | First compact for this conversation |

Every agent hook also receives the common fields (`conversation_id`, `generation_id`, `model`, `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email`, `transcript_path`). `conversation_id` is the stable id (same `bc-` on this track). `transcript_path` is a path to the transcript file, or null. It is not a summary body.

The published input has **no summary text**. Do not treat a missing key as an undocumented `summary` parameter.

Stdout is only optional `user_message`: a message shown when compaction occurs. It is not `additional_context`. 0xRay’s hook writes Station, may append one plate schematic to that notice, and tells the user to Read `.xray/state/STATION.md`. That notice is not proof the old window survived, and it is not the organ.

### 2. What the successor is re-fed

When the window fills, Cursor compresses older turns into a summary so the new conversation has room ([prompting](https://cursor.com/docs/agent/prompting)). The context breakdown names that category **Summarized conversation**: compressed summaries of earlier turns. That text is the injected summary. The operator keeps a copy of it.

A fact in that summary is **summarizer keep**, even if the agent answers correctly. The summary is the store. The answer is not a second store.

### 3. What is disk-only

The host does not inject `.xray/state/STATION.md`. After the cut the suited organ is:

- the Station card (hot-swap)
- a plate stamp under `.xray/state/plates/<id>.md`, with one stock line on the card
- a repertoire lesson in the worn seat (signals, feedback), not the chat window

`WORK.md` and the ticket file are ordinary files. A key that lives only there is not organ memory. The bare arm has no Station, no plate stamp, and no repertoire, so organ memory **fails** there. The suited arm may persist only through Station, a plate stamp, or a repertoire lesson.

## Score

`scoreCompactFact` in `src/integrations/cursor/hooks/cursor-hook-utils.js` is the same rule.

| Arm | In organ | In injected summary | Score |
|---|---|---|---|
| suited | yes | no | **organ-memory** |
| either | yes or no | yes | **summarizer-keep** |
| either | no | no | **loss** |
| bare | (no organ) | no | **loss** — organ memory fails |

A correct answer does not upgrade summarizer keep. A fact in the `preCompact` `user_message` notice is not organ memory unless the organ holds it and the summary does not.

Questions-only file: `MEMORY-QUIZ.md`. Printer: `python3 examples/killer-dual/memory_quiz.py`.

## How to run the cell

1. Suited arm wears the suit. Bare arm does not. Same job, two trees.
2. Plant the fact on the suited organ (Station, and a repertoire lesson when that is the seat under test). Do not plant it in `WORK.md`. Do not plant it on the bare tree.
3. Fill until the host fires `preCompact`. Record `context_tokens` / `context_window_size` from stdin. Do not hand-invoke the hook to mint that fire.
4. Copy the injected summary the successor actually received (Summarized conversation). The hook stdin will not contain it.
5. Quiz the three stores. Summary question first, before tools. Then read only the organ paths.
6. Score with the table. Bare must not score organ-memory.

Canary values stay off this repo. Receipts name pass/fail, not the strings.

## This cell (Arm S history)

- **A:** mill-on. Host `preCompact` wrote Station. Compact 1 disk: `RECEIPT-HOST-PRECOMPACT.md`. Compact 6, 7, and 8: still present, same ticket. See the frozen receipts.
- **B:** same `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe`. Never relaunch.
- **C (frozen 6/7/8):** hidden-key quiz, **NOT PROVEN**. Summarizer keep. Do not reopen them.
- **C (triangulation):** organ versus summary. Disk delta, when the trees show it: `MEMORY-RECEIPT-TRIANGULATION.md`. That file scores the disks it read. It does not reopen compact 6/7/8.

Mill-control (`bc-5c1b4f51`) Compact 2: same old C outcome (summarizer re-fed C1/C2; C3 unknown). Do not copy that cell’s canary **values** into this repo.
