# Live mesh feed

Machine-readable feed of the **ping-pong** volley (house OP-PROC lexicon: seat↔seat PR/issue review, fix, re-Light, merge) that drives the animated mesh. It replaces rebuilding `live-events.json` by hand from `SEGMENT-LOG.md` / `X-PINGPONG.md`.

X is wake/chatter, not the sport. X events show up only when you merge them in from an existing feed (`--merge-x`). This tool does not call the X API.

## Files

| Path | What |
|---|---|
| `fetch_feed.py` | Poller. Reads the GitHub REST API for `0xRayAI/muse-house` and `0xRayAI/xray` (PRs, PR commits, reviews, issue comments, check runs, issues) and writes the feed. Python 3.9+, stdlib only. |
| `render_mesh.py` | Mesh renderer, forked from `dist-media/ping-pong/render_muse_live.py` (same layout, seats, and colors). Reads the feed and writes an mp4 and/or PNG frames. Needs Pillow + ffmpeg. |
| `schema.json` | JSON Schema for the feed. |
| `sample/live-events.json` | Real feed written by `fetch_feed.py` on 2026-10-05 with a UTC `--since 2026-10-04T15:00:00+00:00` (= 10:00 CT); X events merged from the old hand feed. Local inputs are listed by file name only. |
| `light-notes.example.jsonl` | Format for in-room critic Lights that never touch GitHub. |
| `feed/` | Default live output dir (git-ignored). |

## Run it

```bash
export GITHUB_TOKEN=...            # any token that can read both repos (an App installation token works)
cd house/live-mesh

# one pass
python3 fetch_feed.py --out feed/live-events.json --hours 48

# near-live: poll every 120 s
python3 fetch_feed.py --out feed/live-events.json --watch 120 \
  [--merge-x /workspace/dist-media/ping-pong/live-events.json] \
  [--light-notes feed/light-notes.jsonl]

# 10 s replay of the newest 24 events
python3 render_mesh.py --feed feed/live-events.json --out feed/mesh-10s.mp4 --duration 10

# a fixed window instead of the newest events
python3 render_mesh.py --feed feed/live-events.json --out feed/arc.mp4 \
  --from 2026-10-04T10:00 --to 2026-10-04T11:13 --last 40

# follow: re-render the clip whenever the newest event changes (check every 30 s)
python3 render_mesh.py --feed feed/live-events.json --out feed/mesh-10s.mp4 --follow 30
```

Each pass writes `live-events.json` to a temp file and renames it into place, so readers never see a half-written file. Events seen for the first time are also appended to `live-events.jsonl`, one JSON object per line.

Cost: the first pass makes about 5 API calls per PR updated in the window (the 2026-10-04 10:00 CT → now sample took about 104 calls, about 70 s). In watch mode, unchanged closed PRs are cached and open PRs are re-read every 10 min, so a quiet pass costs about 4 calls. At `--watch 120` that is well under the 5000/h token limit.

## How the watcher reads it

Pick either one. Both are polling over plain files, with no socket.

1. **Poll JSON.** Re-read `feed/live-events.json` when its mtime changes, or every N seconds. Dedupe on `events[].id`. `render_mesh.py --follow` works this way.
2. **Tail JSONL.** `tail -F feed/live-events.jsonl` emits each new event once, as soon as the poller sees it.

Latency is the poll interval plus GitHub API freshness, so typically 1–3 min. That is near-live, not push. A WebSocket or GitHub webhook push would be a separate scope; it is not built here.

## Format

The top-level shape is the same as the hand-built `dist-media/ping-pong/live-events.json`: `title, sources, repo, seats, services, notes, event_count, events[]`. The poller adds `repos`, `generated_at`, and `kinds`. On top of the old fields `{t_ct, from, to, kind, label, source, src_file}`, each event adds `id`, `repo`, and `number`, plus `note` / `reported_by` when relevant. Old readers keep working. See `schema.json`.

```json
{
  "id": "0xRayAI/muse-house#6:comment:5981735787:light",
  "t_ct": "2026-10-04T10:44:58-05:00",
  "from": "critic",
  "to": "minime0x",
  "kind": "critic_fail",
  "label": "Light FAIL (via forge) · muse-house #6",
  "source": "https://github.com/0xRayAI/muse-house/pull/6#issuecomment-5981735787",
  "src_file": "github-api",
  "repo": "0xRayAI/muse-house",
  "number": 6,
  "note": "reported in forge comment; Light time <= this time",
  "reported_by": "forge"
}
```

### Seats

`from` / `to` are mesh nodes. The seats are `blinky, mill, forge, critic, herald, minime0x`, the rails are `GitHub, X, mymuse.house`, and the people are `Blaze0x1` and `grok`. GitHub logins map to seats: `forge0x1[bot]`→forge, `minime0x[bot]`→minime0x, `0xray-critic[bot]`→critic, `htafolla`→Blaze0x1, `github-actions[bot]`→GitHub. A PR's author seat comes from the branch prefix first, so `mill/*` maps to mill even though mill ships through the forge0x1 App.

### Event kinds

| kind | Source on GitHub |
|---|---|
| `pr_open` | PR `created_at` |
| `pr_update` | each PR commit after the first (fix / re-push) |
| `merged` / `pr_close` | PR `merged_at` / `closed_at` when not merged |
| `supersede` | PR or issue comment that says supersede |
| `critic_pass` / `critic_fail` | critic App review or check run; critic comment with `Light PASS/FAIL` or `critic PASS/FAIL` (verdict in caps, right after the word); a `light-notes.jsonl` line; or another seat's comment that states a Light verdict (`reported_by` set, time = when reported) |
| `ci_pass` / `ci_fail` | the `CI Summary` check run on the PR head only (one CI event per head, not one per job) |
| `review`, `comment` | other reviews and comments |
| `issue_open`, `issue_close` | non-PR issues |
| `x_root`, `x_reply` | only via `--merge-x` |

## Honesty limits

- Many critic Lights happen in the room and never reach GitHub. `muse-house #21` and `xray #213` have no review or comment on record, so the sample has no critic event for them. If critic records the Light as a line in `light-notes.jsonl`, the poller picks it up. The poller never reads markdown logs.
- A Light reported second-hand, such as forge's "Superseded … after Light FAIL", is stamped with the comment time. The Light itself happened at or before that time.
- `t_ct` is America/Chicago with its offset, converted from GitHub's UTC.
- Labels are capped at 54 characters, and the words on the mesh ban list are masked.
