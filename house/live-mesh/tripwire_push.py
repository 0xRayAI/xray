#!/usr/bin/env python3
"""Push changed live-mesh artifacts to the Pages replay branch.

fetch_feed.py and render_mesh.py keep running on their own. This process does
not poll GitHub and does not render. Every --interval seconds (default 300) it
hashes the local feed. When the hash changes, it copies the files onto a branch
cut from origin/main and pushes that branch so Deploy Docs rebuilds GitHub Pages.

The JSON fingerprint is the events payload. A rewrite that only bumps
generated_at does not push. The mp4 fingerprint is a byte hash. No Actions cron.

Each real push is itself a packet: the published snapshot carries a feed_push event
(--seat -> GitHub) and the same event is appended to --ledger, which fetch_feed.py folds
back into the local feed. feed_push events are left out of the fingerprint, so a
feed_push-only change never trips another push (no self-loop); it rides the next real one.

  python3 tripwire_push.py                 # loop every 5 min
  python3 tripwire_push.py --once          # one check, then exit
  python3 tripwire_push.py --dry-run --once

Stop the loop with Ctrl-C. That does not stop the watchers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
DEFAULT_BRANCH = "live-wire"
DEST = {
    "feed": "docs-site/static/live/live-events.json",
    "mesh": "docs-site/static/live/mesh-live.mp4",
}
BRANCH_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$")
TOKEN_RE = re.compile(r"https://[^@\s/]+@")


def log(msg: str) -> None:
    print(f"[live-wire {datetime.now(CT):%H:%M:%S} CT] {msg}", file=sys.stderr, flush=True)


def scrub(text: str) -> str:
    return TOKEN_RE.sub("https://", text)


def _real_events(events):
    """Events that count toward a push: everything except the tripwire's own feed_push records."""
    if not isinstance(events, list):
        return events
    return [e for e in events if not (isinstance(e, dict) and e.get("kind") == "feed_push")]


def fingerprint_bytes(name: str, data: bytes) -> str:
    if name.endswith(".json"):
        try:
            parsed = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return "raw:" + hashlib.sha256(data).hexdigest()
        if not isinstance(parsed, dict):
            return "raw:" + hashlib.sha256(data).hexdigest()
        events = _real_events(parsed.get("events"))
        payload = {"event_count": len(events) if isinstance(events, list) else parsed.get("event_count"),
                   "events": events}
        blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
        return "events:" + hashlib.sha256(blob).hexdigest()
    return "raw:" + hashlib.sha256(data).hexdigest()


def fingerprint_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    return fingerprint_bytes(path.name, path.read_bytes())


def should_push(local: dict[str, str | None], remote: dict[str, str | None]) -> bool:
    """True when a present local artifact differs from remote. Missing local files are ignored."""
    for key, fp in local.items():
        if fp is None:
            continue
        if fp != remote.get(key):
            return True
    return False


def needs_publish(
    local: dict[str, str | None],
    on_branch: dict[str, str | None],
    on_main: dict[str, str | None],
    *,
    branch_exists: bool,
    main_incorporated: bool,
) -> bool:
    """Decide whether the replay branch must move.

    Compare against the replay branch once it exists, otherwise against main.
    If main has moved and no longer contains the overlay, publish again so a
    main Pages deploy cannot leave a stale snapshot up.
    """
    if not any(fp is not None for fp in local.values()):
        return False
    published = on_branch if branch_exists else on_main
    if not should_push(local, published):
        if branch_exists and not main_incorporated and should_push(local, on_main):
            return True
        return False
    return True


def check_branch(name: str) -> str:
    if name in {"main", "master"} or name.startswith("main/") or name.startswith("master/"):
        raise SystemExit("refusing to push main from the tripwire; Pages replay branch is live-wire")
    if not BRANCH_RE.match(name):
        raise SystemExit(f"unsafe branch name: {name}")
    return name


