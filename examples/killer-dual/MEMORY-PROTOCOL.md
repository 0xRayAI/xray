# Claim C — memory protocol (Arm S)

Split the claims. Mill, session, and memory are different tests. Do not mix a quiz into more work.

| Claim | Question | Score from |
|---|---|---|
| **A mill** | Did 0xRay write Station on this machine? | Disk: `.xray/state/STATION.md` present (suited) or **absent** (mill-control PASS). Planted hashes if any. |
| **B session** | Same `bc-…` after compact, not a new launch | `run-info` / Station open-cloud. Identity, not memory. |
| **C memory** | After compact, can the agent report a fact that existed **only** in the pre-compact chat? | Quiz-first. Two keys: the answer **and** whether the injected summary contained it. |

Compact 1 on mill-control (`COMPACT-PLAIN-001`) scored **A** and **B**. It did **not** run **C**. “You continued” is underdetermined for C.

## A valid C

Plant two canaries **in chat only**. Never write them to the repo.

1. **Task-critical (C2):** a phrase you say once and forbid saving. Ticket id is a bad choice if it also lives on disk (`TICKET.txt`, Station).
2. **Episodic nonce (C1):** something the summarizer should drop.
3. **Never-told (C3):** a fact that was never planted. After compact the answer must be **unknown** (hallucination check).

Hold the values **off-machine** (operator notes). They must not appear in `TICKET.txt`, notes, README, Station, or commits.

**First message after compact is only the quiz.** No “keep going,” no “read source,” no “now snap-after.” Ask, in order, **before any tools**:

1. What is the episodic nonce (C1)?
2. What is the task-critical canary (C2)?
3. What is a fact that was never told (C3)? (must answer unknown)

Questions-only file: `MEMORY-QUIZ.md`.

## Score against two keys, not one

| Outcome | Meaning |
|---|---|
| Correct, and the compact summary contains it | Summarizer kept it. **Not** proof of the old window. |
| Correct, and the summary does not contain it | Unexpected leftover context, or leakage (disk, tools, user paste). Investigate. |
| Wrong, and the summary does not contain it | Expected lossy compact. Memory did not survive. |
| Wrong, and the summary does contain it | Agent failed to use the summary. |
| Invents the never-told fact | Hallucination, same family as inventing Station. |

## Hard rules, or C is confounded again

- Canaries never appear on disk in this workspace.
- Agent must not Read the tree before answering the quiz.
- Operator keeps a copy of the injected summary text to see whether C1/C2 were re-fed.
- One compact, same `bc`. A relaunch is a new test.
- Even a clean C does not prove “the model remembered.” Compact deletes the old transcript. The only stores left are the summary, any unsummarized tail, files, and this turn. C tells you **which of those still hold the fact**.

## This cell (Arm S)

- **A:** mill-on. Host `preCompact` wrote Station. Compact 1 disk: `RECEIPT-HOST-PRECOMPACT.md`. Compact 6, 7, and 8: still present, same ticket. See `MEMORY-RECEIPT.md`, `MEMORY-RECEIPT-7.md`, and `MEMORY-RECEIPT-8.md`.
- **B:** same `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe`. Never relaunch.
- **C:** compact 6 (`2026-09-15T15:21:37Z`), compact 7 (`2026-09-15T15:35:27Z`), and compact 8 (`2026-09-16T12:52:11Z`). **Not proven** as leftover old-window memory: C1/C2 were re-fed in the injected summary each time. C3 stayed unknown. Receipts: `MEMORY-RECEIPT.md`, `MEMORY-RECEIPT-7.md`, `MEMORY-RECEIPT-8.md`. Canary values stay off disk.

Mill-control (`bc-5c1b4f51`) Compact 2: same C outcome (summarizer re-fed C1/C2; C3 unknown). Do not copy that cell’s canary **values** into this repo.

## Compact 7 (frozen) — quiz-first still confounded

Compact 6 is **frozen** (`MEMORY-RECEIPT.md`). Compact 7 is **frozen** (`MEMORY-RECEIPT-7.md`). Neither validates leftover-window memory. Do not overwrite them.

Printer: `python3 examples/killer-dual/memory_quiz.py` — questions only.

Compact 7 ran the tightened cell on the same `bc`:

1. New chat-only canaries (compact 6 values burned).
2. Each said **once**. No labeled markdown table in-chat.
3. Values never written to the repo.
4. Fill until host `preCompact` count **7**.
5. First user-facing lines after the cut were the quiz answers.
6. `MEMORY-RECEIPT-7.md` two-key vs the injected summary. C3 stayed unknown.

**Result:** C still **NOT PROVEN**. The host summary copied C1/C2 from the agent’s working notes (current-work / pending-tasks), not from a canary table. Dropping the table does not stop re-feed if later turns restate the keys.

## Compact 8 (frozen) — never-restate fill still confounded

Compact 6 is **frozen** (`MEMORY-RECEIPT.md`). Compact 7 is **frozen** (`MEMORY-RECEIPT-7.md`). Compact 8 is **frozen** (`MEMORY-RECEIPT-8.md`). None validates leftover-window memory. Do not overwrite them.

Compact 8 ran the never-restate cell on the same `bc`:

1. New chat-only canaries (compact 6 and compact 7 values burned).
2. Each said **once** at plant, then never again until quiz-first after count **8**. No table, no later-turn restatement, no receipt echo, no todo text with the values.
3. Values never written to the repo.
4. Fill until host `preCompact` count **8**.
5. First user-facing lines after the cut were the quiz answers.
6. `MEMORY-RECEIPT-8.md` two-key vs the injected summary. C3 stayed unknown.

**Result:** C still **NOT PROVEN**. The host summary copied C1/C2 from the plant-once text inside the compacted window. Silence in later fill turns does not stop re-feed if the plant is still in the transcript the summarizer keeps.

## Next cell — compact 9 (same two-key; do not paste values)

Compact 8 is frozen. For compact 9, same `bc`, same two-key table:

1. Operator plants **new** chat-only canaries off-machine. Compact 6, 7, and 8 values are burned.
2. Agent says each **once** at plant, then **never again** until quiz-first after count **9**. No table, no “current work” restatement, no receipt echo, no todo text with the values.
3. Never write the values to the repo.
4. Fill until host `preCompact` count **9**.
5. **First output after that cut is only the quiz answers**, in order, before any tools.
6. Then write `MEMORY-RECEIPT-9.md`. Two-key score vs a copy of the injected summary. C3 must stay unknown.

If the injected summary still contains C1/C2, score summarizer keep again. Do not call that leftover-window memory. Plant-once in the compacted window is enough for that confound.
