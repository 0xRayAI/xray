#!/usr/bin/env python3
"""Live mesh feed: poll GitHub for the ping-pong volley and write live-events.json.

Ping-pong = the PR/issue volley between seats (open, review, fix, re-Light, merge).
X is optional wake/chatter, merged in only from an existing feed file (--merge-x).

Output keeps the capture shape the mesh renderer already reads:
  {title, sources, repo, repos, seats, services, notes, generated_at, event_count,
   events: [{id, t_ct, from, to, kind, label, source, src_file, repo?, number?, note?}]}

Stdlib only (urllib). Auth: GITHUB_TOKEN or GH_TOKEN (any token that can read the repos).

  python3 fetch_feed.py --out feed/live-events.json              # one pass
  python3 fetch_feed.py --out feed/live-events.json --watch 120  # poll every 120s

Every pass rewrites live-events.json atomically (tmp + rename) and appends only the
events it had not seen before to live-events.jsonl (one JSON object per line), so a
watcher can either re-read the JSON or `tail -f` the JSONL stream.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
API = "https://api.github.com"
DEFAULT_REPOS = ["0xRayAI/muse-house", "0xRayAI/xray"]
SEATS = ["blinky", "mill", "forge", "critic", "herald", "minime0x"]
SERVICES = ["GitHub", "X", "mymuse.house"]

# GitHub login -> mesh node. Bots are the seats' App identities.
LOGIN_SEAT = {
    "forge0x1[bot]": "forge",
    "minime0x[bot]": "minime0x",
    "0xray-critic[bot]": "critic",
    "critic0x1[bot]": "critic",
    "herald0x1[bot]": "herald",
    "blinky0x1[bot]": "blinky",
    "htafolla": "Blaze0x1",
    "github-actions[bot]": "GitHub",
}
# Branch prefix names the seat that drove the PR when it rides another seat's App
# (mill ships through the forge0x1 App on mill/* branches).
BRANCH_SEAT = {"mill/": "mill", "forge/": "forge", "critic/": "critic",
               "herald/": "herald", "blinky/": "blinky", "minime/": "minime0x"}

# A verdict is "Light PASS/FAIL" (optionally "critic"/"Verify" before Light) or "critic PASS/FAIL",
# with at most a separator between the words. Verdict must be uppercase so prose like
# "critic Light gates every PR ... pass" does not count.
VERDICT_RE = re.compile(r"(?i:\b(?:(?:critic|verify)\s+)?light|\bcritic)\s*[:\-\u2014\u00b7]?\s*(PASS|FAIL)\b")
SUPERSEDE_RE = re.compile(r"\bsupersed(?:e|ed|es|ing)\b", re.I)
BANNED = ("Dist", "emergence", "compaction")  # never shown on the mesh


def log(msg: str) -> None:
    print(f"[live-mesh {datetime.now(CT):%H:%M:%S} CT] {msg}", file=sys.stderr, flush=True)


class GitHub:
    def __init__(self, token: str | None):
        self.token = token
        self.calls = 0

    def get(self, path: str, params: dict | None = None):
        url = path if path.startswith("http") else API + path
        if params:
            # urlencode so "+00:00" in since= becomes %2B00:00 (a raw "+" decodes to a space).
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "xray-live-mesh-feed",
            **({"Authorization": f"Bearer {self.token}"} if self.token else {}),
        })
        self.calls += 1
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())

    def pages(self, path: str, params: dict | None = None, limit: int = 5):
        params = dict(params or {}, per_page=100)
        for page in range(1, limit + 1):
            batch = self.get(path, dict(params, page=page))
            if not batch:
                return
            yield from batch
            if len(batch) < 100:
                return


def to_ct(iso: str) -> str:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(CT).isoformat()


def clean(text: str) -> str:
    for b in BANNED:
        text = text.replace(b, "…")
    return " ".join(text.split())


def seat_of(login: str | None, branch: str | None = None) -> str:
    if branch:
        for prefix, seat in BRANCH_SEAT.items():
            if branch.startswith(prefix):
                return seat
    return LOGIN_SEAT.get(login or "", "GitHub")


def short(repo: str) -> str:
    return repo.split("/", 1)[1]


def ev(eid, t, frm, to, kind, label, source, repo, number, note=None):
    e = {"id": eid, "t_ct": to_ct(t) if t.endswith("Z") else t, "from": frm, "to": to,
         "kind": kind, "label": clean(label)[:54], "source": source,
         "src_file": "github-api", "repo": repo, "number": number}
    if note:
        e["note"] = note
    return e


def verdict(body: str) -> str | None:
    m = VERDICT_RE.search(body or "")
    return m.group(1).upper() if m else None


def pr_events(gh: GitHub, repo: str, pr: dict, since: datetime) -> list[dict]:
    n, title = pr["number"], pr["title"]
    url, tag = pr["html_url"], f"{short(repo)} #{n}"
    author = seat_of(pr["user"]["login"], pr["head"]["ref"])
    out: list[dict] = []
    t_since = since.isoformat()

    def recent(t: str | None) -> bool:
        return bool(t) and datetime.fromisoformat(t.replace("Z", "+00:00")) >= since

    if recent(pr["created_at"]):
        out.append(ev(f"{repo}#{n}:open", pr["created_at"], author, "GitHub", "pr_open",
                      f"{tag} opened · {title}", url, repo, n))
    # Pushes after open = fix / update volley.
    commits = list(gh.pages(f"/repos/{repo}/pulls/{n}/commits", limit=3))
    for c in commits[1:]:
        t = c["commit"]["committer"]["date"]
        if recent(t) and t > pr["created_at"]:
            out.append(ev(f"{repo}#{n}:push:{c['sha'][:12]}", t, author, "GitHub", "pr_update",
                          f"{tag} update · {c['commit']['message'].splitlines()[0]}",
                          f"{url}/commits/{c['sha']}", repo, n))
    # Reviews: critic App reviews or any review whose body carries a Light verdict.
    for r in gh.pages(f"/repos/{repo}/pulls/{n}/reviews", limit=2):
        t = r.get("submitted_at")
        if not recent(t):
            continue
        who = seat_of(r["user"]["login"])
        v = verdict(r.get("body") or "") or {"APPROVED": "PASS", "CHANGES_REQUESTED": "FAIL"}.get(r["state"])
        if who == "critic" and v:
            out.append(ev(f"{repo}#{n}:review:{r['id']}", t, "critic", author, f"critic_{v.lower()}",
                          f"critic {v} · {tag}", r["html_url"], repo, n))
        else:
            out.append(ev(f"{repo}#{n}:review:{r['id']}", t, who, author, "review",
                          f"{who} review {r['state'].lower()} · {tag}", r["html_url"], repo, n))
    # Issue comments: critic Light notes, supersede notes, other seat chatter on the PR.
    for c in gh.pages(f"/repos/{repo}/issues/{n}/comments", {"since": t_since}, limit=2):
        out.extend(comment_events(repo, n, tag, author, c))
    # Check runs on head: any critic App run is a Light verdict. Only the "CI Summary" roll-up
    # becomes ci_*, on purpose: one CI event per head instead of one per job.
    try:
        runs = gh.get(f"/repos/{repo}/commits/{pr['head']['sha']}/check-runs", {"per_page": 100})
    except urllib.error.HTTPError:
        runs = {"check_runs": []}
    for cr in runs.get("check_runs", []):
        t, concl = cr.get("completed_at"), cr.get("conclusion")
        if not recent(t) or concl not in ("success", "failure"):
            continue
        slug = (cr.get("app") or {}).get("slug", "")
        v = "PASS" if concl == "success" else "FAIL"
        if "critic" in slug or "critic" in cr["name"].lower():
            out.append(ev(f"{repo}#{n}:check:{cr['id']}", t, "critic", author, f"critic_{v.lower()}",
                          f"critic {v} · {tag}", cr["html_url"], repo, n))
        elif cr["name"] == "CI Summary":
            out.append(ev(f"{repo}#{n}:ci:{cr['id']}", t, "GitHub", author, f"ci_{v.lower()}",
                          f"CI {v.lower()} · {tag}", cr["html_url"], repo, n))
    if pr.get("merged_at") and recent(pr["merged_at"]):
        merger = seat_of((pr.get("merged_by") or {}).get("login")) if pr.get("merged_by") else "forge"
        if merger == "GitHub":
            merger = "forge"
        out.append(ev(f"{repo}#{n}:merged", pr["merged_at"], merger, "GitHub", "merged",
                      f"merged {tag} · {title}", url, repo, n))
    elif pr.get("closed_at") and recent(pr["closed_at"]):
        out.append(ev(f"{repo}#{n}:closed", pr["closed_at"], author, "GitHub", "pr_close",
                      f"closed {tag} unmerged", url, repo, n))
    return out


def comment_events(repo: str, n: int, tag: str, author: str, c: dict) -> list[dict]:
    who = seat_of(c["user"]["login"])
    body = c.get("body") or ""
    v = verdict(body)
    eid = f"{repo}#{n}:comment:{c['id']}"
    if who == "critic" and v:
        return [ev(eid, c["created_at"], "critic", author, f"critic_{v.lower()}",
                   f"critic {v} · {tag}", c["html_url"], repo, n)]
    out = []
    if v:
        # A seat comment that states a Light verdict (e.g. forge: "Superseded ... after Light FAIL").
        # The verdict is real but reported second-hand; the time is when it was reported.
        r = ev(f"{eid}:light", c["created_at"], "critic", author, f"critic_{v.lower()}",
               f"Light {v} (via {who}) · {tag}", c["html_url"], repo, n,
               note=f"reported in {who} comment; Light time <= this time")
        r["reported_by"] = who
        out.append(r)
    if SUPERSEDE_RE.search(body):
        out.append(ev(eid, c["created_at"], who, "GitHub", "supersede",
                      f"{who} supersede note · {tag}", c["html_url"], repo, n))
    elif not v:
        out.append(ev(eid, c["created_at"], who, author if author != who else "GitHub", "comment",
                      f"{who} comment · {tag}", c["html_url"], repo, n))
    return out


def issue_events(gh: GitHub, repo: str, since: datetime) -> list[dict]:
    out = []
    for i in gh.pages(f"/repos/{repo}/issues", {"state": "all", "since": since.isoformat(),
                                                 "sort": "updated", "direction": "desc"}, limit=2):
        if "pull_request" in i:
            continue
        n, tag = i["number"], f"{short(repo)} issue #{i['number']}"
        who = seat_of(i["user"]["login"])
        created = datetime.fromisoformat(i["created_at"].replace("Z", "+00:00"))
        if created >= since:
            out.append(ev(f"{repo}!{n}:open", i["created_at"], who, "GitHub", "issue_open",
                          f"{tag} opened · {i['title']}", i["html_url"], repo, n))
        if i.get("closed_at") and datetime.fromisoformat(i["closed_at"].replace("Z", "+00:00")) >= since:
            out.append(ev(f"{repo}!{n}:closed", i["closed_at"], who, "GitHub", "issue_close",
                          f"{tag} closed", i["html_url"], repo, n))
        if i.get("comments"):
            for c in gh.pages(f"/repos/{repo}/issues/{n}/comments", {"since": since.isoformat()}, limit=1):
                for e in comment_events(repo, n, tag, who, c):
                    e["id"] = e["id"].replace("#", "!", 1)
                    out.append(e)
    return out


def light_note_events(path: Path, since: datetime) -> list[dict]:
    """In-room critic Lights that never touch GitHub, recorded one JSON object per line:
    {"t": ISO time, "repo": "0xRayAI/xray", "number": 214, "verdict": "PASS"|"FAIL",
     "to": "mill", "note": "..."}"""
    out = []
    if not path.exists():
        return out
    for k, line in enumerate(path.read_text().splitlines()):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        rec = json.loads(line)
        t = datetime.fromisoformat(rec["t"].replace("Z", "+00:00"))
        if t < since:
            continue
        v = rec["verdict"].upper()
        repo, n = rec["repo"], int(rec["number"])
        e = ev(f"{repo}#{n}:light:{t.isoformat()}", t.astimezone(CT).isoformat(), "critic",
               rec.get("to", "mill"), f"critic_{v.lower()}", f"critic {v} · {short(repo)} #{n}",
               f"https://github.com/{repo}/pull/{n}", repo, n, note=rec.get("note") or "in-room Light")
        e["src_file"] = path.name
        out.append(e)
    return out


def x_events(path: Path, since: datetime) -> list[dict]:
    """Optional X wake/chatter: copy x_* events from an existing feed (no X API here)."""
    if not path.exists():
        return []
    out = []
    for e in json.loads(path.read_text()).get("events", []):
        if not str(e.get("kind", "")).startswith("x_"):
            continue
        if datetime.fromisoformat(e["t_ct"]) < since:
            continue
        e = dict(e)
        e.setdefault("id", f"x:{e.get('source', e['t_ct'])}")
        out.append(e)
    return out


PR_CACHE: dict = {}  # (repo, number) -> (signature, fetched_at, events); watch mode only


def build(args, gh: GitHub) -> dict:
    since = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    if args.since:
        since = datetime.fromisoformat(args.since.replace("Z", "+00:00"))
        if since.tzinfo is None:
            since = since.replace(tzinfo=CT)
    events: list[dict] = []
    for repo in args.repos:
        for pr in gh.pages(f"/repos/{repo}/pulls", {"state": "all", "sort": "updated",
                                                    "direction": "desc"}, limit=3):
            if datetime.fromisoformat(pr["updated_at"].replace("Z", "+00:00")) < since:
                break
            key = (repo, pr["number"])
            sig = (pr["updated_at"], pr["head"]["sha"], since.isoformat()[:13])
            hit = PR_CACHE.get(key)
            # Closed PRs are stable; open PRs are re-read at least every 10 min for CI/check runs.
            if hit and hit[0] == sig and (pr["state"] == "closed" or time.time() - hit[1] < 600):
                events.extend(hit[2])
                continue
            got = pr_events(gh, repo, pr, since)
            PR_CACHE[key] = (sig, time.time(), got)
            events.extend(got)
        if not args.no_issues:
            events.extend(issue_events(gh, repo, since))
    events.extend(light_note_events(Path(args.light_notes), since))
    if args.merge_x:
        events.extend(x_events(Path(args.merge_x), since))
    seen, uniq = set(), []
    for e in sorted(events, key=lambda e: (e["t_ct"], e["id"])):
        if e["id"] not in seen:
            seen.add(e["id"])
            uniq.append(e)
    kinds = sorted({e["kind"] for e in uniq})
    return {
        "title": "muse / 0xRay ping-pong live events",
        # Local inputs are recorded by file name only (no box paths in a committed feed).
        "sources": [f"https://github.com/{r}" for r in args.repos]
                   + [Path(args.light_notes).name] + ([Path(args.merge_x).name] if args.merge_x else []),
        "repo": args.repos[0],
        "repos": args.repos,
        "seats": SEATS,
        "services": SERVICES,
        "notes": [
            "Generated by house/live-mesh/fetch_feed.py from the GitHub REST API; no markdown paste.",
            f"Window: events at or after {since.astimezone(CT).isoformat()}.",
            "critic_* events come from: critic App reviews/check runs, critic comments with Light PASS/FAIL, "
            "light-notes.jsonl (in-room Lights), or a seat comment that states a Light verdict "
            "(reported_by set; time = when reported).",
            "PR author seat: mill/* branch -> mill even when the PR rides the forge0x1 App.",
            "X events (x_*) only appear when --merge-x points at a feed that already has them.",
        ],
        "generated_at": datetime.now(CT).isoformat(),
        "kinds": kinds,
        "event_count": len(uniq),
        "events": uniq,
    }


def write(feed: dict, out: Path) -> int:
    out.parent.mkdir(parents=True, exist_ok=True)
    stream = out.with_suffix(".jsonl")
    old_ids: set[str] = set()
    if stream.exists():
        for line in stream.read_text().splitlines():
            if line.strip():
                old_ids.add(json.loads(line).get("id", ""))
    new = [e for e in feed["events"] if e["id"] not in old_ids]
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(feed, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, out)
    if new:
        with stream.open("a") as f:
            for e in new:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
    return len(new)


def main() -> int:
    here = Path(__file__).resolve().parent
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default=str(here / "feed" / "live-events.json"))
    p.add_argument("--repos", nargs="+", default=DEFAULT_REPOS)
    p.add_argument("--hours", type=float, default=48.0, help="lookback window (default 48h)")
    p.add_argument("--since", help="ISO start time; overrides --hours (naive = CT)")
    p.add_argument("--light-notes", default=str(here / "feed" / "light-notes.jsonl"))
    p.add_argument("--merge-x", help="feed JSON to copy x_* wake/chatter events from (optional)")
    p.add_argument("--no-issues", action="store_true")
    p.add_argument("--watch", type=float, default=0, help="poll every N seconds (0 = one pass)")
    args = p.parse_args()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        log("no GITHUB_TOKEN/GH_TOKEN: private repos will 404 and the rate limit is 60/h")
    gh = GitHub(token)
    out = Path(args.out)
    while True:
        try:
            gh.calls = 0
            feed = build(args, gh)
            n_new = write(feed, out)
            log(f"{feed['event_count']} events ({n_new} new) -> {out} [{gh.calls} API calls]")
        except urllib.error.HTTPError as e:
            log(f"GitHub HTTP {e.code} on {e.url}; keeping last feed")
            if not args.watch:
                return 1
        if not args.watch:
            return 0
        time.sleep(args.watch)


if __name__ == "__main__":
    sys.exit(main())
