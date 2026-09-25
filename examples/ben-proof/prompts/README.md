# How to rerun

Two Cursor cloud agents, both Composer 2.5, window 200000. Start them together. Give each one its own prompt below. Do not spawn subagents inside either run. Each arm has the helm: do not stop, do not ask questions, do not ask permission, read all source to build deep context, and when one file ends open the next; a status note, a file list, or a question ends the turn and fails the fill; work until the session is ready to summarize, and only then report the keyword back; segment 2 waits until the compaction cut is real.

## Do the work yourself

Do all work yourself. Do not spawn any subagents to assist. You must have full context for this ticket. A subagent starts empty and the window you are filling is lost.

## When to report the keyword

Do not report the keyword until both of these exist for your own session id:

- a line in `.xray/state/cursor-hook.log`
- the file `.xray/state/cursor-receipts/<sessionId>.json`

The receipt must show model composer-2.5, context_window_size 200000, and context_tokens greater than 100000. The single file `.xray/state/cursor-usage-receipt.json` does not count. Saying the keyword before that pair exists fails the test. After both files exist, report the keyword. The suited arm reads it back from the organ. The plain arm says it from chat only and does not open the jsonl.

There are two segments. Segment 1 is the word. Segment 2 is the boundary. Segment 2 is a later segment. Run it only after the word cut is real. Keep it out of the fill.

## Segment 1

Both arms, in the prompt you give them now:

- Mint a codeword before any long read.
- Write a locked step list first: mint, read the organ, recall the word after a real cut, boundary questions, continue at the next step.
- Fully research the memory organ. Memory is the organ between repertoire and 0xRay. Read the source with the Read tool, 400 lines at a time. Skip `node_modules`. Read both sides: the repertoire repo (provider, signals, recall, ingest) and the xray wear points (`memory_routing`, memory-routing-provider, ExecutionPlanner, thinDispatch, researcher confidence, AsideContext `memoryRouting`, `recordLesson`, `ingestFeedback`, `recallLesson`). That read is about 120,000 tokens. Do not summarize instead of reading. Do not generate filler. Do not write under `/tmp`. Do not spawn subagents. A status sentence fails the fill.

A cut counts only with both `.xray/state/cursor-hook.log` and `.xray/state/cursor-receipts/<sessionId>.json` for that session, model `composer-2.5`, `context_window_size` 200000, `context_tokens` greater than 100000, and the codeword minted before the cut.

- Suited arm: [suited-100k.md](suited-100k.md). May install `0xray@4.0.26` and `@0xray/repertoire@0.2.8`. Store and recall the word through the organ.
- Plain arm: [dummy-100k.md](dummy-100k.md). Do not npm install 0xray, do not wear the suit, do not call the organ. A jsonl file on disk is allowed. After the cut, try to recall the word in chat without opening the file. Expected: the file can still hold the word; chat memory does not.

## Segment 2

Segment 2 is a later segment. Run it only after the word cut is real.

After compaction, ask questions about 0xRay that were only in the pre-cut read: what sits between repertoire and 0xRay, what `recordLesson`, `ingestFeedback`, and `recallLesson` do, and where the suit wears `memory_routing`. The suited arm should answer from the organ. The plain arm must not re-open the source and should not be able to answer from an organ.

Lock and step continuance: after the cut, continue at the next locked step instead of starting over. The suited arm should hold the step. The plain arm's continuance should be worse.
