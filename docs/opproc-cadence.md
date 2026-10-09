# Op-proc cadence: watchers, sweep, queue, live mesh

How a Grok Bot house keeps the PR loop moving without a coordinator in the middle. It sits under [grok-bot/CADENCE.md](../grok-bot/CADENCE.md): the review plate, merge on PASS of an unchanged head, and green CI before merge are already there and are not repeated here. Your `house/HOUSE.md` wins where it differs. Every threshold below is a default; set your own in the house.

Placeholders: `<coder>` builds and merges to the integration branch, `<reviewer seat>` reviews, `<lab tester>` retests on the lab build, `<coordinator>` keeps the board and handles exceptions, `<env operator>` runs the lab environment, `<human owner>` decides.

## 1. Who does what

- **Bots never burn or ack.** Heavy build work runs only on cloud agents and `<coder>`. Grok Bot seats route, review and retest. No acknowledgement messages between seats; results go on the PR or issue. Why: chat seats spent compute on acks and on builds a cloud does better.
- **One GitHub App per seat.** No shared admin login. Each seat reads and writes as its own bot (see [house/burst/GITHUB-APP.md](../house/burst/GITHUB-APP.md)), so the PR history shows who did what and a leaked key is one seat's key.
- **Merge gate.** The `<reviewer seat>` PASS names a SHA. `<coder>` merges to the integration branch only when that SHA equals the PR's current head and CI is green on it. A commit after the verdict needs a re-look first. Main and production move only on the `<human owner>`'s word. Why: a PASS on an earlier head was treated as a PASS on the new one.

## 2. Seat-owned watchers

The `<reviewer seat>` owns the PR and issue watchers and the `<lab tester>` owns the merge watcher, so a fire lands on the seat that does the work and nobody relays it. The `<coordinator>` handles exceptions only: parked PRs, asks only the `<human owner>` can answer, fleet mechanics, and the hourly stall sweep (§3). It does not route reviews or retests.

| Watcher | Owner | Fires on | Does |
|---|---|---|---|
| PR | `<reviewer seat>` | PR opened or pushed | first review, the single re-check after a FAIL, or a re-look after a PASS or HOLD |
| Issue | `<reviewer seat>` | issue opened, with a 15-minute sweep as fallback | gate it: S1/S2 with a repro stays an issue; anything else becomes a card |
| Merge | `<lab tester>` | merge to the integration branch | append a queue line (§4), run the lean retest once the lab shows that commit; PASS closes the issue with the merge SHA, FAIL keeps it open and sends `<env operator>` one line |

