# Live mesh feed

Machine-written, ordered event stream for the **ping-pong** volley (seat↔seat PR/issue review, fix, re-Light, merge) plus muse-house deploys, `/health`, and X both ways. It drives `render_mesh.py` pings and the activity log. Nothing is rebuilt from markdown.

X is wake/chatter, not the sport. X events come from herald's JSONL ledger (`--x-ledger`) or, as an interim hand log, `--merge-x`. There is no X API adapter in this tree; nothing is posted to X.

## Files

| Path | What |
|---|---|
| `fetch_feed.py` | Poller (Python 3.9+, stdlib). GitHub REST for `0xRayAI/muse-house` + `0xRayAI/xray`, Deployments → `deploy`/`deploy_fail`, `/health` state-change probe, light-notes, X ledger / `--merge-x`. |
| `render_mesh.py` | Mesh renderer (Pillow + ffmpeg). Reads the feed; `--follow` re-renders on new events. |
| `schema.json` | Kind / direction / node enums. Legacy kinds (`fix`, `probe`, `x_root`, `x_reply`) allowed on read. |
| `sample/live-events.json` | Regenerated feed (GitHub + deploy + health + X from the live `x-ledger`). Basenames only. |
| `x-ledger.example.jsonl` | Herald's ledger line format (illustrative). |
| `light-notes.example.jsonl` | In-room critic Light format. |
| `feed/` | Live output (git-ignored): `live-events.json`, `live-events.jsonl`, `x-ledger.jsonl`, `health-state.json`. |

## Run

```bash
export GITHUB_TOKEN=...   # App installation token that can read both repos
cd house/live-mesh

# preferred: herald's live x-ledger (mentions + posts/likes append here)
python3 fetch_feed.py --out feed/live-events.json --since 2026-10-04T10:00 \
  --x-ledger feed/x-ledger.jsonl

# near-live
python3 fetch_feed.py --out feed/live-events.json --watch 120

# interim only: normalize a hand-built feed (herald v2) until the ledger covers the window
python3 fetch_feed.py --out feed/live-events.json --since 2026-10-04T10:00 \
  --merge-x /path/to/herald-v2-live-events.json

python3 render_mesh.py --feed feed/live-events.json --out feed/mesh-10s.mp4 --duration 10
python3 render_mesh.py --feed feed/live-events.json --out feed/mesh-10s.mp4 --follow 30
```

Defaults: `--deploy-repo 0xRayAI/muse-house`, `--health https://mymuse.house/health` (probe every 60 s, emit on state change), `--x-ledger <out-dir>/x-ledger.jsonl`. Pass `--deploy-repo ''` or `--health ''` to turn either off.

Each pass rewrites `live-events.json` atomically and appends only new ids to `live-events.jsonl`.

## Watch path

1. **Poll JSON.** Re-read `feed/live-events.json` on mtime change (or every N s). Dedupe on `events[].id`. `render_mesh.py --follow` does this.
2. **Tail JSONL.** `tail -F feed/live-events.jsonl`.

Latency = poll interval + source freshness (GitHub API / herald's 15-min monitor). Poll only; no WebSocket.

## Event shape

Required on every event: `id, t_ct, from, to, kind, direction, label (≤54), source, src_file`.

| direction | meaning |
|---|---|
| `in` | X → house (`x_in_*`) |
| `out` | house → X (`x_out_*`, `x_like`) |
| `internal` | eng / site |

Canonical kinds: eng (`pr_open pr_update supersede critic_* ci_* review comment merged pr_close issue_*`), site (`deploy deploy_fail health_ok health_fail`), X in (`x_in_mention x_in_reply`), X out (`x_out_reply x_out_root x_like`).

Legacy on read → write: `fix`→`pr_update`, `probe`→`health_ok`, `x_root`→`x_out_root`, `x_reply` from herald → `x_out_reply`, else `x_in_reply`.

Order: `(UTC instant of t_ct, kind_rank, id)`. Same id from two sources: API / deployments / health-probe / x-api > `x-ledger.jsonl` > `light-notes.jsonl` > `--merge-x`.

### Mesh pings

| kinds | ping |
|---|---|
| `x_in_*` | X → herald |
| `x_out_*`, `x_like` | herald → X |
| `deploy*` | GitHub → mymuse.house |
| `health_*` | mymuse.house → blinky |
| eng | actor seat → GitHub (critic_* → author; ci_* → author) |

### Sources

- **GitHub:** PRs, commits (`pr_update`), reviews, comments, `CI Summary` only, issues; critic verdicts incl. second-hand `reported_by`.
- **Deployments:** `GET /repos/0xRayAI/muse-house/deployments` + terminal status → `deploy` / `deploy_fail`.
- **/health:** probe; emit only on state change (or first ok after a newer deploy). State in `feed/health-state.json`.
- **X ledger:** herald appends lines; see `x-ledger.example.jsonl`.
- **`--merge-x`:** interim hand log of herald v2 kinds; labeled as such in `notes`.
- **light-notes:** in-room Lights.

## Honesty

- Many critic Lights never reach GitHub; use `light-notes.jsonl` for those.
- Second-hand Light in a seat comment is stamped with the comment time (`reported_by` set).
- `--merge-x` is a hand log, not a live X read. Notes say so.
- Ban list (`Dist` / `emergence` / `compaction`) is masked in labels. No post bodies in labels.
