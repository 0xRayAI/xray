You are Composer 2.5. Your window is 200,000 tokens. You are the plain arm.

This prompt is segment 1. Segment 1 is the word. Segment 2 is the boundary. Segment 2 is a separate segment. Do not run it in this fill.

## You have the helm

Do not stop. Do not ask questions. Do not ask permission. Read all source to build deep context. When one file ends, open the next. A status note, a file list, or a question ends the turn and fails the fill. Work until the session is ready to summarize. Only then report the keyword back. Segment 2 waits until the compaction cut is real.

## Do the work yourself

Do all work yourself. Do not spawn any subagents to assist. You must have full context for this ticket. A subagent starts empty and the window you are filling is lost.

## When to report the keyword

Do not report the keyword until both of these exist for your own session id:

- a line in `.xray/state/cursor-hook.log`
- the file `.xray/state/cursor-receipts/<sessionId>.json`

The receipt must show model composer-2.5, context_window_size 200000, and context_tokens greater than 100000. The single file `.xray/state/cursor-usage-receipt.json` does not count. Saying the keyword before that pair exists fails the test. After both files exist, report the keyword. The suited arm reads it back from the organ. The plain arm says it from chat only and does not open the jsonl.

## Write the locked step list first

Before any long read, write this locked step list, then follow it in order:

1. Mint a codeword.
2. Read the organ.
3. Recall the word after a real cut.
4. Boundary questions.
5. Continue at the next step.

Steps 4 and 5 are segment 2. Leave them locked and unstarted. After a real cut, continue at the next locked step. Do not start the list over.

## Segment 1

Mint a codeword before any long read. Do not npm install 0xray. Do not wear the suit. Do not call the organ. A jsonl file on disk is allowed. From `examples/ben-proof/dummy`, run `npm run intake` once and let it write the word to `data/lessons.jsonl`. Do not type the word in chat. Do not open that file. Do not run intake again.

Then fully research the memory organ. Memory is the organ between repertoire and 0xRay. Read the source with the Read tool, 400 lines at a time. Skip `node_modules`. Read both sides:

- `/agent/repos/repertoire` — provider, signals, recall, ingest.
- `/agent/repos/xray` wear points — `memory_routing`, memory-routing-provider, ExecutionPlanner, thinDispatch, researcher confidence, AsideContext `memoryRouting`, `recordLesson`, `ingestFeedback`, `recallLesson`.

That read is about 120,000 tokens. Do not summarize instead of reading. Do not generate filler. Do not write under `/tmp`. Do not spawn subagents. A status sentence fails the fill.

A cut counts only when both of these exist for this session, the model is `composer-2.5`, `context_window_size` is 200000, `context_tokens` is greater than 100000, and the codeword was minted before the cut:

- `.xray/state/cursor-hook.log`
- `.xray/state/cursor-receipts/<sessionId>.json`

Do not write those files yourself. Only the host hook writes them.

When that cut is real, try to recall the word in chat without opening the file. Expected: the file can still hold the word; chat memory does not. Then stop. Segment 2 waits.

## Segment 2

Segment 2 is a later segment. Run it only after the word cut is real. It is not this fill.

After compaction, questions about 0xRay that were only in the pre-cut read: what sits between repertoire and 0xRay, what `recordLesson`, `ingestFeedback`, and `recallLesson` do, and where the suit wears `memory_routing`. Do not re-open the source. You have no organ to answer from.

Lock and step continuance: after the cut, continue at the next locked step instead of starting over. Continuance here should be worse than the suited arm.

## Return

- session id, model, `context_tokens`, and `context_window_size` from the hook line and the receipt, when a new receipt exists
- that the codeword was minted to the jsonl file before the cut, and that you did not open the file after the cut
- what you could say of the word from chat alone
- the locked step you were on when you stopped
- if there is no new receipt, say so plainly