Dedupe by PR + head SHA in a seat-local log (one line per routed review: time, repo#PR, sha, action). A watcher fire whose PR + SHA + action is already logged does nothing. Quiet when nothing changed.

Issue-sweep cursor: `house/watchers/issue-sweep-last.txt`, one line holding the UTC time of the last sweep in ISO-8601 (`2026-10-09T16:34:18Z`). The sweep lists issues opened after that time, gates them, then rewrites the line with the time the sweep started. A missing file means "sweep the last 24 hours".

## 3. Stall sweep (hourly, 24/7)

One sweep per hour, 24/7 (for example cron `9 * * * *`), run by the `<coordinator>`. Default thresholds:

1. A PR with no verdict more than 30 minutes after its head moved.
2. A queue line still unticked, or a PASS + green PR still unmerged, more than 60 minutes later.
3. An open P0/P1 with no linked PR after 2 hours.
4. A parked PR (re-check failed): goes to the `<human owner>` as "ship the smaller fix or shelve it".

Defaults: 30m / 60m / 2h, hourly, 24/7. Tune them in the house.

A nudge goes to the one owning seat, directly. Log each nudge (item + time) and never nudge the same item twice in one day. A sweep that finds nothing writes one quiet log line and sends nothing.

When the stuck item belongs to an outside builder (a `<coder>` that is a person or a tool outside the fleet, with no seat to message), the sweep does not nudge. It flags the item for the `<human owner>` instead, logged and deduped the same way.

Lesson: a sweep that ran only on weekday business hours stranded six retests overnight. Cloud agents and the coder keep working after hours, so the sweep runs 24/7.

## 4. Merge queue file (the retest ledger)

`house/watchers/merge-queue.md`, one line per merge:

```
- [ ] <repo> #<PR> <merge sha> fixes #<issue> — <title> — retest: <what to check>
```

The `<lab tester>` runs one batched lean retest (that bug plus a quick regression) on the latest lab build and ticks each line `[x] PASS` or `[!] FAIL` with one plain note. On PASS it comments PASS with the merge SHA on the issue and closes it (merges to a non-default branch do not auto-close). On FAIL the issue stays open, the note goes on the PR for the coder's one fix, and the `<lab tester>` sends `<env operator>` one line. Why: the queue is the only place that says what has been merged but not yet proven on the lab.

## 5. Live mesh (names and times, never text)

**Requires #248.** These line shapes are the ones #248's box reader and `POST /activity` accept. Before #248 merges, the server refuses `seat` on a post.

The live page is fed by metadata and outcomes only, never PR, issue, comment or prompt bodies. Three append-only JSON-lines files on the house box add the human side. Their paths are house settings, relative to where the feed runs: the activity log (`BURST_ACTIVITY`, default `fleet/activity.jsonl`), the prompt log (`BURST_PROMPTS`; set it to `fleet/prompts.jsonl`, since #248 defaults to `prompts.jsonl`) and the cloud-agent log (`fleet/cloud-agents.jsonl`). One JSON object per line. Values are short plain strings with no free text, `tag` at most 80 characters, and never a message body or a secret.

**Activity line** (`fleet/activity.jsonl`), one at the start and one at the end of each piece of background work:

```
{"t_ct": "<ISO time with offset>", "seat": "<seat id>", "kind": "turn|subagent|watcher", "action": "start|end", "tag": "<short label>"}
```

- Box file lines must carry `seat`. The reader ignores a line without it. Use the seat id; a display name works in the file only when the seats config `aliases` maps it to an id.
- What counts as activity: every subagent or executor run (`subagent`), every turn (`turn`) and every watcher run (`watcher`), quiet runs included. Write the start before the work and the end after it.
- The page shows the seat as working while a start has no later end for the same seat, kind and tag, capped at 60 minutes so a missed end line cannot spin forever.

**Prompt pulse** (`fleet/prompts.jsonl`), one line per direct message:

```
{"t_ct": "<ISO time with offset>", "seat": "<seat id>", "kind": "prompt", "action": "sent", "to": "<seat or room>"}
```

- `seat` is the seat the pulse lights, and `to` is where the message went. The receiving seat writes the line for a human-to-seat message. For a seat-to-seat message, the sender writes it.
- A `sent` pulse keeps `seat` working for 10 minutes. It is not a packet on the feed.
- Lines in the old `{"t_ct", "from", "to"}` shape light nothing after #248. Rewrite them in this shape.

**`fleet.missing_activity`** on the feed lists seats that pulsed in the last 60 minutes and wrote no activity line in that window. The page does not show it. A seat named there is busy but not logging its work, so fix its activity lines.

**Cloud-agent log** (`fleet/cloud-agents.jsonl`), one line per cloud agent event:

```
{"t_ct": "<ISO time with offset>", "seat": "<seat that runs it>", "kind": "cloud_agent", "action": "launch|reply|finished|cancel", "agent": "<cloud agent id>", "tag": "<lane or issue>"}
```

**Off the house box.** `<coder>` and cloud agents post the activity object to the feed's `POST /activity` with their own GitHub App installation token. `seat` may be left out. When it is present, it must match the token's seat (case-insensitive) or the post gets 403 `seat mismatch`. The stored seat is always the token's seat. Post the seat id: a display name with a space or a colon is refused as `bad seat`. The checker is `validActivity` ([house/burst/ACTIVITY.md](../house/burst/ACTIVITY.md)); #248 adds the schemas `house/burst/activity.schema.json`, `prompts.schema.json` and `cloud-agent.schema.json`.

## 6. Waveboard

Build `house/WAVEBOARD.md` from live sources where a generator exists: open PRs and issues and verdicts (read-only GitHub calls), the merge queue, the live feed and the cloud-agent log, with hand-kept items (waiting on the human, standing notes) in one static file that the generator merges in by section. A generator never writes to GitHub. Otherwise keep the board current by hand on every state change. Why: a board that lags GitHub and the queue drifts.

## 7. Deep-burn lanes

For a burst of build work, split it into lanes: one cloud agent per repo area, each lane owning a fixed set of paths so no two agents edit the same files. Run at most 4 lanes at once, in waves; a lane's next PR starts when its last one has a verdict. Tag each cloud agent with its lane (the `tag` on its cloud-agent log line, §5) so the board can group PRs by lane.

## Watcher prompts (paste into a seat routine)

**PR watcher (`<reviewer seat>`):** "A PR changed on `<repo>`. Read its number and head SHA. If `<log>` already has this PR + SHA + action, stop. Otherwise decide the action: first review (no verdict yet), re-check (push after your FAIL; this is the single re-check), or re-look (push after your PASS or HOLD). Review against the house bar: only S1/S2 with a repro can FAIL; nits go on the PR as notes. Post the verdict on the PR as your own app, naming the head SHA. Append one line to `<log>`. Send no message to anyone else."

**Issue watcher (`<reviewer seat>`, on issue opened, with a 15-minute sweep as fallback):** "An issue was opened, or the fallback sweep fired. List issues opened since the time in `house/watchers/issue-sweep-last.txt` that you did not file and have not gated. For each, gate it: S1/S2 with a repro stays an issue as the spec; anything else becomes a card with a note on the issue. Log what you gated and rewrite the cursor. If nothing is new, send nothing."

**Merge watcher (`<lab tester>`):** "A PR merged to `<integration branch>`. Append one unticked line to `house/watchers/merge-queue.md` with repo, PR, merge SHA, the issue it fixes and what to retest. When the lab shows that commit, run the lean retest for all unticked lines, tick each PASS or FAIL with one note, and on PASS comment PASS with the merge SHA on the issue and close it as your own app. On FAIL leave the issue open, put the note on the PR, and send `<env operator>` one line. Send no acks."

**Stall sweep (`<coordinator>`, hourly 24/7):** "Run the stall sweep in docs/opproc-cadence.md §3. For each stuck item not already nudged today, message its one owning seat directly and append item + time to `house/watchers/stall-sweep.log`. If the owner is an outside builder with no seat, flag the item for `<human owner>` instead. If nothing is stuck, append one quiet line and send nothing."
