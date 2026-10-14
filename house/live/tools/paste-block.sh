# ---- Live board (Builder, the seat's own machine) ------------------------------------------------------------------------------
# Paste once into zsh or bash. No secrets in this block. The builder-app installation token is minted in-process by
# the same mint_token.token() the ~/.config/live-github-app/bin/gh wrapper uses (the seat's own App id and installation,
# its cache), sent only in the Authorization header, and never printed. (`gh auth token` is refused by
# the wrapper by design, so it is not used.)
#   live_act start|tick|end turn|subagent|watcher <tag>, received|sent prompt <seat>, launch|reply|finished cloud_agent <bc-id>
#                                                    -> POST /activity   (202 = recorded)
#   live_inbox                                       -> GET /inbox/builder?since=<cursor>, JSON lines on stdout;
#                                                          cursor kept in ~/.live/builder.cursor
export LIVE_URL="https://live.example.com"
_live() {
  /usr/bin/python3 - "$@" <<'PY'
import datetime, json, os, re, sys, urllib.error, urllib.request
app = os.path.expanduser("~/.config/live-github-app")
sys.path[:0] = [app, os.path.join(app, "bin")]
from mint_token import token                       # same minting path as the gh / git wrappers
url = os.environ.get("LIVE_URL", "https://live.example.com").rstrip("/")
def call(method, path, body=None):
    h = {"Authorization": "Bearer " + token()}
    if body is not None:
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except (urllib.error.URLError, OSError) as e:
        return 0, f"unreachable: {e}"
cmd = sys.argv[1]
if cmd == "act":
    action, kind, arg = (sys.argv[2:5] + ["", "", ""])[:3]
    ACTS = {"turn": ("start", "tick", "end"), "subagent": ("start", "tick", "end"), "watcher": ("start", "tick", "end"),
            "prompt": ("received", "sent"), "cloud_agent": ("launch", "reply", "finished", "cancel")}   # #281
    if action not in ACTS.get(kind, ()) or not re.fullmatch(r"[A-Za-z0-9 ._:@#+/-]{1,40}", arg) or \
            (kind == "cloud_agent" and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{2,40}", arg)):
        sys.exit("usage: live_act start|tick|end turn|subagent|watcher <tag> | received|sent prompt <from|to seat>"
                 " | launch|reply|finished|cancel cloud_agent <agent id>")
    extra = {"prompt": {"received": "from", "sent": "to"}.get(action), "cloud_agent": "agent"}.get(kind, "tag")
    t_ct = datetime.datetime.now().astimezone().isoformat(timespec="seconds")   # e.g. 2026-10-09T14:50:00-05:00
    line = json.dumps({"t_ct": t_ct, "kind": kind, "action": action, extra: arg, "seat": "Builder"})
    code, out = call("POST", "/activity", line.encode())
    print(code, out)
    sys.exit(0 if code == 202 else 1)
if cmd == "inbox":
    cdir = os.path.expanduser("~/.live"); os.makedirs(cdir, exist_ok=True)
    cfile = os.path.join(cdir, "builder.cursor")
    since = open(cfile).read().strip() if os.path.exists(cfile) else ""
    q = "?since=" + urllib.request.quote(since) if since else ""
    code, out = call("GET", "/inbox/builder" + q)
    if code != 200:
        sys.exit(f"live_inbox: HTTP {code} {out}")
    lines = json.loads(out).get("lines") or []
    for l in lines:
        print(json.dumps(l, ensure_ascii=False))
    if lines:
        open(cfile + ".tmp", "w").write(lines[-1]["id"] + "\n"); os.replace(cfile + ".tmp", cfile)
PY
}
live_act()   { _live act "$@"; }
live_inbox() { _live inbox; }
# check:  live_act start turn live-check && live_act end turn live-check && live_inbox | tail -3
# ----------------------------------------------------------------------------------------------------------------