def run(args: list[str], cwd: Path, *, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    proc = subprocess.run(args, cwd=cwd, capture_output=True, env=env)
    if check and proc.returncode != 0:
        err = scrub(proc.stderr.decode("utf-8", "replace")).strip()
        raise RuntimeError(f"{args[0]} {args[1] if len(args) > 1 else ''} -> {proc.returncode} {err}")
    return proc


def repo_root(start: Path) -> Path:
    proc = run(["git", "rev-parse", "--show-toplevel"], start)
    return Path(proc.stdout.decode().strip())


def remote_head(repo: Path, branch: str) -> str | None:
    proc = run(["git", "ls-remote", "--heads", "origin", branch], repo, check=False)
    if proc.returncode != 0:
        err = scrub(proc.stderr.decode("utf-8", "replace")).strip()
        raise RuntimeError(f"ls-remote -> {proc.returncode} {err}")
    line = proc.stdout.decode().strip()
    if not line:
        return None
    return line.split()[0]


def fingerprint_at(repo: Path, rev: str, relpath: str) -> str | None:
    spec = f"{rev}:{relpath}"
    probe = run(["git", "cat-file", "-e", spec], repo, check=False)
    if probe.returncode != 0:
        return None
    proc = run(["git", "show", spec], repo)
    return fingerprint_bytes(Path(relpath).name, proc.stdout)


def fingerprints_at(repo: Path, rev: str) -> dict[str, str | None]:
    return {key: fingerprint_at(repo, rev, rel) for key, rel in DEST.items()}


def is_ancestor(repo: Path, ancestor: str, descendant: str) -> bool:
    proc = run(["git", "merge-base", "--is-ancestor", ancestor, descendant], repo, check=False)
    return proc.returncode == 0


def fetch_refs(repo: Path, branch: str, branch_sha: str | None) -> None:
    run(["git", "fetch", "--quiet", "origin", "main"], repo)
    if branch_sha:
        run(
            ["git", "fetch", "--quiet", "origin", f"+refs/heads/{branch}:refs/remotes/origin/{branch}"],
            repo,
        )


def push_event(now: datetime, seat: str, branch: str, n_events: int) -> dict:
    return {"id": f"{branch}:push:{now:%Y%m%dT%H%M%S}", "t_ct": now.isoformat(timespec="seconds"),
            "from": seat, "to": "GitHub", "kind": "feed_push", "direction": "internal",
            "label": f"{seat} pushed {branch} · {n_events} events"[:54],
            "source": f"https://github.com/0xRayAI/xray/commits/{branch}",
            "src_file": "feed-pushes.jsonl", "repo": "0xRayAI/xray"}


def snapshot_bytes(data: bytes, event: dict | None) -> bytes:
    """The feed as published: local feed plus this push's own feed_push event."""
    if event is None:
        return data
    try:
        feed = json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return data
    if not isinstance(feed, dict) or not isinstance(feed.get("events"), list):
        return data
    feed["events"] = [e for e in feed["events"] if not (isinstance(e, dict) and e.get("id") == event["id"])] + [event]
    feed["event_count"] = len(feed["events"])
    return (json.dumps(feed, indent=2, ensure_ascii=False) + "\n").encode()


def record_push(ledger: Path, event: dict) -> None:
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("a") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def publish(repo: Path, branch: str, local_paths: dict[str, Path], branch_sha: str | None,
            event: dict | None = None) -> bool:
    """Returns True when a snapshot commit was pushed (a real push)."""
    work = Path(tempfile.mkdtemp(prefix="xray-live-wire-"))
    added = False
    try:
        run(["git", "worktree", "add", "--detach", str(work), "origin/main"], repo)
        added = True
        rels: list[str] = []
        for key, src in local_paths.items():
            if not src.is_file():
                continue
            dest = work / DEST[key]
            dest.parent.mkdir(parents=True, exist_ok=True)
            if key == "feed":
                dest.write_bytes(snapshot_bytes(src.read_bytes(), event))
            else:
                shutil.copyfile(src, dest)
            rels.append(DEST[key])
        if not rels:
            log("no local artifacts to copy")
            return False
        run(["git", "add", "--", *rels], work)
        diff = run(["git", "diff", "--cached", "--quiet"], work, check=False)
        if diff.returncode == 0:
            if branch_sha:
                log("replay bytes already match main; moving live branch pointer")
                run(
                    [
                        "git",
                        "push",
                        f"--force-with-lease=refs/heads/{branch}:{branch_sha}",
                        "origin",
                        f"origin/main:refs/heads/{branch}",
                    ],
                    repo,
                )
            else:
                log("replay bytes already match main; no branch to move")
            return False
        if diff.returncode != 1:
            err = scrub(diff.stderr.decode("utf-8", "replace")).strip()
            raise RuntimeError(f"git diff -> {diff.returncode} {err}")
        run(
            [
                "git",
                "-c",
                "user.name=live-wire",
                "-c",
                "user.email=live-wire@users.noreply.github.com",
                "commit",
                "-m",
                "live-wire: replay snapshot",
            ],
            work,
        )
        if branch_sha:
            run(
                [
                    "git",
                    "push",
                    f"--force-with-lease=refs/heads/{branch}:{branch_sha}",
                    "origin",
                    f"HEAD:refs/heads/{branch}",
                ],
                work,
            )
        else:
            run(["git", "push", "origin", f"HEAD:refs/heads/{branch}"], work)
        log(f"pushed {branch}")
        return True
    finally:
        if added:
            run(["git", "worktree", "remove", "--force", str(work)], repo, check=False)
        shutil.rmtree(work, ignore_errors=True)


def tick(repo: Path, branch: str, feed: Path, mesh: Path, *, dry_run: bool,
         seat: str = "mill", ledger: Path | None = None) -> None:
    local_paths = {"feed": feed, "mesh": mesh}
    local = {key: fingerprint_file(path) for key, path in local_paths.items()}
    if not any(fp is not None for fp in local.values()):
        log(f"no feed files yet ({feed.name}, {mesh.name}); watchers still own the loop")
        return
    branch_sha = remote_head(repo, branch)
    fetch_refs(repo, branch, branch_sha)
    on_main = fingerprints_at(repo, "origin/main")
    on_branch = fingerprints_at(repo, f"origin/{branch}") if branch_sha else {key: None for key in DEST}
    incorporated = bool(branch_sha) and is_ancestor(repo, "origin/main", f"origin/{branch}")
    if not needs_publish(
        local,
        on_branch,
        on_main,
        branch_exists=bool(branch_sha),
        main_incorporated=incorporated,
    ):
        log("unchanged; no push")
        return
    changed = [key for key, fp in local.items() if fp is not None and fp != (on_branch if branch_sha else on_main).get(key)]
    log("changed: " + (", ".join(changed) if changed else "main moved under the replay"))
    if dry_run:
        log(f"dry-run; would push {branch}")
        return
    n = 0
    try:
        n = len(_real_events(json.loads(feed.read_text()).get("events")) or [])
    except (OSError, ValueError, AttributeError):
        pass
    event = push_event(datetime.now(CT), seat, branch, n)
    if publish(repo, branch, local_paths, branch_sha, event) and ledger is not None:
        record_push(ledger, event)


def parse_args(argv: list[str]) -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Push live-mesh artifacts to the Pages replay branch when they change.")
    parser.add_argument("--feed", type=Path, default=here / "feed" / "live-events.json")
    parser.add_argument("--mesh", type=Path, default=here / "feed" / "mesh-live.mp4")
    parser.add_argument("--branch", default=DEFAULT_BRANCH)
    parser.add_argument("--interval", type=int, default=300, help="seconds between checks (default 300)")
    parser.add_argument("--once", action="store_true", help="check once and exit")
    parser.add_argument("--dry-run", action="store_true", help="report the decision without pushing")
    parser.add_argument("--seat", default="mill", help="seat that owns the live-wire watch (packet source)")
    parser.add_argument("--ledger", type=Path, help="feed_push ledger (default: <feed dir>/feed-pushes.jsonl)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    branch = check_branch(args.branch)
    if args.interval < 1:
        raise SystemExit("--interval must be >= 1")
    repo = repo_root(Path(__file__).resolve().parent)
    feed = args.feed if args.feed.is_absolute() else repo / args.feed
    mesh = args.mesh if args.mesh.is_absolute() else repo / args.mesh
    log(f"tripwire every {args.interval}s; branch {branch}; stop with Ctrl-C")
    log("site lag is about 5 min (this interval plus the Pages build)")
    while True:
        try:
            tick(repo, branch, feed, mesh, dry_run=args.dry_run, seat=args.seat,
                 ledger=args.ledger or feed.parent / "feed-pushes.jsonl")
        except KeyboardInterrupt:
            log("stopped")
            return 0
        except Exception as exc:
            log(scrub(str(exc)))
            if args.once:
                return 1
        if args.once:
            return 0
        try:
            time.sleep(args.interval)
        except KeyboardInterrupt:
            log("stopped")
            return 0


if __name__ == "__main__":
    sys.exit(main())
