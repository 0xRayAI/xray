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

- **A:** already scored on this mill-on cloud (host `preCompact` wrote Station). See `RECEIPT-HOST-PRECOMPACT.md`.
- **B:** same `bc-cd19bb4e-a4bc-57da-8979-754bb0c202fe`. Never relaunch.
- **C:** plant in chat, fill until the next compact banner, quiz-first, then `MEMORY-RECEIPT.md`. Do not write canary values into that receipt.

Mill-control (`bc-5c1b4f51`) Compact 2: C was **not proven** as leftover old-window memory because C1/C2 were re-fed in the injected summary. C3 stayed unknown. Do not copy that cell’s canary **values** into this repo.
