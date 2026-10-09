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

## 3. Stall sweep (hourly, 24/7)

One sweep per hour, 24/7 (for example cron `9 * * * *`), run by the `<coordinator>`. Default thresholds:

1. A PR with no verdict more than 30 minutes after its head moved.
2. A queue line still unticked, or a PASS + green PR still unmerged, more than 60 minutes later.
3. An open P0/P1 with no linked PR after 2 hours.
4. A parked PR (re-check failed): goes to the `<human owner>` as "ship the smaller fix or shelve it".

Defaults: 30m / 60m / 2h, hourly, 24/7. Tune them in the house.

A nudge goes to the one owning seat, directly. Log each nudge (item + time) and never nudge the same item twice in one day. A sweep that finds nothing writes one quiet log line and sends nothing.

Lesson: a sweep that ran only on weekday business hours stranded six retests overnight. Cloud agents and the coder keep working after hours, so the sweep runs 24/7.

## 4. Merge queue file (the retest ledger)

`house/watchers/merge-queue.md`, one line per merge:

```
- [ ] <repo> #<PR> <merge sha> fixes #<issue> — <title> — retest: <what to check>
```

The `<lab tester>` runs one batched lean retest (that bug plus a quick regression) on the latest lab build and ticks each line `[x] PASS` or `[!] FAIL` with one plain note. On PASS it comments PASS with the merge SHA on the issue and closes it (merges to a non-default branch do not auto-close). On FAIL the issue stays open, the note goes on the PR for the coder's one fix, and the `<lab tester>` sends `<env operator>` one line. Why: the queue is the only place that says what has been merged but not yet proven on the lab.

## 5. Live mesh (names and times, never text)

The live page is fed by metadata and outcomes only, never PR, issue, comment or prompt bodies. Two append-only files add the human side:

- `fleet/prompts.jsonl`: one pulse per direct message. `{"t_ct": "<ISO time>", "from": "<sender>", "to": "<seat or room>"}`. Written by the receiving seat for human-to-seat messages and by the sender for seat-to-seat messages. Never the message text, never a secret.
- `fleet/activity.jsonl`: one line when a seat starts or ends background work. `{"t_ct": "<ISO time with offset>", "kind": "turn|subagent|watcher", "action": "start|end", "tag": "<short label>"}`. The page shows the seat as working until the matching end, capped at 60 minutes so a missed end line cannot spin forever.

The line is what `validActivity` accepts ([house/burst/ACTIVITY.md](../house/burst/ACTIVITY.md)). The only fields are `t_ct`, `kind`, `action`, `to`, `agent` and `tag`; any other field, including `seat`, refuses the whole line. Values are short plain strings with no free text. A `cloud_agent` line (`launch|reply|finished|cancel`) needs `agent`, the cloud agent id. The seat is never written in the line. Whoever accepts it adds `by` (the seat) and `seq`: `acceptLine` with the writing seat's name on the house box, or the feed server from the app token on `POST /activity`.

`<coder>` and cloud agents, which do not share the house box, post the same line to the feed's `POST /activity` with their own app token. A prompt pulse can go the same way as `{"t_ct": "<ISO time with offset>", "kind": "prompt", "action": "sent|received", "to": "<seat>"}`.

## 6. Generated waveboard

`house/WAVEBOARD.md` is regenerated by a script, not hand-edited: open PRs and issues and verdicts (read-only GitHub calls), the merge queue, the live feed and the cloud-agent log. Hand-kept items (waiting on the human, standing notes) live in a separate static file that the script merges in by section. The script never writes to GitHub. Why: a hand-edited board drifts from GitHub and the queue.

## 7. Deep-burn lanes

For a burst of build work, split it into lanes: one cloud agent per repo area, each lane owning a fixed set of paths so no two agents edit the same files. Run at most 4 lanes at once, in waves; a lane's next PR starts when its last one has a verdict. Tag each cloud agent with its lane so the board can group PRs by lane.

## Watcher prompts (paste into a seat routine)

**PR watcher (`<reviewer seat>`):** "A PR changed on `<repo>`. Read its number and head SHA. If `<log>` already has this PR + SHA + action, stop. Otherwise decide the action: first review (no verdict yet), re-check (push after your FAIL; this is the single re-check), or re-look (push after your PASS or HOLD). Review against the house bar: only S1/S2 with a repro can FAIL; nits go on the PR as notes. Post the verdict on the PR as your own app, naming the head SHA. Append one line to `<log>`. Send no message to anyone else."

**Issue watcher (`<reviewer seat>`, on issue opened, with a 15-minute sweep as fallback):** "An issue was opened, or the fallback sweep fired. List issues opened since the last check that you did not file and have not gated. For each, gate it: S1/S2 with a repro stays an issue as the spec; anything else becomes a card with a note on the issue. Log what you gated. If nothing is new, send nothing."

**Merge watcher (`<lab tester>`):** "A PR merged to `<integration branch>`. Append one unticked line to `house/watchers/merge-queue.md` with repo, PR, merge SHA, the issue it fixes and what to retest. When the lab shows that commit, run the lean retest for all unticked lines, tick each PASS or FAIL with one note, and on PASS comment PASS with the merge SHA on the issue and close it as your own app. On FAIL leave the issue open, put the note on the PR, and send `<env operator>` one line. Send no acks."

**Stall sweep (`<coordinator>`, hourly 24/7):** "Run the stall sweep in docs/opproc-cadence.md §3. For each stuck item not already nudged today, message its one owning seat directly and append item + time to `house/watchers/stall-sweep.log`. If nothing is stuck, append one quiet line and send nothing."
