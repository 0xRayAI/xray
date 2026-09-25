# Two Cursor cloud agents, side by side

We ran the same job twice, both on Cursor cloud. One agent was wearing 0xRay. The other was a plain app with no 0xRay. Each one wrote down a code word before the chat was compacted. After the cut, we asked each one for that word. Both came back with the word they had written before the cut.

The model was Composer 2.5. The window was 200,000 tokens.

A cut only counts when that same session left two traces: a line in the hook log that shows how full the window was, and a receipt file named for that session. The line has to show a real token count, and the model has to be Composer 2.5. A line with zero tokens does not count. A different model does not count. The newest receipt file by itself is not enough, because it only remembers whoever wrote last.

## The two runs

| | Wearing 0xRay | Plain app, no 0xRay |
|--|--|--|
| What it was | A Cursor cloud agent with 0xRay on. The code word lived in 0xRay's memory. | A Cursor cloud agent with no 0xRay. The code word lived in a file. |
| Session | `bc-24e5e7e5-a924-554c-9294-ba9d813d0958` | `bc-9893bcfe-a184-5028-a277-0eb943c6c6cf` |
| Before the cut | At 20:34:29 it stored `bench-5679e6fb`. The task was "compaction memory bench suited arm". | At 20:34:17 it saved `bench-4b80c22a6bea282336f10e74aab9e122` in `mint-final.out`. |
| The cut | 20:38:43. The window was 182,938 tokens full, 91.5% of 200,000. Composer 2.5. Hook log line 11, plus a receipt for this session at 20:38:43.104. | 20:39:48. The window was 187,858 tokens full, 93.9% of 200,000. Composer 2.5. Hook log line 12, plus a receipt for this session. Earlier lines for this same session at 20:35, 20:37, and 20:38 said zero tokens, and one receipt named Gemini. Those do not count. |
| After the cut | Asked for the word. The first answer was `bench-5679e6fb`, the one stored at 20:34:29. | Asked for the word. The answer was `bench-4b80c22a6bea282336f10e74aab9e122`, the one saved at 20:34:17. |
| Result | Got the pre-cut word back. | Got the pre-cut word back. |

Both agents remembered the word they wrote before the chat was compacted.

## Runs we opened and then set aside

These looked close. They are not the score.

1. The parent cloud (`bc-08ddb83e`), around 19:00. It was 230,655 tokens of a 256,000 window. That was this conversation, not one of the two test agents.

2. `bc-f847c6d1-9e1c-5cf3-8caa-d6f111ed0cfd` at 18:26. Composer 2.5, 180,663 of 200,000. The word was already sitting in the prompt (`kiln-app-6N2R`). There was no hook log. It did not have to remember anything.

3. `bc-32957fa9-0879-5af5-9276-ba1f67d1d730` at 15:09. 183,339 of 200,000. The agent said the cut had not happened. No hook log.

4. `bc-2f90f7fe-2cdb-5534-ac6b-c160b92aba3c` at 19:14. Composer 2.5, 187,232 of 200,000. The word was still in the conversation. No hook log line for it.

5. `bc-9af8270f-a4a7-53a2-a0d4-f96632aec5d0` at 19:18. Composer 2.5, 182,919 of 200,000. Same problem: the word was still in the conversation, and there was no hook log.

6. `bc-124cb957-4968-5877-a859-e201befd6672` at 19:29. A log line exists, but the token count was zero and the model was Gemini. That is not a full Composer window.

7. `bc-d20ce3cf-7379-549a-9840-a04836f3f267` at 19:30. This one did compact for real: 186,783 of 200,000, Composer 2.5, hook log present. Recall missed. 0xRay had been asked to store a lesson and stored nothing, because the task matched no existing signal. That miss is why the lesson store was fixed. It is not a pass.

8. `bc-1adc273e-60d4-5edf-8310-4d8a062bf31d` at 19:53. Composer 2.5, 193,374 of 200,000, hook log present. The word on disk was written at 19:54:18, about 26 seconds after the cut. Remembering a word you wrote after the cut is not survival.

9. `bc-5ee38012-aa34-5396-bfed-ebc77993b473` at 19:51. Composer 2.5, 182,586 of 200,000. It stored `bench-af152405` at 19:46:49 and recalled it after the cut. That one did pass. The pair in the table above is the finished score, so this earlier pass sits here as the run it replaced.
