"""Host-only install (LIVE_MODE=github): build() emits a fleet-only board, incl. a stale inbox cache (critic probe, #258)."""
import json, os, subprocess, sys, unittest
FEED = os.environ.get("MESH_FEED_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "feed"))
CODE = r'''
import sys, os, json, tempfile, types; from pathlib import Path
root = Path(tempfile.mkdtemp()); (root/"feed").mkdir(); (root/"fleet"/"inbox").mkdir(parents=True)
os.environ.update(LIVE_MODE="github", GH_TOKEN="x", MESH_RUN=str(root), INBOX_CACHE=str(root/"feed"/"inbox-events.json"),
                  LIVE_INBOX=str(root/"fleet"/"inbox"), LIVE_MERGE_QUEUE=str(root/"mq.md"), LIVE_NODE_MAP='{"forge0x1[bot]":"forge"}')
stale = {"id": "acme-org/app#5:open", "t_ct": "2026-10-12T15:00:00-05:00", "from": "Others", "to": "GitHub", "kind": "pr_open",
         "label": "x", "repo": "acme-org/app", "number": 5, "actor": "stranger", "title": "SECRET stale cached", "pr_state": "open"}
(root/"feed"/"inbox-events.json").write_text(json.dumps({"events": {stale["id"]: stale}}))
sys.path.insert(0, %r)
import live_mesh as lm, live_collect as uc
lm.token_check = lambda: None
uc.open_numbers = lambda c, repos, max_pages=20: {}
lm.upstream.enabled = lambda: False
class Col:
    st = {"gaps": {}}
    def __init__(self):
        mk = lambda n, frm, title: {"id": f"acme-org/app#{n}:open", "t_ct": "2026-10-12T16:00:00-05:00", "from": frm, "to": "GitHub",
            "kind": "pr_open", "label": "l", "source": f"https://github.com/acme-org/app/pull/{n}", "src_file": "github-api",
            "repo": "acme-org/app", "number": n, "title": title, "pr_state": "open", "direction": "internal"}
        self.ev = {"a": mk(7, "forge", "fleet PR seven"), "b": mk(8, "Others", "SECRET unmapped live")}
    def run(self, c, deadline): return True
lm.COLLECTORS["acme-org/app"] = Col()
args = types.SimpleNamespace(out=str(root/"feed"/"live-events.json"), repos=["acme-org/app"], health=None,
                             health_state=str(root/"hs.json"), deploy_repo="")
feed = lm.build(args, None)
b = feed.get("board")
print(json.dumps({"has_board": bool(b), "titles": [c.get("title") for c in (b or {}).get("cards", [])], "blob": json.dumps(b or {})[:20000]}))
''' % FEED
def run(**extra):
    env = dict(os.environ, **extra)
    p = subprocess.run([sys.executable, "-c", CODE], env=env, capture_output=True, text=True, cwd=FEED)
    if p.returncode: raise RuntimeError(p.stderr[-1500:])
    return json.loads(p.stdout.strip().splitlines()[-1])
class HostBoard(unittest.TestCase):
    def test_host_mode_board_fleet_only(self):
        r = run(); print("\ndefault:", r["has_board"], r["titles"])
        self.assertTrue(r["has_board"]); self.assertIn("fleet PR seven", r["titles"])
        self.assertNotIn("SECRET", r["blob"])
    def test_host_mode_opt_in(self):
        r = run(LIVE_SHOW_UNMAPPED="1"); print("\nopt-in:", r["titles"])
        self.assertIn("SECRET unmapped live", r["blob"])


DEDUPE = r'''
import sys, os, json, tempfile; from pathlib import Path
root = Path(tempfile.mkdtemp()); (root/"feed").mkdir()
os.environ.update(LIVE_MODE="github", GH_TOKEN="x", MESH_RUN=str(root))
sys.path.insert(0, %r)
import live_mesh as lm
out = root/"feed"/"github-events.json"
ev = [{"id": f"e{i}", "t_ct": "2026-10-13T09:00:00-05:00", "kind": "pr_open"} for i in range(5)]
n1 = lm._write({"events": ev}, out); n2 = lm._write({"events": ev}, out)
ev[0] = dict(ev[0], label="changed"); n3 = lm._write({"events": ev}, out)
print(json.dumps([n1, n2, n3, (root/"feed"/"live-events.jsonl").exists()]))
'''


class GithubModeDedupe(unittest.TestCase):
    def test_second_pass_counts_only_new_or_changed(self):
        """burst-live logged 26440 (26440 new) every pass: github mode never persisted the seen hashes."""
        r = subprocess.run([sys.executable, "-B", "-c", DEDUPE % FEED], capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(json.loads(r.stdout.strip().splitlines()[-1]), [5, 0, 1, False])


STEP = r'''
import io, json, sys
from unittest import mock
sys.path.insert(0, %r)
import live_board, live_mesh
out = io.StringIO()
with mock.patch.object(live_board, "model", side_effect=RuntimeError("boom")), mock.patch("sys.stdout", out):
    missed = live_board.run([])
logged = []
with mock.patch.object(live_mesh.live_board, "run", return_value=None), mock.patch.object(live_mesh.ff, "log", side_effect=logged.append):
    empty = live_mesh.board_wave([], False)
raised = []
with mock.patch.object(live_mesh.live_board, "run", side_effect=RuntimeError("boom")), mock.patch.object(live_mesh.ff, "log", side_effect=raised.append):
    blown = live_mesh.board_wave([], False)
print(json.dumps({
    "missed": missed is None,
    "run_log": "cards: step failed" in out.getvalue() and "RuntimeError" in out.getvalue(),
    "feed_log": empty is None and bool(logged) and "cards: step failed" in logged[0],
    "raise_log": blown is None and bool(raised) and "RuntimeError" in raised[0],
}))
''' % FEED


class CardStepLog(unittest.TestCase):
    def test_card_step_failure_is_logged(self):
        r = subprocess.run([sys.executable, "-B", "-c", STEP], capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr[-1500:])
        got = json.loads(r.stdout.strip().splitlines()[-1])
        self.assertTrue(got["missed"])
        self.assertTrue(got["run_log"])
        self.assertTrue(got["feed_log"])
        self.assertTrue(got["raise_log"])


if __name__ == "__main__":
    unittest.main()
