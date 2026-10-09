# Burst watcher playbook

Burst is the live activity network. A packet is one event. Spectrum is the page
(`docs-site/static/live`) replaying the feed; the center node reads `LiveMesh.HUB_LABEL`
(`Burst`). Working is a light under a seat icon. It is not a packet and it is not
counted in N of M.

Privacy for every watcher: ids, times, and counts. No command lines, env, file names,
file contents, comment bodies, or commit messages in the working store. The lab-run
store is one time per seat.

## Active vs working

| | Counted in N of M | What lights it |
|---|---|---|
| Active | yes | a GitHub event, owned-file mtime, prompt, or activity line within 15 min |
| Working | no | the signals below |

The fleet line on the page counts seats that have a packet in flight. A working-only
seat stays out of that count.

## LIVE vs behind

`generated_at` age ≤ 90s → the pill says **LIVE**. Older than that → **behind N min**
(`max(1, round(age/60))`). The pill is feed freshness. Rewound playback stays on the
timeline, not in the pill.

## Watchers

| Watcher | Source | Cadence | Emits | Privacy | How a seat plugs in |
|---|---|---|---|---|---|
| GitHub collector | `house/live-mesh/fetch_feed.py` | every `--watch` pass (45s when the seat asks for that) | packets: PR open/update, reviews, comment metadata, checks, merges, pushes | ids, times, status words; no commit message on branch-tip pushes | App env `GITHUB_APP_*`. `BURST_TOKEN_MINTED=$(date +%s)` so a paused VM re-mints on the wall clock |
| Branch tips | `branch_tip_events` inside the same pass | every pass, not after a backfill gate, any branch except `live-wire` | packet `push` | branch name, short sha, author login, committer time. The commit message is not stored | nothing extra |
| PR opens | `pr_events` on the pulls list | every pass, any base branch | packet `pr_open` | existing feed fields | nothing extra |
| GitHub-check working | check runs on the PR head | every pass | working, not a packet | one until-time per author seat | automatic for a PR the seat authored |
| /health | `probe` in `fetch_feed.py` | `--health-every` (default 60s), emit on status change | packet `health_ok` / `health_fail` | HTTP status code and time. The body is not read | `--health URL` |
| Lab-run working | `house/burst/working.py` | every collector pass when `BURST_LABS` is set | working, not a packet | one until-time per seat. Mtimes, cwd, and CPU time only | `BURST_LABS` JSON: `[{seat, runs, folders}]` |
| Railway deploys | the seat writes a status file; the collector does not call Railway | seat poll 180s | packet only if the seat maps a status change into the feed | id, status word, time | keep project ids in the seat's own config, not in this repo |
| House board and merge queue | files the seat already writes | every collector pass when the seat points at them | counts and card ids | ids, status words, counts | not a second copy of the house tree |
| prompts.jsonl / cloud-agents.jsonl | tail the seat's log | every pass the seat runs | activity lines | names, times, ids. No message text | `POST /activity` or a local line that passes `validActivity` |
| POST /activity | `house/burst/activity.mjs` | when the seat posts | one stored line | strict short fields; seat comes from the verified token | the seat's own GitHub App installation token |
| Supervisor | `house/burst/supervise.py` | restarts when the feed exits; re-mint at 50 min of wall time | process start, exit 75 | no tokens in logs | `BURST_TOKEN_MINTED` from `date +%s` |
| Watchdog | the same restart loop | about 60s | start the feed again if it died | none | `run()` until the stop file exists |
| Delta pusher | `house/burst/delta.mjs` + `push.sh` | mtime check 2s; cursor on each push | full or delta feed | events already in the feed | `?since=<cursor>` |
| Pages tripwire | `house/live-mesh/tripwire_push.py` | 300s | `feed_push` when the public snapshot changes | existing feed | unchanged |

### Lab-run working (live rule)

A seat is working when either:

- any **file** under its run folders changed in the last **150s** (mtimes only; skip directories named `node_modules` and `.git`), or
- a process whose cwd is inside the seat's lab folders used **≥ 1s CPU** since the previous pass. That light stays **120s**.

The first CPU sample is a baseline only. Folder mtime is not the signal: it changes on add/remove, and a test stretch writes no new files. The store is one until-time per seat.

### GitHub-check working

A running, queued, or failing check on a PR the seat authored, newer than that PR's last merge, within 30 minutes. Success does not light working.

### Header dot

The existing header dot blinks in the seat color while that seat is working. The chip text stays `LIVE` or `IDLE`. There is no extra word and no extra glyph.

### Delta and the page poll

Cursor is `epoch.seq`. A delta whose `base` is not the current cursor is **409** with the current cursor; the client refetches the full feed. `?since` at the current seq is **304**. When the feed carries a cursor, the page polls `live-events.json?since=` every **10s**. The GitHub contents poll stays at 60s so an anonymous viewer does not burn the hourly limit.

### Tokens

Re-mint when wall-clock age reaches 50 minutes (`remint_due`). A **401** raises `AuthExpired`, which is not an `OSError`, so a per-step handler cannot treat it as a dropped connection. The pass does not write, and the process exits **75**.

Installation token shape, before any GitHub call:

```
/^ghs_[A-Za-z0-9._-]{20,1024}$/
```

There is no static `ACTIVITY_KEY` fallback. The verdict cache stores `sha256(token)` only.

### Git and gh

`house/burst/bin/gh` forces the read-only plan (a non-read permission exits 2). `git-credential` and `use-repo` take `BURST_BOT_LOGIN` and `BURST_BOT_ID` from the environment. App id and installation id are `GITHUB_APP_ID` and `GITHUB_APP_INSTALLATION_ID`.

### Pusher lock

`push.sh` holds flock on fd 9 and sleeps with `9>&-`, so a stopped pusher's orphan sleep does not keep the lock.

## Fixes log

1. **Lab-run working looked idle during a test stretch.** Folder mtime changes only when a name is added or removed, and a test stretch writes no files. Working is any file mtime under the run folders in the last 150s (skip `node_modules` and `.git`) or ≥1s CPU in a lab-folder cwd (hold 120s). Read mtimes, cwd, and CPU time only. Store one time per seat. Not counted in N of M.

2. **A seat with a running check looked idle.** Working is a running, queued, or failing check on a PR that seat authored, newer than its last merge, within 30 minutes.

3. **PR opens and branch pushes waited on a backfill and on main.** Every collector pass lists pulls and branch tips. Any branch except `live-wire`. The tip event does not store the commit message.

4. **A paused VM kept a dead token, and a 401 rewrote the feed as fresh.** Re-mint compares `time.time()` values. `AuthExpired` is not an `OSError`. Exit 75. Do not write.

5. **The page refetched the whole feed and could not tell a stale cursor.** Push deltas carry `epoch.seq`. A bad base is 409. `?since` at the current seq is 304. The page polls that every 10s once the feed has a cursor.

6. **Working added a word next to the seat.** The existing header dot blinks in the seat color. The chip text does not change.

7. **Off-box seats could not post.** `POST /activity` verifies that seat's GitHub App installation token (bot login, bot id, and org) and stores one strict line. No static key.

8. **Real installation tokens got 401 before GitHub was asked.** The shape check was `ghs_[A-Za-z0-9]{20,255}`, which rejects `.` and `_` and anything longer than 255. Live tokens are ~380 characters and contain both. The check is `^ghs_[A-Za-z0-9._-]{20,1024}$`.

9. **A stopped pusher left the lock held.** `sleep` runs with fd 9 closed (`9>&-`).
