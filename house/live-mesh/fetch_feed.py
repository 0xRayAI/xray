#!/usr/bin/env python3
"""Live mesh feed: poll GitHub for the ping-pong volley and write live-events.json.

Ping-pong = the PR/issue volley between seats (open, review, fix, re-Light, merge).
Also: muse-house Deployments (deploy/deploy_fail), a mymuse.house /health probe that emits on
state change (health_ok/health_fail), and X both ways from herald's JSONL ledger (--x-ledger) or,
as an interim hand log, an existing feed file (--merge-x). No X API calls; nothing is posted.

Output keeps the capture shape the mesh renderer already reads:
  {title, sources, repo, repos, seats, services, notes, generated_at, event_count,
   events: [{id, t_ct, from, to, kind, direction, label, source, src_file,
             repo?, number?, post_id?, handle?, in_reply_to?, note?, reported_by?}]}

Stdlib only (urllib; openssl CLI signs the App JWT). Auth, one of:
  - GitHub App (preferred for --watch): GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID and
    GITHUB_APP_PRIVATE_KEY_PATH. The poller mints its own installation token, re-mints before
    it is 55 min old and on a 401, and ignores GITHUB_TOKEN/GH_TOKEN. No other fallback.
  - GITHUB_TOKEN or GH_TOKEN (any token that can read the repos; not refreshed).

  python3 fetch_feed.py --out feed/live-events.json              # one pass
  python3 fetch_feed.py --out feed/live-events.json --watch 120  # poll every 120s

Every pass rewrites live-events.json atomically (tmp + rename) and appends only the
events it had not seen before to live-events.jsonl (one JSON object per line), so a
watcher can either re-read the JSON or `tail -f` the JSONL stream.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
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


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class MintError(RuntimeError):
    pass


class AppToken:
    """GitHub App installation token: App JWT (RS256, signed by the openssl CLI) ->
    POST /app/installations/{id}/access_tokens. Installation tokens live 1h; re-mint at 55 min,
    or 5 min before expires_at if sooner. The token is never logged."""
    REMINT_AFTER = 55 * 60
    ENV = ("GITHUB_APP_ID", "GITHUB_APP_INSTALLATION_ID", "GITHUB_APP_PRIVATE_KEY_PATH")

    def __init__(self, app_id: str, installation_id: str, key_path: str):
        self.app_id, self.installation_id, self.key_path = app_id, installation_id, key_path
        self.token: str | None = None
        self.minted_at = 0.0
        self.expires_at = 0.0

    @classmethod
    def from_env(cls) -> "AppToken | None":
        vals = [os.environ.get(k, "").strip() for k in cls.ENV]
        if not any(vals):
            return None
        if not all(vals):
            missing = [k for k, v in zip(cls.ENV, vals) if not v]
            raise SystemExit(f"App auth needs {', '.join(cls.ENV)}; missing {', '.join(missing)}")
        return cls(*vals)

    def stale(self, now: float | None = None) -> bool:
        now = time.time() if now is None else now
        return (not self.token or now - self.minted_at >= self.REMINT_AFTER
                or bool(self.expires_at and self.expires_at - now < 300))

    def jwt(self) -> str:
        now = int(time.time())
        head = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
        body = b64url(json.dumps({"iat": now - 60, "exp": now + 540, "iss": self.app_id}).encode())
        signing = f"{head}.{body}".encode()
        try:
            sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", self.key_path], input=signing,
                                 capture_output=True, check=True, timeout=30).stdout
        except (OSError, subprocess.SubprocessError) as e:
            raise MintError(f"JWT sign failed ({type(e).__name__})") from None
        return f"{head}.{body}.{b64url(sig)}"

    def mint(self) -> str:
        req = urllib.request.Request(
            f"{API}/app/installations/{self.installation_id}/access_tokens", data=b"", method="POST",
            headers={"Authorization": f"Bearer {self.jwt()}", "Accept": "application/vnd.github+json",
                     "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "xray-live-mesh-feed"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                resp = json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            raise MintError(f"access_tokens HTTP {e.code}") from None
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            raise MintError(f"access_tokens {type(e).__name__}") from None
        if not resp.get("token"):
            raise MintError("access_tokens response had no token")
        self.token, self.minted_at = resp["token"], time.time()
        exp = resp.get("expires_at")
        self.expires_at = datetime.fromisoformat(exp.replace("Z", "+00:00")).timestamp() if exp else 0.0
        log(f"minted App installation token (expires {datetime.fromtimestamp(self.expires_at, CT):%H:%M} CT)"
            if exp else "minted App installation token")
        return self.token


class GitHub:
    def __init__(self, token: str | None, app: AppToken | None = None):
        self.token = token
        self.app = app
        self.calls = 0

    def get(self, path: str, params: dict | None = None):
        url = path if path.startswith("http") else API + path
        if params:
            # urlencode so "+00:00" in since= becomes %2B00:00 (a raw "+" decodes to a space).
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
        if self.app and self.app.stale():
            self.token = self.app.mint()
        try:
            return self._get(url)
        except urllib.error.HTTPError as e:
            # A 401 on a token older than a minute: re-mint once and retry this request.
            if e.code != 401 or not self.app or time.time() - self.app.minted_at < 60:
                raise
            log("GitHub HTTP 401; re-minting App token")
            self.token = self.app.mint()
            return self._get(url)

    def _get(self, url: str):
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
         "kind": kind, "direction": "internal", "label": clean(label)[:54], "source": source,
         "src_file": "github-api", "repo": repo}
    if number is not None:
        e["number"] = number
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
        e["src_file"] = "light-notes.jsonl"
        out.append(e)
    return out


# ---------------------------------------------------------------- kinds, direction, order

ENG_KINDS = ["pr_open", "pr_update", "supersede", "critic_fail", "critic_pass", "ci_pass", "ci_fail",
             "review", "comment", "merged", "pr_close", "issue_open", "issue_close"]
SITE_KINDS = ["deploy", "deploy_fail", "health_ok", "health_fail"]
X_IN = ["x_in_mention", "x_in_reply"]
X_OUT = ["x_out_reply", "x_out_root", "x_like"]
KINDS = ENG_KINDS + SITE_KINDS + X_IN + X_OUT
LEGACY = {"fix": "pr_update", "probe": "health_ok", "x_root": "x_out_root"}
# Ties at the same instant: cause before effect.
_RANK_ORDER = [["pr_open"], ["pr_update"], ["ci_pass", "ci_fail"], ["critic_pass", "critic_fail"],
               ["supersede"], ["review", "comment"], ["merged"], ["pr_close"], ["issue_open"], ["issue_close"],
               ["deploy", "deploy_fail"], ["health_ok", "health_fail"], X_IN, ["x_out_reply", "x_out_root"],
               ["x_like"]]
KIND_RANK = {k: i for i, ks in enumerate(_RANK_ORDER) for k in ks}
# Dedupe precedence when two sources give the same id (lower wins).
SRC_RANK = {"github-api": 0, "github-deployments": 0, "x-api": 0, "health-probe": 0,
            "x-ledger.jsonl": 1, "light-notes.jsonl": 2}
MERGE_X_RANK = 3
HERALD_HANDLES = {"0xRayAI", "herald"}


def normalize_kind(kind: str, frm: str = "") -> str:
    """Legacy kinds are accepted on read and written in canonical form."""
    if kind == "x_reply":
        return "x_out_reply" if frm in HERALD_HANDLES else "x_in_reply"
    return LEGACY.get(kind, kind)


def direction_of(kind: str) -> str:
    if kind in X_IN:
        return "in"
    if kind in X_OUT:
        return "out"
    return "internal"


def instant(t_ct: str) -> datetime:
    return datetime.fromisoformat(t_ct.replace("Z", "+00:00")).astimezone(timezone.utc)


def order_key(e: dict):
    return (instant(e["t_ct"]), KIND_RANK.get(e["kind"], 99), e["id"])


def src_rank(e: dict) -> int:
    return SRC_RANK.get(e.get("src_file", ""), MERGE_X_RANK)


# ---------------------------------------------------------------- site: deployments + /health

DEPLOY_CACHE: dict = {}  # deployment id -> event (terminal states only)


def deploy_events(gh: GitHub, repo: str, since: datetime) -> list[dict]:
    """GitHub Deployments (Railway posts them) -> deploy / deploy_fail on a terminal status."""
    out = []
    for d in gh.pages(f"/repos/{repo}/deployments", limit=2):
        if datetime.fromisoformat(d["created_at"].replace("Z", "+00:00")) < since:
            break  # newest first
        if d["id"] in DEPLOY_CACHE:
            out.append(DEPLOY_CACHE[d["id"]])
            continue
        statuses = gh.get(f"/repos/{repo}/deployments/{d['id']}/statuses", {"per_page": 30})
        final = next((s for s in statuses if s["state"] in ("success", "failure", "error")), None)
        if not final:
            continue  # queued / in_progress: picked up on a later pass
        ok = final["state"] == "success"
        sha7 = d["sha"][:7]
        e = ev(f"{repo}:deploy:{d['id']}", final["created_at"], "GitHub", "mymuse.house",
               "deploy" if ok else "deploy_fail",
               f"deploy · {short(repo)} {sha7}" if ok else f"deploy FAIL · {short(repo)} {sha7}",
               final.get("target_url") or final.get("environment_url") or d["url"], repo, None,
               note=f"env {d.get('environment')}; sha {d['sha'][:8]}")
        e["src_file"] = "github-deployments"
        DEPLOY_CACHE[d["id"]] = e
        out.append(e)
    return out


def probe(url: str) -> tuple[bool, str]:
    req = urllib.request.Request(url, headers={"User-Agent": "xray-live-mesh-feed"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read(4096).decode(errors="replace")
            try:
                status = json.loads(body).get("status", "ok")
            except (ValueError, AttributeError):
                status = "ok"
            return (status == "ok", "200" if status == "ok" else f"status {status}"[:20])
    except urllib.error.HTTPError as e:
        return False, str(e.code)
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return False, "unreachable"


def health_events(args, state_path: Path, deploys: list[dict], since: datetime) -> list[dict]:
    """Probe /health; emit only on a state change, or the first ok after a newer deploy.
    Emitted events live in health-state.json so later passes keep them in the window."""
    st = json.loads(state_path.read_text()) if state_path.exists() else {"events": []}
    now = time.time()
    due = now - st.get("last_probe_unix", 0) >= args.health_every or st.get("url") != args.health
    if due:
        ok, code = probe(args.health)
        state = "ok" if ok else "fail"
        last_t = st.get("last_emit_t")
        newest_deploy = max((instant(d["t_ct"]) for d in deploys if d["kind"] == "deploy"), default=None)
        after_deploy = ok and newest_deploy and (not last_t or newest_deploy > instant(last_t))
        if state != st.get("state") or st.get("url") != args.health or after_deploy:
            t = datetime.now(CT).replace(microsecond=0)
            e = {"id": f"health:{state}:{t.strftime('%Y-%m-%dT%H:%M')}", "t_ct": t.isoformat(),
                 "from": "mymuse.house", "to": "blinky", "kind": f"health_{state}",
                 "direction": "internal", "label": "/health ok" if ok else f"/health FAIL {code}",
                 "source": args.health, "src_file": "health-probe"}
            st["events"].append(e)
            st["last_emit_t"] = e["t_ct"]
        st.update(state=state, url=args.health, last_probe_unix=now,
                  last_probe_t=datetime.now(CT).replace(microsecond=0).isoformat())
        state_path.parent.mkdir(parents=True, exist_ok=True)
        tmp = state_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(st, indent=2) + "\n")
        os.replace(tmp, state_path)
    return [e for e in st["events"] if instant(e["t_ct"]) >= since]


# ---------------------------------------------------------------- X: ledger + merge-x

def x_label(kind: str, handle: str, tag: str | None) -> str:
    sfx = f" · {tag}" if tag else ""
    return {"x_in_mention": f"IN @{handle} · mention", "x_in_reply": f"IN @{handle} · reply in",
            "x_out_reply": f"HERALD reply on X{sfx}", "x_out_root": f"HERALD root{sfx}",
            "x_like": f"LIKE @{handle}{sfx}"}[kind]


def x_id(kind: str, post_id: str) -> str:
    return f"x:like:{post_id}" if kind == "x_like" else f"x:{post_id}:{kind}"


def handle_from_url(url: str) -> str | None:
    m = re.search(r"x\.com/([^/]+)/status/", url or "")
    return m.group(1) if m else None


def x_nodes(kind: str, handle: str) -> tuple[str, str]:
    if kind in X_IN:
        return (handle if handle not in HERALD_HANDLES else "X"), "herald"
    return "herald", "X"


def ledger_events(path: Path, since: datetime) -> list[dict]:
    """herald appends one line per X action: {"t","kind","post_id","handle","in_reply_to"?,"url","tag"?,"note"?}.
    Inbound handle = author; outbound = 0xRayAI; likes = author of the liked post."""
    out = []
    if not path.exists():
        return out
    for k, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            rec = json.loads(line)
            t = datetime.fromisoformat(rec["t"].replace("Z", "+00:00"))
            handle = str(rec["handle"]).lstrip("@")
            kind = normalize_kind(rec["kind"], handle)
            post_id = str(rec["post_id"])
        except (ValueError, KeyError) as err:
            log(f"{path.name}:{k} skipped ({err})")
            continue
        if kind not in X_IN + X_OUT:
            log(f"{path.name}:{k} skipped (kind {kind})")
            continue
        if t < since:
            continue
        frm, to = x_nodes(kind, handle)
        url = rec.get("url") or (f"https://x.com/0xRayAI/status/{post_id}" if kind in ("x_out_reply", "x_out_root")
                                 else f"https://x.com/{handle}/status/{post_id}")
        e = {"id": x_id(kind, post_id), "t_ct": t.astimezone(CT).isoformat(), "from": frm, "to": to,
             "kind": kind, "direction": direction_of(kind),
             "label": clean(x_label(kind, handle, rec.get("tag")))[:54], "source": url,
             "src_file": "x-ledger.jsonl", "post_id": post_id, "handle": handle}
        if rec.get("in_reply_to"):
            e["in_reply_to"] = str(rec["in_reply_to"])
        if rec.get("note"):
            e["note"] = rec["note"]
        out.append(e)
    return out


def x_events(path: Path, since: datetime) -> list[dict]:
    """Interim X input: copy x_* events from a hand-built feed (e.g. herald v2) and normalize
    legacy kinds. This is a hand log, not a live X read."""
    if not path.exists():
        return []
    out = []
    for e in json.loads(path.read_text()).get("events", []):
        if not str(e.get("kind", "")).startswith("x_"):
            continue
        if instant(e["t_ct"]) < since:
            continue
        e = dict(e)
        e["kind"] = normalize_kind(e["kind"], e.get("from", ""))
        post_id = e.get("post_id") or (re.search(r"/status/(\d+)", e.get("source", "")) or [None, None])[1]
        if post_id:
            e["post_id"] = str(post_id)
        handle = handle_from_url(e.get("source", ""))
        if e["kind"] in X_IN:
            e["from"] = e.get("from") if e.get("from") not in (None, "X") else (handle or "X")
            e["to"] = "herald"
        else:
            e["from"], e["to"] = "herald", "X"
        if handle:
            e.setdefault("handle", handle)
        e["direction"] = direction_of(e["kind"])
        e["label"] = clean(e.get("label", x_label(e["kind"], handle or "?", None)))[:54]
        e.setdefault("id", x_id(e["kind"], e["post_id"]) if post_id else f"x:{e['t_ct']}:{e['kind']}")
        e["src_file"] = path.name
        out.append(e)
    return out


PR_CACHE: dict = {}  # (repo, number) -> (signature, fetched_at, events); watch mode only


def merge(events: list[dict]) -> list[dict]:
    """Dedupe by id keeping the higher-precedence source; fill optional fields the winner lacks."""
    best: dict[str, dict] = {}
    for e in events:
        e["kind"] = normalize_kind(e["kind"], e.get("from", ""))
        e.setdefault("direction", direction_of(e["kind"]))
        cur = best.get(e["id"])
        if cur is None:
            best[e["id"]] = e
            continue
        win, lose = (e, cur) if src_rank(e) < src_rank(cur) else (cur, e)
        for k, v in lose.items():
            win.setdefault(k, v)
        best[e["id"]] = win
    return sorted(best.values(), key=order_key)


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
    deploys: list[dict] = []
    if args.deploy_repo:
        deploys = deploy_events(gh, args.deploy_repo, since)
        events.extend(deploys)
    if args.health:
        events.extend(health_events(args, Path(args.health_state), deploys, since))
    # allow --deploy-repo '' / --health '' to disable
    events.extend(light_note_events(Path(args.light_notes), since))
    x_ledger = ledger_events(Path(args.x_ledger), since)
    events.extend(x_ledger)
    x_merged = x_events(Path(args.merge_x), since) if args.merge_x else []
    events.extend(x_merged)
    uniq = merge(events)
    kinds = sorted({e["kind"] for e in uniq})
    x_note = ("X events: none in window." if not (x_ledger or x_merged) else
              "X events: " + ", ".join(filter(None, [
                  f"{len(x_ledger)} from x-ledger.jsonl (herald's machine ledger)" if x_ledger else "",
                  f"{len(x_merged)} from {Path(args.merge_x).name} via --merge-x (hand log, not a live X read)"
                  if x_merged else ""])) + ".")
    return {
        "title": "muse / 0xRay ping-pong live events",
        # Local inputs are recorded by file name only (no box paths in a committed feed).
        "sources": [f"https://github.com/{r}" for r in args.repos]
                   + ([f"https://github.com/{args.deploy_repo}/deployments"] if args.deploy_repo else [])
                   + ([args.health] if args.health else [])
                   + [Path(args.light_notes).name, Path(args.x_ledger).name]
                   + ([Path(args.merge_x).name] if args.merge_x else []),
        "repo": args.repos[0],
        "repos": args.repos,
        "seats": SEATS,
        "services": SERVICES,
        "notes": [
            "Generated by house/live-mesh/fetch_feed.py: GitHub REST (PRs, issues, deployments), "
            "a /health probe, and JSONL ledgers. No markdown is read.",
            f"Window: events at or after {since.astimezone(CT).isoformat()}.",
            "critic_* events come from: critic App reviews/check runs, critic comments with Light PASS/FAIL, "
            "light-notes.jsonl (in-room Lights), or a seat comment that states a Light verdict "
            "(reported_by set; time = when reported).",
            "PR author seat: mill/* branch -> mill even when the PR rides the forge0x1 App.",
            "/health events are emitted on a state change (or first ok after a deploy) at probe time.",
            x_note,
            "Order: (UTC instant, kind rank, id). Same id from two sources: "
            "API > x-ledger > light-notes > --merge-x.",
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
    p.add_argument("--light-notes", help="in-room critic Lights JSONL (default: <out dir>/light-notes.jsonl)")
    p.add_argument("--x-ledger", help="herald X ledger JSONL (default: <out dir>/x-ledger.jsonl)")
    p.add_argument("--merge-x", help="interim: copy + normalize x_* events from a hand-built feed JSON")
    p.add_argument("--deploy-repo", default="0xRayAI/muse-house", help="repo whose Deployments map to deploy*; '' = off")
    p.add_argument("--health", default="https://mymuse.house/health", help="/health URL to probe; '' = off")
    p.add_argument("--health-every", type=float, default=60, help="min seconds between probes")
    p.add_argument("--health-state", help="probe state file (default: <out dir>/health-state.json)")
    p.add_argument("--no-issues", action="store_true")
    p.add_argument("--watch", type=float, default=0, help="poll every N seconds (0 = one pass)")
    args = p.parse_args()
    out_dir = Path(args.out).parent
    args.light_notes = args.light_notes or str(out_dir / "light-notes.jsonl")
    args.x_ledger = args.x_ledger or str(out_dir / "x-ledger.jsonl")
    args.health_state = args.health_state or str(out_dir / "health-state.json")
    args.deploy_repo = args.deploy_repo or None
    args.health = args.health or None
    if os.environ.get("X_BEARER_TOKEN"):
        log("X_BEARER_TOKEN is set but the X API adapter is not built; X still comes from the ledger / --merge-x")
    app = AppToken.from_env()
    token = None if app else (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN"))
    if app:
        log(f"App auth (installation {app.installation_id}): self-minting tokens; GITHUB_TOKEN/GH_TOKEN ignored")
    elif not token:
        log("no GITHUB_TOKEN/GH_TOKEN: private repos will 404 and the rate limit is 60/h")
    elif args.watch:
        log("static GITHUB_TOKEN/GH_TOKEN: not refreshed; set GITHUB_APP_* to self-mint")
    gh = GitHub(token, app)
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
        except MintError as e:
            log(f"App token mint failed: {e}; no fallback token, keeping last feed, retry next poll")
            if not args.watch:
                return 1
        except (urllib.error.URLError, TimeoutError) as e:
            log(f"GitHub unreachable ({type(e).__name__}); keeping last feed")
            if not args.watch:
                return 1
        if not args.watch:
            return 0
        time.sleep(args.watch)


if __name__ == "__main__":
    sys.exit(main())
